import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { RegistryClient, serializeRegistrationPayload } from "./client.js";
import { loadMapConfig, writeMapConfigSiteId } from "./config.js";
import { readLocalState, writeLocalState } from "./local-state.js";
import type { LocalState } from "./schemas.js";
import { detectEngawaPackageVersions, findProjectRoot } from "./packages.js";
import { buildRegistrationPayload } from "./payload.js";
import { sanitizeTerminalText } from "./sanitize.js";
import type { PendingRegistration } from "./schemas.js";
import { generateIdempotencyKey, generateSiteToken, hashSiteToken } from "./token.js";

export interface RegisterOptions {
  cwd?: string;
  dryRun?: boolean;
  yes?: boolean;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  isInteractive?: boolean;
  prompt?: (question: string) => Promise<string>;
  log?: (message: string) => void;
}

function defaultLog(message: string): void {
  process.stdout.write(`${message}\n`);
}

function formatPackages(payload: ReturnType<typeof buildRegistrationPayload>): string {
  return Object.entries(payload.packages)
    .map(([name, version]) => `  ${name} ${version}`)
    .join("\n");
}

function formatHints(payload: ReturnType<typeof buildRegistrationPayload>): string {
  if (!payload.hints) {
    return "  (none)";
  }
  const lines: string[] = [];
  if (payload.hints.framework !== undefined) {
    lines.push(`  framework: ${payload.hints.framework}`);
  }
  if (payload.hints.byaEnabled !== undefined) {
    lines.push(`  BYA:       ${String(payload.hints.byaEnabled)}`);
  }
  if (payload.hints.localeCount !== undefined) {
    lines.push(`  locales:   ${payload.hints.localeCount}`);
  }
  return lines.length > 0 ? lines.join("\n") : "  (none)";
}

async function confirmRegistration(
  payload: ReturnType<typeof buildRegistrationPayload>,
  options: RegisterOptions,
): Promise<boolean> {
  if (options.yes) {
    return true;
  }

  const interactive = options.isInteractive ?? process.stdin.isTTY === true;
  if (!interactive) {
    throw new Error(
      "Registration requires confirmation; re-run with --yes in non-interactive environments",
    );
  }

  const log = options.log ?? defaultLog;
  log("Engawa Distribution Map — optional opt-in");
  log("");
  log("You are about to register this public site:");
  log("");
  log(`Name:     ${sanitizeTerminalText(payload.displayName)}`);
  log(`URL:      ${payload.canonicalUrl}`);
  log("Packages:");
  log(formatPackages(payload));
  log("");
  log("Optional hints:");
  log(formatHints(payload));
  log("");
  log("This sends only the payload shown above.");
  log("No visitor tracking. No runtime telemetry.");
  log("");
  log("Initial listing state: PENDING.");
  log("");
  log("Proceed? [y/N]");

  const prompt =
    options.prompt ??
    (async (question: string) => {
      const rl = createInterface({ input, output });
      try {
        return await rl.question(question);
      } finally {
        rl.close();
      }
    });

  const answer = (await prompt("> ")).trim().toLowerCase();
  return answer === "y" || answer === "yes";
}

function resolvePendingState(
  existing: LocalState | undefined,
  canonicalUrl: string,
): PendingRegistration | undefined {
  if (existing?.registration.state === "pending-request") {
    if (existing.registration.canonicalUrl === canonicalUrl) {
      return existing.registration;
    }
  }
  return undefined;
}

export async function runRegister(options: RegisterOptions = {}): Promise<number> {
  const log = options.log ?? defaultLog;
  const cwd = options.cwd ?? process.cwd();
  const projectRoot = await findProjectRoot(cwd);
  const config = await loadMapConfig(projectRoot);
  const packages = await detectEngawaPackageVersions(projectRoot);
  const payload = buildRegistrationPayload(config, packages);

  log(serializeRegistrationPayload(payload));

  if (options.dryRun) {
    return 0;
  }

  const confirmed = await confirmRegistration(payload, options).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    log(message);
    return false;
  });
  if (!confirmed) {
    if (!options.yes && (options.isInteractive ?? process.stdin.isTTY !== true)) {
      return 1;
    }
    log("Registration cancelled.");
    return 1;
  }

  const existingState = await readLocalState(projectRoot);
  const pending = resolvePendingState(existingState, payload.canonicalUrl);
  const siteToken = pending?.siteToken ?? generateSiteToken();
  const idempotencyKey = pending?.idempotencyKey ?? generateIdempotencyKey();

  await writeLocalState(projectRoot, {
    registration: {
      state: "pending-request",
      canonicalUrl: payload.canonicalUrl,
      idempotencyKey,
      siteToken,
    },
  });

  const client = new RegistryClient({
    endpoint: options.endpoint,
    fetchImpl: options.fetchImpl,
  });

  try {
    const response = await client.register({
      payload,
      idempotencyKey,
      siteTokenHash: hashSiteToken(siteToken),
    });

    await writeLocalState(projectRoot, {
      registration: {
        state: "registered",
        siteId: response.siteId,
        canonicalUrl: payload.canonicalUrl,
        siteToken,
      },
    });

    await writeMapConfigSiteId(projectRoot, response.siteId);

    log(`Registration submitted. siteId=${response.siteId} state=${response.state}`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Registration failed: ${sanitizeTerminalText(message)}`);
    return 1;
  }
}

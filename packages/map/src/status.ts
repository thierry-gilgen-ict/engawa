import { RegistryClient } from "./client.js";
import { loadMapConfig } from "./config.js";
import { readLocalState, resolveSiteId, resolveSiteToken } from "./local-state.js";
import { findProjectRoot } from "./packages.js";
import { sanitizeTerminalText } from "./sanitize.js";

export interface StatusOptions {
  cwd?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  envToken?: string;
  log?: (message: string) => void;
}

function defaultLog(message: string): void {
  process.stdout.write(`${message}\n`);
}

export async function runStatus(options: StatusOptions = {}): Promise<number> {
  const log = options.log ?? defaultLog;
  const cwd = options.cwd ?? process.cwd();
  const projectRoot = await findProjectRoot(cwd);
  const config = await loadMapConfig(projectRoot);
  const localState = await readLocalState(projectRoot);
  const siteId = resolveSiteId(config.siteId, localState);
  const token = resolveSiteToken(options.envToken ?? process.env.ENGAWA_MAP_TOKEN, localState);

  if (!siteId) {
    log("No siteId found. Complete registration first.");
    return 1;
  }

  if (!token) {
    log("No site token found. Set ENGAWA_MAP_TOKEN or create .engawa-map.local.json.");
    return 1;
  }

  const client = new RegistryClient({
    endpoint: options.endpoint,
    fetchImpl: options.fetchImpl,
  });

  try {
    const status = await client.getStatus(siteId, token);
    log(`siteId=${status.siteId}`);
    log(`state=${status.state}`);
    log(`displayName=${sanitizeTerminalText(status.displayName)}`);
    log(`canonicalUrl=${sanitizeTerminalText(status.canonicalUrl)}`);
    log(`createdAt=${status.createdAt}`);
    log(`updatedAt=${status.updatedAt}`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Status failed: ${sanitizeTerminalText(message)}`);
    return 1;
  }
}

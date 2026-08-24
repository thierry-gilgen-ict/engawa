#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { InspectError, isInspectError } from "./errors.js";
import { formatHumanReport } from "./inspect/format-human.js";
import { formatMarkdownReport } from "./inspect/format-markdown.js";
import { runInspect } from "./inspect/run-inspect.js";
import { DEFAULT_MAX_PAGES, DEFAULT_TIMEOUT_MS, HARD_MAX_PAGES } from "./inspect/types.js";
import { sanitizeTerminalText } from "./sanitize.js";

const PACKAGE_VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
).version as string;

function printRootUsage(): void {
  process.stdout.write(`Usage: engawa <command> [options]

Commands:
  inspect     Inspect a public website and produce an Agent Readiness Report

Planned (not yet implemented):
  init        Scaffold Engawa integration from an inspection report
  doctor      Verify agent surfaces and security on a live site

Options:
  --help, -h     Show help
  --version, -v  Show version
`);
}

function printInspectUsage(): void {
  process.stdout.write(`Usage: engawa inspect <url> [options]

Inspect a public website and produce an Engawa Agent Readiness Report.

Options:
  --json              Output machine-readable JSON to stdout
  --output <path>     Write report to .json or .md file
  --max-pages <n>     Maximum pages to fetch (default ${DEFAULT_MAX_PAGES}, max ${HARD_MAX_PAGES})
  --timeout-ms <n>    Per-request timeout in ms (default ${DEFAULT_TIMEOUT_MS})
  --allow-local       Allow localhost and private-network targets
  --help, -h          Show this help
`);
}

function parsePositiveInt(value: string, flag: string, max?: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new InspectError(`Invalid value for ${flag}: ${value}`);
  }
  if (max !== undefined && n > max) {
    throw new InspectError(`${flag} must be <= ${max}`);
  }
  return n;
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag) || args.some((a) => a.startsWith(`${flag}=`));
}

async function runInspectCommand(args: string[]): Promise<number> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printInspectUsage();
    return 0;
  }

  const positional = args.filter((a) => !a.startsWith("--"));
  const url = positional[0];
  if (!url) {
    throw new InspectError("URL is required");
  }

  const maxPagesRaw = getFlagValue(args, "--max-pages");
  const timeoutRaw = getFlagValue(args, "--timeout-ms");
  const maxPages = maxPagesRaw
    ? parsePositiveInt(maxPagesRaw, "--max-pages", HARD_MAX_PAGES)
    : DEFAULT_MAX_PAGES;
  const timeoutMs = timeoutRaw ? parsePositiveInt(timeoutRaw, "--timeout-ms") : DEFAULT_TIMEOUT_MS;
  const allowLocal = hasFlag(args, "--allow-local");
  const json = hasFlag(args, "--json");
  const outputPath = getFlagValue(args, "--output");

  const unknown = args.filter(
    (a) =>
      a.startsWith("--") &&
      !["--json", "--output", "--max-pages", "--timeout-ms", "--allow-local", "--help", "-h"].some(
        (f) => a === f || a.startsWith(`${f}=`),
      ),
  );
  if (unknown.length > 0) {
    throw new InspectError(`Unknown option: ${unknown[0]}`);
  }

  const report = await runInspect({
    inputUrl: url,
    maxPages,
    timeoutMs,
    allowLocal,
  });

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatHumanReport(report)}\n`);
  }

  if (outputPath) {
    const lower = outputPath.toLowerCase();
    const { writeFile } = await import("node:fs/promises");
    if (lower.endsWith(".json")) {
      await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    } else if (lower.endsWith(".md")) {
      await writeFile(outputPath, `${formatMarkdownReport(report)}\n`, "utf8");
    } else {
      throw new InspectError("--output must use .json or .md extension");
    }
  }

  return 0;
}

export async function runCli(argv: string[]): Promise<number> {
  const args = [...argv];
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printRootUsage();
    return args.length === 0 ? 1 : 0;
  }
  if (args[0] === "--version" || args[0] === "-v") {
    process.stdout.write(`${PACKAGE_VERSION}\n`);
    return 0;
  }

  const command = args.shift();
  try {
    switch (command) {
      case "inspect":
        return await runInspectCommand(args);
      default:
        process.stderr.write(`Unknown command: ${command}\n`);
        printRootUsage();
        return 1;
    }
  } catch (error) {
    if (isInspectError(error)) {
      process.stderr.write(`${sanitizeTerminalText(error.message)}\n`);
      return 1;
    }
    throw error;
  }
}

const entry = process.argv[1];
if (entry && fileURLToPath(import.meta.url) === entry) {
  const code = await runCli(process.argv.slice(2));
  process.exit(code);
}

#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DoctorError, InspectError, isCliError } from "./errors.js";
import { formatDoctorHumanReport } from "./doctor/format-human.js";
import { writeDoctorOutput } from "./doctor/output.js";
import { runDoctor } from "./doctor/run-doctor.js";
import {
  DEFAULT_MAX_PAGES as DOCTOR_DEFAULT_MAX_PAGES,
  DEFAULT_MAX_READS,
  DEFAULT_MAX_RESOURCES,
  DEFAULT_PROFILE,
  DEFAULT_RATE_LIMIT_PROBE,
  DEFAULT_TIMEOUT_MS as DOCTOR_DEFAULT_TIMEOUT_MS,
  HARD_MAX_PAGES as DOCTOR_HARD_MAX_PAGES,
  HARD_MAX_READS,
  HARD_MAX_RESOURCES,
  HARD_RATE_LIMIT_PROBE,
  type DoctorProfile,
} from "./doctor/types.js";
import { formatHumanReport } from "./inspect/format-human.js";
import { formatMarkdownReport } from "./inspect/format-markdown.js";
import { runInspect } from "./inspect/run-inspect.js";
import { DEFAULT_MAX_PAGES, DEFAULT_TIMEOUT_MS, HARD_MAX_PAGES } from "./inspect/types.js";
import { formatInitHumanReport } from "./init/format-human.js";
import { runInit } from "./init/run-init.js";
import { DEFAULT_OUTPUT_DIR } from "./init/types.js";
import { sanitizeTerminalText } from "./sanitize.js";

const PACKAGE_VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
).version as string;

function printRootUsage(): void {
  process.stdout.write(`Usage: engawa <command> [options]

Commands:
  inspect     Inspect a public website and produce an Agent Readiness Report
  init        Plan Engawa integration from inspection report and local repository
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
  --max-pages <n>     Primary page crawl budget (default ${DEFAULT_MAX_PAGES}, max ${HARD_MAX_PAGES}; well-known discovery probes may run separately)
  --timeout-ms <n>    Per-request timeout in ms (default ${DEFAULT_TIMEOUT_MS})
  --allow-local       Allow localhost and private-network targets
  --help, -h          Show this help
`);
}

function printInitUsage(): void {
  process.stdout.write(`Usage: engawa init (--url <url> | --inspect-report <file>) [options]

Plan Engawa integration from an inspection report and local repository.
Creates a planning bundle in the output directory (default .engawa).
Does not modify application source code.

Options:
  --url <url>              Live URL to inspect (mutually exclusive with --inspect-report)
  --inspect-report <file>  Saved engawa.inspect.v1 JSON report
  --repo <path>            Repository root to analyze (default .)
  --output-dir <path>      Output directory for plan bundle (default ${DEFAULT_OUTPUT_DIR})
  --dry-run                Print plan without writing files
  --json                   Output engawa.plan.v1 JSON to stdout
  --force                  Overwrite known Engawa-generated bundle files
  --max-pages <n>          Crawl budget for --url mode (default ${DEFAULT_MAX_PAGES}, max ${HARD_MAX_PAGES})
  --timeout-ms <n>         Per-request timeout for --url mode (default ${DEFAULT_TIMEOUT_MS})
  --allow-local            Allow localhost targets in --url mode
  --help, -h               Show this help
`);
}

function printDoctorUsage(): void {
  process.stdout.write(`Usage: engawa doctor <url> [options]

Verify that a deployed Engawa public agent interface works.
Read-only live checks: llms.txt, Markdown, MCP protocol, search_site, bounded security observations.
Does not prove HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE.
Does not send credentials or call Distribution Map.

Options:
  --profile <full|discovery>  Verification profile (default ${DEFAULT_PROFILE})
  --plan <path>               Optional engawa.plan.v1 for expectation comparison
  --mcp-url <url>             Explicit same-origin MCP endpoint
  --query <text>              Known public search_site query (sent to target)
  --deny-term <text>          Synthetic sentinel that must not appear (repeatable)
  --max-pages <n>             Inspect discovery budget (default ${DOCTOR_DEFAULT_MAX_PAGES}, max ${DOCTOR_HARD_MAX_PAGES})
  --max-resources <n>         MCP resources/list bound (default ${DEFAULT_MAX_RESOURCES}, max ${HARD_MAX_RESOURCES})
  --max-reads <n>             MCP resources/read samples (default ${DEFAULT_MAX_READS}, max ${HARD_MAX_READS})
  --timeout-ms <n>            Per-operation timeout ms (default ${DOCTOR_DEFAULT_TIMEOUT_MS})
  --rate-limit-probe <n>      Opt-in sequential rate probes (default ${DEFAULT_RATE_LIMIT_PROBE}, max ${HARD_RATE_LIMIT_PROBE})
  --strict                    Fail on unresolved production-security evidence
  --allow-local               Allow localhost and private-network targets
  --json                      Output engawa.doctor.v1 JSON to stdout
  --output <path>             Write report to .json or .md (fails if file exists)
  --help, -h                  Show this help
`);
}

function parsePositiveInt(value: string, flag: string, max?: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new InspectError(`Invalid value for ${flag}: ${value}`);
  }
  if (max !== undefined && n > max) {
    throw new Error(`${flag} must be <= ${max}`);
  }
  return n;
}

function parseNonNegativeInt(value: string, flag: string, max?: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new DoctorError(`Invalid value for ${flag}: ${value}`);
  }
  if (max !== undefined && n > max) {
    throw new DoctorError(`${flag} must be <= ${max}`);
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

function getRepeatableFlagValues(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === flag && i + 1 < args.length) {
      values.push(args[i + 1]);
      i += 1;
    } else if (a.startsWith(`${flag}=`)) {
      values.push(a.slice(flag.length + 1));
    }
  }
  return values;
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

async function runInitCommand(args: string[]): Promise<number> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printInitUsage();
    return 0;
  }

  const url = getFlagValue(args, "--url");
  const inspectReport = getFlagValue(args, "--inspect-report");
  const repoPath = getFlagValue(args, "--repo") ?? ".";
  const outputDir = getFlagValue(args, "--output-dir") ?? DEFAULT_OUTPUT_DIR;
  const dryRun = hasFlag(args, "--dry-run");
  const json = hasFlag(args, "--json");
  const force = hasFlag(args, "--force");
  const allowLocal = hasFlag(args, "--allow-local");

  const maxPagesRaw = getFlagValue(args, "--max-pages");
  const timeoutRaw = getFlagValue(args, "--timeout-ms");
  const maxPages = maxPagesRaw
    ? parsePositiveInt(maxPagesRaw, "--max-pages", HARD_MAX_PAGES)
    : DEFAULT_MAX_PAGES;
  const timeoutMs = timeoutRaw ? parsePositiveInt(timeoutRaw, "--timeout-ms") : DEFAULT_TIMEOUT_MS;

  const knownFlags = [
    "--url",
    "--inspect-report",
    "--repo",
    "--output-dir",
    "--dry-run",
    "--json",
    "--force",
    "--max-pages",
    "--timeout-ms",
    "--allow-local",
    "--help",
    "-h",
  ];
  const unknown = args.filter(
    (a) => a.startsWith("--") && !knownFlags.some((f) => a === f || a.startsWith(`${f}=`)),
  );
  if (unknown.length > 0) {
    throw new InspectError(`Unknown option: ${unknown[0]}`);
  }

  const result = await runInit({
    url,
    inspectReportPath: inspectReport,
    repoPath: resolve(repoPath),
    outputDir: resolve(outputDir),
    dryRun,
    json,
    force,
    maxPages,
    timeoutMs,
    allowLocal,
  });

  if (json) {
    process.stdout.write(result.planJson);
  } else {
    process.stdout.write(`${formatInitHumanReport(result.plan)}\n`);
  }

  return 0;
}

async function runDoctorCommand(args: string[]): Promise<number> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printDoctorUsage();
    return 0;
  }

  // Collect positional URL: skip values of known flags that take arguments
  const flagNames = new Set([
    "--profile",
    "--plan",
    "--mcp-url",
    "--query",
    "--deny-term",
    "--max-pages",
    "--max-resources",
    "--max-reads",
    "--timeout-ms",
    "--rate-limit-probe",
    "--output",
  ]);
  const positionals: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      if (flagNames.has(a) && !a.includes("=") && i + 1 < args.length) {
        i += 1;
      }
      continue;
    }
    positionals.push(a);
  }

  const url = positionals[0];
  if (!url) {
    throw new DoctorError("URL is required");
  }

  const profileRaw = getFlagValue(args, "--profile") ?? DEFAULT_PROFILE;
  if (profileRaw !== "full" && profileRaw !== "discovery") {
    throw new DoctorError(`Invalid --profile: ${profileRaw} (expected full|discovery)`);
  }
  const profile = profileRaw as DoctorProfile;

  const maxPagesRaw = getFlagValue(args, "--max-pages");
  const maxResourcesRaw = getFlagValue(args, "--max-resources");
  const maxReadsRaw = getFlagValue(args, "--max-reads");
  const timeoutRaw = getFlagValue(args, "--timeout-ms");
  const rateProbeRaw = getFlagValue(args, "--rate-limit-probe");

  const maxPages = maxPagesRaw
    ? parsePositiveInt(maxPagesRaw, "--max-pages", DOCTOR_HARD_MAX_PAGES)
    : DOCTOR_DEFAULT_MAX_PAGES;
  const maxResources = maxResourcesRaw
    ? parsePositiveInt(maxResourcesRaw, "--max-resources", HARD_MAX_RESOURCES)
    : DEFAULT_MAX_RESOURCES;
  const maxReads = maxReadsRaw
    ? parsePositiveInt(maxReadsRaw, "--max-reads", HARD_MAX_READS)
    : DEFAULT_MAX_READS;
  const timeoutMs = timeoutRaw
    ? parsePositiveInt(timeoutRaw, "--timeout-ms")
    : DOCTOR_DEFAULT_TIMEOUT_MS;
  const rateLimitProbe = rateProbeRaw
    ? parseNonNegativeInt(rateProbeRaw, "--rate-limit-probe", HARD_RATE_LIMIT_PROBE)
    : DEFAULT_RATE_LIMIT_PROBE;

  const knownFlags = [
    "--profile",
    "--plan",
    "--mcp-url",
    "--query",
    "--deny-term",
    "--max-pages",
    "--max-resources",
    "--max-reads",
    "--timeout-ms",
    "--rate-limit-probe",
    "--strict",
    "--allow-local",
    "--json",
    "--output",
    "--help",
    "-h",
  ];
  const unknown = args.filter(
    (a) => a.startsWith("--") && !knownFlags.some((f) => a === f || a.startsWith(`${f}=`)),
  );
  if (unknown.length > 0) {
    throw new DoctorError(`Unknown option: ${unknown[0]}`);
  }

  const json = hasFlag(args, "--json");
  const report = await runDoctor({
    inputUrl: url,
    profile,
    planPath: getFlagValue(args, "--plan"),
    mcpUrl: getFlagValue(args, "--mcp-url"),
    query: getFlagValue(args, "--query"),
    denyTerms: getRepeatableFlagValues(args, "--deny-term"),
    maxPages,
    maxResources,
    maxReads,
    timeoutMs,
    rateLimitProbe,
    strict: hasFlag(args, "--strict"),
    allowLocal: hasFlag(args, "--allow-local"),
    json,
    outputPath: getFlagValue(args, "--output"),
  });

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatDoctorHumanReport(report)}\n`);
  }

  const outputPath = getFlagValue(args, "--output");
  if (outputPath) {
    await writeDoctorOutput(report, outputPath);
  }

  return report.summary.status === "FAIL" ? 1 : 0;
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
      case "init":
        return await runInitCommand(args);
      case "doctor":
        return await runDoctorCommand(args);
      default:
        process.stderr.write(`Unknown command: ${command}\n`);
        printRootUsage();
        return 1;
    }
  } catch (error) {
    if (isCliError(error)) {
      process.stderr.write(`${sanitizeTerminalText(error.message)}\n`);
      return 1;
    }
    if (error instanceof Error) {
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

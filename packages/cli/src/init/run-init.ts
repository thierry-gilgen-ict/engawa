import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { InitError } from "../errors.js";
import { inspectReportSchema } from "../inspect/schema.js";
import { runInspect } from "../inspect/run-inspect.js";
import type { InspectReport } from "../inspect/types.js";
import { buildEngawaPlan } from "./plan-build.js";
import { formatAgentPrompt } from "./format-agent-prompt.js";
import { formatPlanMarkdown } from "./format-plan-markdown.js";
import { writeInitBundle } from "./bundle-write.js";
import { hashInspectReportBytes, hashInspectReportCanonical } from "./hash.js";
import { resolveRepoRoot } from "./repo-path.js";
import { assertRepoDirectory, scanRepository } from "./repo-scan.js";
import type { EngawaPlan, InitOptions } from "./types.js";
import { MAX_INSPECT_REPORT_BYTES } from "./types.js";

export interface InitResult {
  plan: EngawaPlan;
  planJson: string;
  planMarkdown: string;
  agentPrompt: string;
}

async function loadInspectReport(path: string): Promise<{ report: InspectReport; sha256: string }> {
  let stat;
  try {
    stat = statSync(path);
  } catch {
    throw new InitError(`Inspect report not found: ${path}`);
  }
  if (!stat.isFile()) {
    throw new InitError(`Inspect report path is not a file: ${path}`);
  }
  if (stat.size > MAX_INSPECT_REPORT_BYTES) {
    throw new InitError(`Inspect report exceeds maximum size (${MAX_INSPECT_REPORT_BYTES} bytes)`);
  }

  const bytes = readFileSync(path);
  const sha256 = hashInspectReportBytes(bytes);

  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new InitError("Inspect report is not valid JSON");
  }

  const report = inspectReportSchema.parse(parsed);
  return { report, sha256 };
}

export async function runInit(options: InitOptions): Promise<InitResult> {
  if (options.url && options.inspectReportPath) {
    throw new InitError("Cannot use both --url and --inspect-report");
  }
  if (!options.url && !options.inspectReportPath) {
    throw new InitError("Either --url or --inspect-report is required");
  }

  assertRepoDirectory(options.repoPath);
  const repoRoot = resolveRepoRoot(options.repoPath);

  let inspectReport: InspectReport;
  let inspectionSource: "LIVE_URL" | "SAVED_REPORT";
  let inspectReportSha256: string;

  if (options.inspectReportPath) {
    const loaded = await loadInspectReport(options.inspectReportPath);
    inspectReport = loaded.report;
    inspectionSource = "SAVED_REPORT";
    inspectReportSha256 = loaded.sha256;
  } else {
    inspectReport = await runInspect({
      inputUrl: options.url!,
      maxPages: options.maxPages,
      timeoutMs: options.timeoutMs,
      allowLocal: options.allowLocal,
    });
    inspectionSource = "LIVE_URL";
    inspectReportSha256 = hashInspectReportCanonical(inspectReport);
  }

  const scan = scanRepository(repoRoot);
  const plan = buildEngawaPlan(
    inspectReport,
    inspectionSource,
    inspectReportSha256,
    basename(repoRoot),
    scan,
  );

  const planJson = `${JSON.stringify(plan, null, 2)}\n`;
  const planMarkdown = `${formatPlanMarkdown(plan)}\n`;
  const agentPrompt = `${formatAgentPrompt(plan)}\n`;

  writeInitBundle(
    options.outputDir,
    { planJson, planMarkdown, agentPrompt },
    options.force,
    options.dryRun,
  );

  return { plan, planJson, planMarkdown, agentPrompt };
}

import { sanitizeTerminalText } from "../sanitize.js";
import type { EngawaDoctorReport } from "./types.js";

export function formatDoctorHumanReport(report: EngawaDoctorReport): string {
  const lines: string[] = [];
  lines.push("Engawa Doctor");
  lines.push("");
  lines.push("Target");
  lines.push(`  ${sanitizeTerminalText(report.target.finalUrl)}`);
  lines.push(`  Profile         ${report.profile}`);
  lines.push("");
  lines.push("Discovery");
  lines.push(`  llms.txt       ${report.llmsTxt.status}`);
  lines.push(
    `  Markdown       ${report.markdown.status} (${report.markdown.sampledCount}/${report.markdown.discoveredCount} sampled)`,
  );
  lines.push("");
  lines.push("MCP");
  if (report.mcp.status === "NOT_REQUIRED") {
    lines.push("  Status         NOT_REQUIRED");
  } else {
    lines.push(`  Connect        ${report.mcp.connect}`);
    lines.push(
      `  Resources      ${report.mcp.resourcesList}${report.mcp.resourceCount !== undefined ? ` (${report.mcp.resourceCount})` : ""}`,
    );
    lines.push(`  Read samples   ${report.mcp.resourcesRead} (${report.mcp.readSamples.length})`);
    lines.push(`  Tools          ${report.mcp.toolsList}`);
    lines.push(
      `  Public tools   ${report.mcp.publicTools === "PASS" ? "search_site only" : report.mcp.publicTools}`,
    );
    lines.push(`  Search         ${report.mcp.searchSite}`);
    lines.push(`  Empty reject   ${report.mcp.searchEmptyQueryRejected}`);
    if (report.mcp.knownQuery !== "NOT_REQUIRED" && report.mcp.knownQuery !== "SKIPPED") {
      lines.push(`  Known query    ${report.mcp.knownQuery}`);
    }
  }
  lines.push("");
  lines.push("Security observations");
  lines.push(`  Host           ${report.security.hostValidation}`);
  lines.push(`  Origin         ${report.security.originValidation}`);
  lines.push(`  Rate limit     ${report.security.rateLimit}`);
  lines.push("");
  lines.push("Source parity");
  lines.push(`  ${report.sourceParity.humanPublicSourceParity}`);
  if (report.planComparison.status !== "NOT_PROVIDED") {
    lines.push("");
    lines.push("Plan comparison");
    lines.push(`  ${report.planComparison.status}`);
  }
  lines.push("");
  lines.push("Result");
  lines.push(`  ${report.summary.status}`);
  if (report.summary.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings");
    for (const w of report.summary.warnings) {
      lines.push(`  ${sanitizeTerminalText(w)}`);
    }
  }
  if (report.summary.failures.length > 0) {
    lines.push("");
    lines.push("Failures");
    for (const f of report.summary.failures) {
      lines.push(`  ${sanitizeTerminalText(f)}`);
    }
  }
  return lines.join("\n");
}

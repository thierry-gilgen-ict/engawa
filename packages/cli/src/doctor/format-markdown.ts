import { sanitizeTerminalText } from "../sanitize.js";
import type { EngawaDoctorReport } from "./types.js";

export function formatDoctorMarkdownReport(report: EngawaDoctorReport): string {
  const lines: string[] = [];
  lines.push("# Engawa Doctor Report");
  lines.push("");
  lines.push(`Schema: \`${report.schemaVersion}\``);
  lines.push("");
  lines.push("## Target");
  lines.push("");
  lines.push(`- Input: ${sanitizeTerminalText(report.target.inputUrl)}`);
  lines.push(`- Final: ${sanitizeTerminalText(report.target.finalUrl)}`);
  lines.push(`- Origin: ${sanitizeTerminalText(report.target.origin)}`);
  lines.push(`- Profile: \`${report.profile}\``);
  lines.push("");
  lines.push("## Discovery evidence (from inspect)");
  lines.push("");
  lines.push(`- llms advertised: ${report.discovery.llmsAdvertised}`);
  lines.push(`- Markdown advertised: ${report.discovery.markdownAdvertised}`);
  lines.push(`- MCP advertised: ${report.discovery.mcpAdvertised}`);
  lines.push(`- Public routes: ${report.discovery.publicRouteCount}`);
  lines.push(`- Candidates: ${report.discovery.candidateRouteCount}`);
  lines.push(`- Sensitive: ${report.discovery.sensitiveRouteCount}`);
  lines.push("");
  lines.push("## llms.txt");
  lines.push("");
  lines.push(`- Status: **${report.llmsTxt.status}**`);
  lines.push(`- HTTP: ${report.llmsTxt.httpStatus ?? "n/a"}`);
  lines.push(`- Content-Type: ${sanitizeTerminalText(report.llmsTxt.contentType ?? "")}`);
  lines.push(`- Canonical reference: ${report.llmsTxt.canonicalSiteReference}`);
  lines.push(`- MCP advertisement: ${report.llmsTxt.mcpAdvertisement}`);
  lines.push(`- Markdown advertisement: ${report.llmsTxt.markdownAdvertisement}`);
  lines.push("");
  lines.push("## Markdown");
  lines.push("");
  lines.push(`- Status: **${report.markdown.status}**`);
  lines.push(`- Discovered: ${report.markdown.discoveredCount}`);
  lines.push(`- Sampled: ${report.markdown.sampledCount}`);
  for (const sample of report.markdown.samples) {
    lines.push(
      `- ${sanitizeTerminalText(sample.url)} — ${sample.result} (${sample.status}, ${sanitizeTerminalText(sample.contentType)}, ${sample.byteLength} bytes)`,
    );
  }
  lines.push("");
  lines.push("## MCP");
  lines.push("");
  lines.push(`- Status: **${report.mcp.status}**`);
  if (report.mcp.endpoint) {
    lines.push(`- Endpoint: ${sanitizeTerminalText(report.mcp.endpoint)}`);
  }
  lines.push(`- Connect: ${report.mcp.connect}`);
  lines.push(`- Resources list: ${report.mcp.resourcesList}`);
  lines.push(`- Resource count: ${report.mcp.resourceCount ?? "n/a"}`);
  lines.push(`- Resources read: ${report.mcp.resourcesRead}`);
  lines.push(
    `- Tools: ${report.mcp.toolNames.map((t) => sanitizeTerminalText(t)).join(", ") || "(none)"}`,
  );
  lines.push(`- Public tools: ${report.mcp.publicTools}`);
  lines.push(`- Search: ${report.mcp.searchSite}`);
  lines.push(`- Empty query rejected: ${report.mcp.searchEmptyQueryRejected}`);
  lines.push(`- Known query: ${report.mcp.knownQuery}`);
  lines.push("");
  lines.push("## Security observations");
  lines.push("");
  lines.push(`- Host: ${report.security.hostValidation}`);
  lines.push(`- Origin: ${report.security.originValidation}`);
  lines.push(`- Rate limit: ${report.security.rateLimit}`);
  lines.push("");
  lines.push("## Source parity");
  lines.push("");
  lines.push(`- ${report.sourceParity.humanPublicSourceParity}`);
  lines.push("");
  lines.push("Live doctor cannot prove `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE`.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`**${report.summary.status}**`);
  if (report.summary.warnings.length > 0) {
    lines.push("");
    lines.push("### Warnings");
    lines.push("");
    for (const w of report.summary.warnings) {
      lines.push(`- ${sanitizeTerminalText(w)}`);
    }
  }
  if (report.summary.failures.length > 0) {
    lines.push("");
    lines.push("### Failures");
    lines.push("");
    for (const f of report.summary.failures) {
      lines.push(`- ${sanitizeTerminalText(f)}`);
    }
  }
  return lines.join("\n");
}

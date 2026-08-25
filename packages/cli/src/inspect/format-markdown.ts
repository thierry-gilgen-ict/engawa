import type { InspectReport } from "./types.js";

export function formatMarkdownReport(report: InspectReport): string {
  const lines: string[] = [];
  lines.push("# Engawa Agent Readiness Report");
  lines.push("");
  lines.push("> **HUMAN_REVIEW_REQUIRED** — Candidate routes are not auto-approved for Engawa.");
  lines.push(
    "> **SECURITY_ASSESSMENT = NOT_PERFORMED** — Use engawa doctor for operational checks.",
  );
  lines.push("");
  lines.push("## Site");
  lines.push(`- Input URL: ${report.target.inputUrl}`);
  lines.push(`- Final URL: ${report.target.finalUrl}`);
  lines.push(`- Origin: ${report.target.origin}`);
  lines.push("");
  lines.push("## Inspection scope");
  lines.push(`- Max pages: ${report.crawl.maxPages}`);
  lines.push(`- Pages fetched: ${report.crawl.pagesFetched}`);
  lines.push(`- Pages discovered: ${report.crawl.pagesDiscovered}`);
  lines.push(`- Same-origin only: yes`);
  lines.push(`- Allow local: ${report.crawl.allowLocal ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Agent Readiness Score");
  lines.push(
    `**${report.score.total} / ${report.score.maxTotal}** (machine-readable surfaces only — not security)`,
  );
  lines.push("");
  lines.push("| Category | Points |");
  lines.push("| --- | --- |");
  for (const cat of report.score.categories) {
    lines.push(`| ${cat.id} | ${cat.pointsEarned}/${cat.pointsAvailable} |`);
  }
  lines.push("");
  lines.push("## Agent surfaces");
  lines.push(`- llms.txt: ${report.agentSurfaces.llmsTxt.exists ? "present" : "missing"}`);
  lines.push(`- Markdown alternates found: ${report.agentSurfaces.markdown.alternatesFound}`);
  lines.push(`- Markdown verified: ${report.agentSurfaces.markdown.resourcesVerified}`);
  lines.push(
    `- MCP advertised: ${report.agentSurfaces.mcp.advertised ? "yes" : "no"} (protocol not verified)`,
  );
  lines.push(`- Agent onboarding: ${report.agentSurfaces.agentOnboarding.status}`);
  lines.push("");
  if (report.frameworkHints.length > 0) {
    lines.push("## Framework hints");
    for (const h of report.frameworkHints) {
      lines.push(`- ${h.name} (${h.confidence}): ${h.evidence.join("; ")}`);
    }
    lines.push("");
  }
  if (report.locales.length > 0) {
    lines.push("## Locales");
    lines.push(report.locales.join(", "));
    lines.push("");
  }
  lines.push("## Candidate public corpus");
  const candidates = report.routes.filter((r) => r.engawaCandidate);
  if (candidates.length === 0) {
    lines.push("No candidate routes recorded.");
  } else {
    for (const r of candidates.slice(0, 50)) {
      lines.push(`- ${r.path} (sources: ${r.sources.join(", ")})`);
    }
    if (candidates.length > 50) lines.push(`- ... ${candidates.length - 50} more`);
  }
  lines.push("");
  lines.push("## Sensitive path hints");
  const sensitive = report.routes.filter((r) => r.sensitivePathHint);
  if (sensitive.length === 0) {
    lines.push("None matched heuristics.");
  } else {
    for (const r of sensitive.slice(0, 30)) {
      lines.push(`- ${r.path}`);
    }
  }
  lines.push("");
  lines.push("## Recommendation");
  lines.push(`- ${report.recommendation.engawaIntegration}`);
  lines.push(`- Planned next step: ${report.recommendation.plannedNextStep}`);
  lines.push("");
  lines.push("## Limitations");
  lines.push("- No JavaScript execution on inspected pages");
  lines.push("- MCP protocol not verified in inspect");
  lines.push("- Security not assessed");
  lines.push("- All corpus candidates require human review");
  return lines.join("\n");
}

import { sanitizeTerminalText } from "../sanitize.js";
import type { InspectReport } from "./types.js";
import { RUBRIC_IDS } from "./score.js";

function label(id: string): string {
  switch (id) {
    case RUBRIC_IDS.PUBLIC_SITE_REACHABLE:
      return "Site reachable";
    case RUBRIC_IDS.CANONICAL_METADATA_PRESENT:
      return "Canonical metadata";
    case RUBRIC_IDS.SITEMAP_OR_STRUCTURED_ROUTE_DISCOVERY:
      return "Sitemap / route discovery";
    case RUBRIC_IDS.LLMS_TXT:
      return "llms.txt";
    case RUBRIC_IDS.MARKDOWN_ALTERNATES_OR_RESOURCES:
      return "Markdown";
    case RUBRIC_IDS.MCP_ADVERTISED:
      return "MCP advertised";
    case RUBRIC_IDS.AGENT_ONBOARDING_PAGE:
      return "Agent onboarding";
    default:
      return id;
  }
}

function statusForCategory(cat: InspectReport["score"]["categories"][number]): string {
  if (cat.pointsEarned === cat.pointsAvailable && cat.pointsAvailable > 0) return "PASS";
  if (cat.pointsEarned === 0) return cat.id === RUBRIC_IDS.LLMS_TXT ? "MISSING" : "NO";
  return "PARTIAL";
}

export function formatHumanReport(report: InspectReport): string {
  const lines: string[] = [];
  lines.push("Engawa Inspector");
  lines.push("");
  lines.push("Site");
  lines.push(`  ${sanitizeTerminalText(report.target.finalUrl)}`);
  lines.push("");
  lines.push("Agent Readiness");
  lines.push(`  ${report.score.total} / ${report.score.maxTotal}`);
  lines.push("");
  lines.push("Discovery");
  for (const cat of report.score.categories.slice(0, 3)) {
    lines.push(`  ${label(cat.id).padEnd(22)} ${statusForCategory(cat)}`);
  }
  lines.push("");
  lines.push("Agent surfaces");
  for (const cat of report.score.categories.slice(3)) {
    const status = statusForCategory(cat);
    lines.push(`  ${label(cat.id).padEnd(22)} ${status}`);
  }
  lines.push("");
  lines.push("Site inventory");
  lines.push(`  Pages discovered     ${report.crawl.pagesDiscovered}`);
  lines.push(`  Pages fetched        ${report.crawl.pagesFetched}`);
  if (report.locales.length > 0) {
    lines.push(`  Locales              ${report.locales.join(", ")}`);
  }
  if (report.frameworkHints.length > 0) {
    const hint = report.frameworkHints[0];
    lines.push(`  Framework hints      ${sanitizeTerminalText(hint.name)} (${hint.confidence})`);
  }
  lines.push("");
  const candidates = report.routes.filter((r) => r.engawaCandidate).slice(0, 12);
  if (candidates.length > 0) {
    lines.push("Potential Engawa corpus (CANDIDATE — human review required)");
    for (const r of candidates) {
      lines.push(`  ${sanitizeTerminalText(r.path)}`);
    }
    if (report.routes.filter((r) => r.engawaCandidate).length > candidates.length) {
      lines.push("  ...");
    }
    lines.push("");
  }
  const sensitive = report.routes.filter((r) => r.sensitivePathHint).slice(0, 8);
  if (sensitive.length > 0) {
    lines.push("Excluded / review");
    for (const r of sensitive) {
      lines.push(`  ${sanitizeTerminalText(r.path)}  sensitive-path hint`);
    }
    lines.push("");
  }
  lines.push("Security");
  lines.push("  NOT ASSESSED");
  lines.push("");
  lines.push("Recommendation");
  lines.push(`  ENGAWA_INTEGRATION = ${report.recommendation.engawaIntegration}`);
  lines.push("");
  lines.push("Planned next step");
  lines.push(`  ${sanitizeTerminalText(report.recommendation.plannedNextStep)}`);
  lines.push("");
  lines.push("HUMAN_REVIEW_REQUIRED = YES");
  return lines.join("\n");
}

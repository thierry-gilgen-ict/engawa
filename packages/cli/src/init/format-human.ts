import { sanitizeTerminalText } from "../sanitize.js";
import type { EngawaPlan } from "./types.js";

export function formatInitHumanReport(plan: EngawaPlan): string {
  const lines: string[] = [];
  lines.push("Engawa Init");
  lines.push("");
  lines.push("Target");
  lines.push(`  ${sanitizeTerminalText(plan.target.url)}`);
  lines.push("");
  lines.push("Repository");
  const fwLabel =
    plan.repository.framework.id === "nextjs"
      ? plan.repository.framework.nextjsAppRouter
        ? "Next.js (App Router)"
        : plan.repository.framework.nextjsPagesRouter
          ? "Next.js (Pages Router)"
          : "Next.js"
      : plan.repository.framework.id;
  lines.push(`  Framework       ${sanitizeTerminalText(fwLabel)}`);
  lines.push(
    `  Package manager ${sanitizeTerminalText(plan.repository.packageManager.detected ?? "unknown")}`,
  );
  lines.push(
    `  Node            ${sanitizeTerminalText(plan.repository.node.enginesNode ?? "unknown")}`,
  );
  lines.push("");

  const inspected = plan.publicRoutes.length;
  const sensitive = plan.publicRoutes.filter((r) => r.sensitivePathHint).length;
  const candidate = plan.publicRoutes.filter(
    (r) => r.engawaCandidate && !r.sensitivePathHint,
  ).length;

  lines.push("Public routes");
  lines.push(`  Inspected       ${inspected}`);
  lines.push(`  Candidate       ${candidate}`);
  lines.push(`  Sensitive       ${sensitive}`);
  lines.push("");

  const candidatesFound = plan.routeMappings.filter(
    (m) => m.sourceStatus === "CANDIDATES_FOUND",
  ).length;
  const sourceUnclear = plan.routeMappings.filter(
    (m) => m.sourceStatus === "ROUTE_MODULE_FOUND_SOURCE_UNCLEAR",
  ).length;
  const excludedSensitive = plan.routeMappings.filter(
    (m) => m.sourceStatus === "EXCLUDED_SENSITIVE",
  ).length;

  lines.push("Source mapping");
  lines.push(`  Candidates found       ${candidatesFound}`);
  lines.push(`  Source unclear          ${sourceUnclear}`);
  lines.push(`  Excluded sensitive      ${excludedSensitive}`);
  lines.push("");

  lines.push("Existing Engawa");
  lines.push(`  ${plan.repository.existingEngawa.status}`);
  lines.push("");

  lines.push("Plan");
  lines.push("  .engawa/engawa-plan.json");
  lines.push("  .engawa/ENGAWA_INTEGRATION_PLAN.md");
  lines.push("  .engawa/AGENT_PROMPT.md");
  lines.push("");
  lines.push("HUMAN_REVIEW_REQUIRED = YES");
  lines.push("APPLICATION_SOURCE_MODIFIED = NO");
  lines.push("");
  lines.push("Next");
  lines.push("  Give AGENT_PROMPT.md to your coding agent.");

  return lines.join("\n");
}

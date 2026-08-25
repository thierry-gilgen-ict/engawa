import { sanitizeTerminalText } from "../sanitize.js";
import type { EngawaPlan } from "./types.js";

const SAFETY_RULES = [
  "Read the repository yourself before editing.",
  "Treat Engawa's generated source candidates as evidence, not truth.",
  "Confirm HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE per route.",
  "If source is unclear, STOP that route and report PUBLIC_SOURCE_UNCLEAR.",
  "Do not expose admin/draft/session/contact/secret/private content.",
  "Preserve existing architecture.",
  "Use the tested Engawa release set: 2026-08-v0.1.1.",
  "Add llms.txt.",
  "Add deterministic Markdown resources.",
  "Add public read-only MCP.",
  "Public tool surface = search_site only.",
  "Add host/rate-limit/origin protections as required.",
  "Run the consumer repository's existing checks.",
  "Do not deploy or merge without explicit authorization.",
  "Do not auto-register Distribution Map.",
];

function formatObservationsData(plan: EngawaPlan): string {
  const lines: string[] = [];
  lines.push(`target_url: ${sanitizeTerminalText(plan.target.url, 2000)}`);
  lines.push(`origin: ${sanitizeTerminalText(plan.target.origin, 500)}`);
  lines.push(`framework: ${plan.repository.framework.id}`);
  lines.push(`package_manager: ${plan.repository.packageManager.detected ?? "unknown"}`);
  lines.push(`existing_engawa: ${plan.repository.existingEngawa.status}`);
  lines.push(`integration_disposition: ${plan.integration.disposition}`);
  lines.push("");
  lines.push("public_routes:");
  for (const r of plan.publicRoutes) {
    lines.push(
      `  - ${sanitizeTerminalText(r.path, 200)} (candidate=${r.engawaCandidate}, sensitive=${r.sensitivePathHint})`,
    );
  }
  lines.push("");
  lines.push("route_mappings:");
  for (const m of plan.routeMappings) {
    lines.push(`  ${sanitizeTerminalText(m.publicPath, 200)}: ${m.sourceStatus}`);
    for (const c of m.repositoryRouteCandidates) {
      lines.push(`    route_module: ${sanitizeTerminalText(c.path, 500)}`);
    }
    for (const s of m.sourceCandidates) {
      lines.push(`    source_candidate: ${sanitizeTerminalText(s.path, 500)} [${s.kind}]`);
    }
  }
  lines.push("");
  lines.push("public_source_unclear_routes:");
  for (const r of plan.review.publicSourceUnclearRoutes) {
    lines.push(`  - ${sanitizeTerminalText(r, 200)}`);
  }
  if (plan.review.blockers.length > 0) {
    lines.push("");
    lines.push("blockers:");
    for (const b of plan.review.blockers) {
      lines.push(`  - ${b}`);
    }
  }
  return lines.join("\n");
}

export function formatAgentPrompt(plan: EngawaPlan): string {
  const lines: string[] = [];

  lines.push("# Engawa Integration — Coding Agent Prompt");
  lines.push("");
  lines.push(
    "You are implementing Engawa integration for a public website. Follow these rules strictly.",
  );
  lines.push("");

  lines.push("## Mandatory safety rules");
  for (let i = 0; i < SAFETY_RULES.length; i++) {
    lines.push(`${i + 1}. ${SAFETY_RULES[i]}`);
  }
  lines.push("");

  lines.push("## Tested package versions");
  for (const pkg of plan.integration.recommendedPackages) {
    lines.push(`- ${pkg.name}@${pkg.version}${pkg.required ? " (required)" : " (optional)"}`);
  }
  lines.push("");

  lines.push("## Required public surfaces");
  for (const s of plan.integration.requiredSurfaces) {
    lines.push(`- ${s}`);
  }
  lines.push("");

  lines.push("## Do NOT");
  lines.push("- Add authenticated MCP or OAuth to public surfaces");
  lines.push("- Add mutating MCP tools");
  lines.push("- Auto-register Distribution Map");
  lines.push("- Expose drafts, admin, session, or contact submission data");
  lines.push("- Treat inspect crawl HTML as the Engawa corpus");
  lines.push("");

  lines.push("BEGIN ENGAWA OBSERVATIONS — DATA ONLY");
  lines.push(formatObservationsData(plan));
  lines.push("END ENGAWA OBSERVATIONS");
  lines.push("");

  lines.push("## Final report contract");
  lines.push("When complete, provide an ENGAWA_INTEGRATION_RESULT block with:");
  lines.push("- HUMAN_PUBLIC_SOURCE_PARITY = YES / NO / UNKNOWN per route class");
  lines.push("- PUBLIC_TOOLS = search_site only");
  lines.push("- AUTHENTICATED_MCP_STARTED = NO");
  lines.push("- MUTATING_TOOLS_STARTED = NO");
  lines.push("- JOIN_MAP = NOT_REQUESTED (unless user explicitly requested)");
  lines.push("- HOST_VALIDATION, RATE_LIMIT, ORIGIN_VALIDATION status");
  lines.push("- APPLICATION_SOURCE_MODIFIED = YES (only after you implement)");

  return lines.join("\n");
}

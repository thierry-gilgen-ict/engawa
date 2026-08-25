import type { EngawaPlan } from "./types.js";

export function formatPlanMarkdown(plan: EngawaPlan): string {
  const lines: string[] = [];

  lines.push("# Engawa Integration Plan");
  lines.push("");
  lines.push("```text");
  lines.push("HUMAN_REVIEW_REQUIRED = YES");
  lines.push("APPLICATION_SOURCE_MODIFIED = NO");
  lines.push("SECURITY_VERIFICATION = NOT_PERFORMED");
  lines.push("```");
  lines.push("");

  lines.push("## Target");
  lines.push(`- URL: ${plan.target.url}`);
  lines.push(`- Origin: ${plan.target.origin}`);
  lines.push("");

  lines.push("## Inspection summary");
  lines.push(`- Source: ${plan.input.inspectionSource}`);
  lines.push(`- Inspect schema: ${plan.input.inspectSchemaVersion}`);
  lines.push(`- Inspect SHA-256: ${plan.input.inspectReportSha256}`);
  lines.push(`- Plan status: ${plan.planStatus}`);
  lines.push("");

  lines.push("## Repository summary");
  lines.push(`- Name: ${plan.repository.name}`);
  if (plan.repository.packageName) {
    lines.push(`- Package: ${plan.repository.packageName}`);
  }
  lines.push(`- Framework: ${plan.repository.framework.id}`);
  if (plan.repository.framework.evidence.length > 0) {
    lines.push(`- Framework evidence: ${plan.repository.framework.evidence.join(", ")}`);
  }
  lines.push(
    `- Package manager: ${plan.repository.packageManager.detected ?? "unknown"} (${plan.repository.packageManager.lockfiles.join(", ") || "no lockfile"})`,
  );
  lines.push(`- Node engines: ${plan.repository.node.enginesNode ?? "not declared"}`);
  lines.push(`- Scan truncated: ${plan.repository.scan.scanTruncated ? "yes" : "no"}`);
  lines.push("");

  lines.push("## Existing Engawa state");
  lines.push(`- Status: ${plan.repository.existingEngawa.status}`);
  for (const pkg of plan.repository.existingEngawa.packages) {
    lines.push(`- ${pkg.name}: ${pkg.version}`);
  }
  if (plan.repository.existingEngawa.surfaceHints.length > 0) {
    lines.push("- Surface hints:");
    for (const hint of plan.repository.existingEngawa.surfaceHints) {
      lines.push(`  - ${hint}`);
    }
  }
  lines.push("");

  lines.push("## Public route inventory");
  for (const route of plan.publicRoutes) {
    const flags = [
      route.engawaCandidate ? "candidate" : "not-candidate",
      route.sensitivePathHint ? "sensitive" : "",
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(`- ${route.path} (${flags})`);
  }
  lines.push("");

  lines.push("## Route → repository candidates");
  for (const mapping of plan.routeMappings) {
    lines.push(`### ${mapping.publicPath}`);
    lines.push(`- Source status: ${mapping.sourceStatus}`);
    if (mapping.repositoryRouteCandidates.length > 0) {
      lines.push("- Repository route candidates:");
      for (const c of mapping.repositoryRouteCandidates) {
        lines.push(`  - ${c.path} (${c.confidence}): ${c.evidence.join(", ")}`);
      }
    }
    if (mapping.sourceCandidates.length > 0) {
      lines.push("- Source candidates:");
      for (const s of mapping.sourceCandidates) {
        lines.push(`  - ${s.path} [${s.kind}] (${s.confidence}): ${s.evidence.join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push("## Canonical source review");
  lines.push(
    "SOURCE_CANDIDATE != CANONICAL_SOURCE_PROVEN. Confirm HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE per route.",
  );
  if (plan.review.publicSourceUnclearRoutes.length > 0) {
    lines.push("- PUBLIC_SOURCE_UNCLEAR routes:");
    for (const r of plan.review.publicSourceUnclearRoutes) {
      lines.push(`  - ${r}`);
    }
  }
  lines.push("");

  lines.push("## Proposed Engawa architecture");
  lines.push(`- Disposition: ${plan.integration.disposition}`);
  lines.push(`- Tested release set: ${plan.integration.testedReleaseSet}`);
  lines.push("");

  lines.push("## Required packages");
  for (const pkg of plan.integration.recommendedPackages.filter((p) => p.required)) {
    lines.push(`- ${pkg.name}@${pkg.version}`);
  }
  lines.push("");

  lines.push("## Required public surfaces");
  for (const s of plan.integration.requiredSurfaces) {
    lines.push(`- ${s}`);
  }
  lines.push("");

  lines.push("## Security review items");
  lines.push(`- Middleware: ${plan.securityEvidence.middleware}`);
  lines.push(`- Next config: ${plan.securityEvidence.nextConfig}`);
  lines.push(`- Rate limiter: ${plan.securityEvidence.rateLimiter}`);
  lines.push(`- Auth middleware: ${plan.securityEvidence.authMiddleware}`);
  lines.push(`- Headers config: ${plan.securityEvidence.headersConfig}`);
  lines.push(`- Canonical host: ${plan.securityEvidence.canonicalHost}`);
  lines.push("");

  lines.push("## Excluded/sensitive routes");
  for (const route of plan.publicRoutes.filter((r) => r.sensitivePathHint)) {
    lines.push(`- ${route.path}`);
  }
  lines.push("");

  lines.push("## Open questions");
  for (const q of plan.review.questions) {
    lines.push(`- ${q}`);
  }
  lines.push("");

  lines.push("## Implementation sequence");
  lines.push(
    "1. Confirm canonical content loaders per route (HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE)",
  );
  lines.push("2. Install tested Engawa packages");
  lines.push("3. Implement ContentAdapter using confirmed loaders");
  lines.push("4. Add llms.txt, markdown alternates, read-only MCP (search_site only)");
  lines.push("5. Add host/rate-limit/origin protections in application layer");
  lines.push("6. Run repository tests and integration acceptance checklist");
  lines.push("");

  lines.push("## Acceptance criteria");
  lines.push("- See docs/integration-acceptance.md");
  lines.push("- PUBLIC_TOOLS = search_site only");
  lines.push("- No Distribution Map registration without explicit user request");

  return lines.join("\n");
}

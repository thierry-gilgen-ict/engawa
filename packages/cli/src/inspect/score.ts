import type { InspectReport, ScoreCategory } from "./types.js";

export const RUBRIC_IDS = {
  PUBLIC_SITE_REACHABLE: "PUBLIC_SITE_REACHABLE",
  CANONICAL_METADATA_PRESENT: "CANONICAL_METADATA_PRESENT",
  SITEMAP_OR_STRUCTURED_ROUTE_DISCOVERY: "SITEMAP_OR_STRUCTURED_ROUTE_DISCOVERY",
  LLMS_TXT: "LLMS_TXT",
  MARKDOWN_ALTERNATES_OR_RESOURCES: "MARKDOWN_ALTERNATES_OR_RESOURCES",
  MCP_ADVERTISED: "MCP_ADVERTISED",
  AGENT_ONBOARDING_PAGE: "AGENT_ONBOARDING_PAGE",
} as const;

const RUBRIC_POINTS: Record<string, number> = {
  [RUBRIC_IDS.PUBLIC_SITE_REACHABLE]: 10,
  [RUBRIC_IDS.CANONICAL_METADATA_PRESENT]: 10,
  [RUBRIC_IDS.SITEMAP_OR_STRUCTURED_ROUTE_DISCOVERY]: 10,
  [RUBRIC_IDS.LLMS_TXT]: 20,
  [RUBRIC_IDS.MARKDOWN_ALTERNATES_OR_RESOURCES]: 20,
  [RUBRIC_IDS.MCP_ADVERTISED]: 20,
  [RUBRIC_IDS.AGENT_ONBOARDING_PAGE]: 10,
};

export interface ScoreInput {
  siteReachable: boolean;
  canonicalPresent: boolean;
  sitemapOrStructuredDiscovery: boolean;
  llmsTxtFull: boolean;
  markdownFull: boolean;
  mcpAdvertised: boolean;
  agentOnboardingFound: boolean;
  evidence: Record<string, string[]>;
}

export function computeScore(input: ScoreInput): InspectReport["score"] {
  const categories: ScoreCategory[] = [];

  const add = (id: string, earned: boolean, evidence: string[], reason?: string) => {
    const pointsAvailable = RUBRIC_POINTS[id];
    categories.push({
      id,
      pointsEarned: earned ? pointsAvailable : 0,
      pointsAvailable,
      evidence,
      reason: earned ? undefined : (reason ?? "not observed"),
    });
  };

  add(RUBRIC_IDS.PUBLIC_SITE_REACHABLE, input.siteReachable, input.evidence.siteReachable ?? []);
  add(
    RUBRIC_IDS.CANONICAL_METADATA_PRESENT,
    input.canonicalPresent,
    input.evidence.canonical ?? [],
  );
  add(
    RUBRIC_IDS.SITEMAP_OR_STRUCTURED_ROUTE_DISCOVERY,
    input.sitemapOrStructuredDiscovery,
    input.evidence.sitemap ?? [],
  );
  add(RUBRIC_IDS.LLMS_TXT, input.llmsTxtFull, input.evidence.llmsTxt ?? []);
  add(
    RUBRIC_IDS.MARKDOWN_ALTERNATES_OR_RESOURCES,
    input.markdownFull,
    input.evidence.markdown ?? [],
  );
  add(RUBRIC_IDS.MCP_ADVERTISED, input.mcpAdvertised, input.evidence.mcp ?? []);
  add(
    RUBRIC_IDS.AGENT_ONBOARDING_PAGE,
    input.agentOnboardingFound,
    input.evidence.agentOnboarding ?? [],
  );

  const total = categories.reduce((sum, c) => sum + c.pointsEarned, 0);
  const maxTotal = categories.reduce((sum, c) => sum + c.pointsAvailable, 0);

  return { total, maxTotal, categories };
}

import type { EngawaIntegrationRecommendation, InspectReport } from "./types.js";
import { RUBRIC_IDS } from "./score.js";

export function buildRecommendation(
  score: InspectReport["score"],
  targetUrl: string,
): InspectReport["recommendation"] {
  const llms = score.categories.find((c) => c.id === RUBRIC_IDS.LLMS_TXT);
  const markdown = score.categories.find(
    (c) => c.id === RUBRIC_IDS.MARKDOWN_ALTERNATES_OR_RESOURCES,
  );
  const mcp = score.categories.find((c) => c.id === RUBRIC_IDS.MCP_ADVERTISED);

  const llmsFull = llms?.pointsEarned === llms?.pointsAvailable && (llms?.pointsEarned ?? 0) > 0;
  const markdownFull =
    markdown?.pointsEarned === markdown?.pointsAvailable && (markdown?.pointsEarned ?? 0) > 0;
  const mcpFull = mcp?.pointsEarned === mcp?.pointsAvailable && (mcp?.pointsEarned ?? 0) > 0;

  let engawaIntegration: EngawaIntegrationRecommendation;
  if (llmsFull && markdownFull && mcpFull) {
    engawaIntegration = "ALREADY_HAS_AGENT_SURFACES";
  } else if (score.total < 70 || !llmsFull || !markdownFull) {
    engawaIntegration = "RECOMMENDED";
  } else {
    engawaIntegration = "OPTIONAL";
  }

  return {
    engawaIntegration,
    plannedNextStep: `engawa init --url ${targetUrl} --repo . (planned — not yet implemented)`,
  };
}

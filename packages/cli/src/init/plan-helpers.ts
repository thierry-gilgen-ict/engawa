import type { PlanStatus, RepoMetadata } from "./types.js";

export function evaluateNodeCompatibility(enginesNode?: string): {
  node24Required: boolean;
  nodeVersionStatus: "COMPATIBLE" | "INCOMPATIBLE" | "UNKNOWN";
  blockers: string[];
  questions: string[];
} {
  const blockers: string[] = [];
  const questions: string[] = [];

  if (!enginesNode) {
    questions.push(
      "package.json does not declare engines.node — confirm deployment runtime is Node.js 24+",
    );
    return { node24Required: true, nodeVersionStatus: "UNKNOWN", blockers, questions };
  }

  const lower = enginesNode.toLowerCase();
  if (
    lower.includes("<24") ||
    lower.includes("< 24") ||
    (/\b(18|20|21|22)\b/.test(lower) && !lower.includes("24"))
  ) {
    blockers.push("NODE_24_REQUIRED");
    return { node24Required: true, nodeVersionStatus: "INCOMPATIBLE", blockers, questions };
  }

  if (lower.includes("24") || lower.includes(">=24") || lower.includes(">= 24")) {
    return { node24Required: true, nodeVersionStatus: "COMPATIBLE", blockers, questions };
  }

  questions.push(`engines.node is "${enginesNode}" — verify Node.js 24+ compatibility`);
  return { node24Required: true, nodeVersionStatus: "UNKNOWN", blockers, questions };
}

export function determinePlanStatus(
  publicSourceUnclearRoutes: string[],
  candidateRouteCount: number,
): PlanStatus {
  if (candidateRouteCount === 0 || publicSourceUnclearRoutes.length >= candidateRouteCount) {
    return "REVIEW_REQUIRED";
  }
  return "PLAN_READY_FOR_AGENT_REVIEW";
}

export function buildReviewSection(
  publicSourceUnclearRoutes: string[],
  metadata: RepoMetadata,
  disposition: string,
): {
  humanReviewRequired: true;
  publicSourceUnclearRoutes: string[];
  questions: string[];
  blockers: string[];
} {
  const nodeEval = evaluateNodeCompatibility(metadata.enginesNode);
  const questions = [...nodeEval.questions];

  if (publicSourceUnclearRoutes.length > 0) {
    questions.push(
      `Confirm canonical human-public content loaders for routes: ${publicSourceUnclearRoutes.join(", ")}`,
    );
  }

  if (disposition === "EXISTING_INTEGRATION_DETECTED") {
    questions.push(
      "Review existing Engawa integration before adding duplicate surfaces; use engawa doctor when available",
    );
  }

  questions.sort();

  return {
    humanReviewRequired: true,
    publicSourceUnclearRoutes,
    questions,
    blockers: nodeEval.blockers.sort(),
  };
}

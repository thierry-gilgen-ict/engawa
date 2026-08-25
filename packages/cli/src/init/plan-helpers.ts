import type { PlanStatus, RepoMetadata } from "./types.js";

function rangeIncludes24(lower: number | null, upper: number | null): boolean {
  const minOk = lower === null || lower <= 24;
  const maxOk = upper === null || upper >= 24;
  return minOk && maxOk;
}

function evaluateEnginesNodeRange(enginesNode: string): "COMPATIBLE" | "INCOMPATIBLE" | "UNKNOWN" {
  const normalized = enginesNode.trim().toLowerCase();

  if (normalized === "*" || normalized.startsWith("workspace:")) {
    return "UNKNOWN";
  }

  // Range: >=20 <25 or >=18 <23 (before simple >= check)
  const rangeMatch = /^>=\s*(\d+)\s*<\s*(\d+)/.exec(normalized);
  if (rangeMatch) {
    const lower = Number(rangeMatch[1]);
    const upper = Number(rangeMatch[2]);
    if (upper <= 24) return "INCOMPATIBLE";
    if (lower <= 24 && upper > 24) return "COMPATIBLE";
    return "UNKNOWN";
  }

  // Range: >=20 <=24
  const rangeLeMatch = /^>=\s*(\d+)\s*<=\s*(\d+)/.exec(normalized);
  if (rangeLeMatch) {
    const lower = Number(rangeLeMatch[1]);
    const upper = Number(rangeLeMatch[2]);
    return rangeIncludes24(lower, upper) ? "COMPATIBLE" : "INCOMPATIBLE";
  }

  // Explicit >= 24 style
  const gteMatch = /^>=\s*(\d+)/.exec(normalized);
  if (gteMatch) {
    const min = Number(gteMatch[1]);
    if (min > 24) return "UNKNOWN";
    if (min <= 24) return "COMPATIBLE";
  }

  // Upper bound only: <24
  const ltMatch = /^<\s*(\d+)/.exec(normalized);
  if (ltMatch) {
    const upper = Number(ltMatch[1]);
    return upper <= 24 ? "INCOMPATIBLE" : "UNKNOWN";
  }

  // 24.x or exact 24
  if (/^24\.x$/.test(normalized) || normalized === "24") {
    return "COMPATIBLE";
  }

  // 22.x — major 22 only
  const majorX = /^(\d+)\.x$/.exec(normalized);
  if (majorX) {
    const major = Number(majorX[1]);
    if (major < 24) return "INCOMPATIBLE";
    if (major === 24) return "COMPATIBLE";
    return "UNKNOWN";
  }

  // Bare major mentions without clear range
  if (/\b24\b/.test(normalized) && !/\b(18|20|21|22|23)\b/.test(normalized)) {
    return "COMPATIBLE";
  }

  if (/\b(18|20|21|22|23)\b/.test(normalized) && !/\b24\b/.test(normalized)) {
    return "INCOMPATIBLE";
  }

  return "UNKNOWN";
}

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

  const status = evaluateEnginesNodeRange(enginesNode);

  if (status === "INCOMPATIBLE") {
    blockers.push("NODE_24_REQUIRED");
    return { node24Required: true, nodeVersionStatus: "INCOMPATIBLE", blockers, questions };
  }

  if (status === "COMPATIBLE") {
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
      "Review existing Engawa integration before adding duplicate surfaces; use engawa doctor on the live site",
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

import { existsSync, lstatSync, readFileSync } from "node:fs";
import { DoctorError } from "../errors.js";
import { engawaPlanSchema } from "../init/schema.js";
import type { EngawaPlan } from "../init/types.js";
import { MAX_PLAN_BYTES, type CheckStatus } from "./types.js";

export interface PlanCompareResult {
  status: CheckStatus;
  candidateRouteCount?: number;
  sensitiveRouteCount?: number;
  disposition?: string;
  notes: string[];
  failures: string[];
}

export function comparePlan(options: {
  planPath?: string;
  doctorOrigin: string;
  candidateRouteCount: number;
  sensitiveRouteCount: number;
}): PlanCompareResult {
  if (!options.planPath) {
    return { status: "NOT_PROVIDED", notes: [], failures: [] };
  }

  const failures: string[] = [];
  const notes: string[] = [];

  if (!existsSync(options.planPath)) {
    throw new DoctorError(`Plan file not found: ${options.planPath}`);
  }
  const stat = lstatSync(options.planPath);
  if (stat.isSymbolicLink()) {
    throw new DoctorError(`Plan path must not be a symbolic link: ${options.planPath}`);
  }
  if (!stat.isFile()) {
    throw new DoctorError(`Plan path must be a regular file: ${options.planPath}`);
  }
  if (stat.size > MAX_PLAN_BYTES) {
    throw new DoctorError(`Plan file exceeds size limit (${MAX_PLAN_BYTES} bytes)`);
  }

  let plan: EngawaPlan;
  try {
    const raw = readFileSync(options.planPath, "utf8");
    plan = engawaPlanSchema.parse(JSON.parse(raw));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid plan";
    throw new DoctorError(`Invalid engawa.plan.v1: ${msg}`);
  }

  if (plan.target.origin !== options.doctorOrigin) {
    failures.push("plan target origin does not match doctor target origin");
    return {
      status: "FAIL",
      candidateRouteCount: plan.publicRoutes.filter((r) => r.engawaCandidate).length,
      sensitiveRouteCount: plan.publicRoutes.filter((r) => r.sensitivePathHint).length,
      disposition: plan.integration.disposition,
      notes,
      failures,
    };
  }

  const planCandidates = plan.publicRoutes.filter((r) => r.engawaCandidate).length;
  const planSensitive = plan.publicRoutes.filter((r) => r.sensitivePathHint).length;

  if (planCandidates !== options.candidateRouteCount) {
    notes.push(
      `candidate route count differs (plan=${planCandidates}, live=${options.candidateRouteCount})`,
    );
  }
  if (planSensitive !== options.sensitiveRouteCount) {
    notes.push(
      `sensitive route count differs (plan=${planSensitive}, live=${options.sensitiveRouteCount})`,
    );
  }

  return {
    status: notes.length > 0 ? "WARN" : "PASS",
    candidateRouteCount: planCandidates,
    sensitiveRouteCount: planSensitive,
    disposition: plan.integration.disposition,
    notes,
    failures,
  };
}

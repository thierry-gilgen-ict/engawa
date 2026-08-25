import { sha256Hex } from "./helpers.js";
import type { CheckStatus, DenyTermEvidence } from "./types.js";

export interface DenyTermScanResult {
  checked: boolean;
  results: DenyTermEvidence[];
  status: CheckStatus;
  failures: string[];
}

export function scanDenyTerms(denyTerms: string[], bodies: string[]): DenyTermScanResult {
  if (denyTerms.length === 0) {
    return { checked: false, results: [], status: "NOT_PROVIDED", failures: [] };
  }

  const failures: string[] = [];
  const results: DenyTermEvidence[] = denyTerms.map((term, index) => {
    const found = bodies.some((body) => body.includes(term));
    if (found) {
      failures.push(`deny-term sentinel-${index + 1} found in public content`);
    }
    return {
      id: `sentinel-${index + 1}`,
      sha256: sha256Hex(term),
      found,
    };
  });

  return {
    checked: true,
    results,
    status: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}

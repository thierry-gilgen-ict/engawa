import { createHash } from "node:crypto";
import type { InspectReport } from "../inspect/types.js";

function stableSortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(stableSortKeys);
  }
  if (obj !== null && typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = stableSortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

export function hashInspectReportBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function hashInspectReportCanonical(report: InspectReport): string {
  const canonical = JSON.stringify(stableSortKeys(report));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

import type { RouteEntry } from "./types.js";
import { checkSensitivePath } from "./sensitive.js";
import { isLikelyBinaryPath, isSameOrigin, normalizeUrlForCrawl, pathnameFromUrl } from "./url.js";

export interface RouteAccumulator {
  path: string;
  sources: Set<string>;
}

export function buildRouteEntries(
  discovered: Map<string, RouteAccumulator>,
  origin: URL,
): RouteEntry[] {
  const entries: RouteEntry[] = [];
  for (const [href, acc] of discovered) {
    try {
      const url = new URL(href);
      if (!isSameOrigin(url, origin)) continue;
      const path = pathnameFromUrl(url);
      if (isLikelyBinaryPath(path)) continue;
      const sensitive = checkSensitivePath(path);
      entries.push({
        path,
        sources: [...acc.sources].sort(),
        engawaCandidate: !sensitive.sensitivePathHint,
        humanReviewRequired: true,
        sensitivePathHint: sensitive.sensitivePathHint,
        reason: sensitive.reason,
      });
    } catch {
      continue;
    }
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export function recordDiscoveredUrl(
  map: Map<string, RouteAccumulator>,
  url: URL,
  source: string,
): void {
  const key = normalizeUrlForCrawl(url);
  const existing = map.get(key);
  if (existing) {
    existing.sources.add(source);
  } else {
    map.set(key, { path: pathnameFromUrl(url), sources: new Set([source]) });
  }
}

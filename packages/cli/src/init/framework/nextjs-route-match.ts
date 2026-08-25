export type RouteSegmentKind = "static" | "dynamic" | "catch-all" | "optional-catch-all";

export interface ParsedRouteSegment {
  kind: RouteSegmentKind;
  raw: string;
}

export function parseRouteSegment(segment: string): ParsedRouteSegment {
  if (segment.startsWith("[[...") && segment.endsWith("]]")) {
    return { kind: "optional-catch-all", raw: segment };
  }
  if (segment.startsWith("[...") && segment.endsWith("]")) {
    return { kind: "catch-all", raw: segment };
  }
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return { kind: "dynamic", raw: segment };
  }
  return { kind: "static", raw: segment };
}

function normalizeInspectPath(path: string): string {
  if (path === "/") return "/";
  const trimmed = path.replace(/\/$/, "");
  return trimmed || "/";
}

function splitPathSegments(path: string): string[] {
  if (path === "/") return [];
  return path.replace(/^\//, "").split("/").filter(Boolean);
}

/**
 * Deterministic segment matcher for Next.js App and Pages router public paths.
 * Route pattern may use fewer segments than inspect path when catch-all segments consume the rest.
 */
export function matchInspectPathToRoute(inspectPath: string, routePublicPath: string): boolean {
  const normalizedInspect = normalizeInspectPath(inspectPath);
  const normalizedRoute = normalizeInspectPath(routePublicPath);

  if (normalizedInspect === normalizedRoute) return true;

  const inspectSegments = splitPathSegments(normalizedInspect);
  const routeSegments = splitPathSegments(normalizedRoute);

  return matchSegmentPatterns(inspectSegments, routeSegments);
}

function matchSegmentPatterns(inspectSegments: string[], routeSegments: string[]): boolean {
  let i = 0;
  let j = 0;

  while (j < routeSegments.length) {
    const routeSeg = parseRouteSegment(routeSegments[j]);

    if (routeSeg.kind === "optional-catch-all") {
      // Prefix must match; remainder (0 or more) is consumed by optional catch-all.
      if (!prefixMatches(inspectSegments, routeSegments, j)) return false;
      return true;
    }

    if (routeSeg.kind === "catch-all") {
      // Prefix must match; remainder must be 1+ segments.
      if (!prefixMatches(inspectSegments, routeSegments, j)) return false;
      const remainder = inspectSegments.length - j;
      return remainder >= 1;
    }

    if (i >= inspectSegments.length) return false;

    if (routeSeg.kind === "dynamic") {
      i++;
      j++;
      continue;
    }

    if (routeSeg.raw !== inspectSegments[i]) return false;
    i++;
    j++;
  }

  return i === inspectSegments.length;
}

function prefixMatches(
  inspectSegments: string[],
  routeSegments: string[],
  catchAllIndex: number,
): boolean {
  for (let k = 0; k < catchAllIndex; k++) {
    const routeSeg = parseRouteSegment(routeSegments[k]);
    if (k >= inspectSegments.length) return false;
    if (routeSeg.kind === "dynamic") continue;
    if (routeSeg.kind !== "static") return false;
    if (routeSeg.raw !== inspectSegments[k]) return false;
  }
  return inspectSegments.length >= catchAllIndex;
}

export function segmentToUrlPart(segment: string): string | null {
  if (segment.startsWith("(") && segment.endsWith(")")) return null;
  if (segment.startsWith("[[...") && segment.endsWith("]]")) return segment;
  if (segment.startsWith("[...") && segment.endsWith("]")) return segment;
  if (segment.startsWith("[") && segment.endsWith("]")) return segment;
  return segment;
}

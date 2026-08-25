import type { InspectReport } from "../inspect/types.js";
import { matchInspectPathToAppRoute } from "./framework/nextjs-app-router.js";
import { matchInspectPathToPagesRoute } from "./framework/nextjs-pages-router.js";
import { collectLocalImports, parsePathAliases } from "./source-candidates.js";
import { classifyFileFromContent } from "./source-classify.js";
import type { FrameworkInfo, NextjsRoute, RepoScanResult, SourceStatus } from "./types.js";

export interface RouteMappingInput {
  inspectReport: InspectReport;
  framework: FrameworkInfo;
  appRoutes: NextjsRoute[];
  pagesRoutes: NextjsRoute[];
  scan: RepoScanResult;
}

function importProvenanceEvidence(depth: number): string {
  return depth === 1 ? "direct-local-import-from-route" : "transitive-local-import-depth-2";
}

export function buildRouteMappings(input: RouteMappingInput): Array<{
  publicPath: string;
  inspectionEvidence: string[];
  engawaCandidate: boolean;
  humanReviewRequired: true;
  repositoryRouteCandidates: Array<{
    path: string;
    confidence: "low" | "medium" | "high";
    evidence: string[];
  }>;
  sourceCandidates: Array<{
    path: string;
    kind: import("./types.js").SourceCandidateKind;
    confidence: "low" | "medium" | "high";
    evidence: string[];
  }>;
  sourceStatus: SourceStatus;
}> {
  const { inspectReport, framework, appRoutes, pagesRoutes, scan } = input;
  const aliases = parsePathAliases(scan.fileContents);

  const mappings = inspectReport.routes.map((route) => {
    if (route.sensitivePathHint) {
      return {
        publicPath: route.path,
        inspectionEvidence: [...route.sources].sort(),
        engawaCandidate: route.engawaCandidate,
        humanReviewRequired: true as const,
        repositoryRouteCandidates: [],
        sourceCandidates: [],
        sourceStatus: "EXCLUDED_SENSITIVE" as SourceStatus,
      };
    }

    let repoMatches: NextjsRoute[] = [];
    if (framework.id === "nextjs") {
      repoMatches = [
        ...matchInspectPathToAppRoute(route.path, appRoutes),
        ...matchInspectPathToPagesRoute(route.path, pagesRoutes),
      ];
    }

    const repositoryRouteCandidates = repoMatches.map((r) => ({
      path: r.modulePath,
      confidence: r.publicPath === route.path ? ("high" as const) : ("medium" as const),
      evidence: [...r.evidence].sort(),
    }));

    const sourceCandidates: Array<{
      path: string;
      kind: import("./types.js").SourceCandidateKind;
      confidence: "low" | "medium" | "high";
      evidence: string[];
    }> = [];

    for (const match of repoMatches) {
      const { resolved, unresolved } = collectLocalImports(
        match.modulePath,
        scan.fileContents,
        scan.filePaths,
        aliases,
      );
      for (const { path, depth } of resolved) {
        const content = scan.fileContents.get(path);
        const { kind, evidence } = classifyFileFromContent(path, content);
        sourceCandidates.push({
          path,
          kind,
          confidence: "medium",
          evidence: [importProvenanceEvidence(depth), ...evidence].sort(),
        });
      }
      for (const u of unresolved) {
        sourceCandidates.push({
          path: u,
          kind: "UNKNOWN",
          confidence: "low",
          evidence: ["unresolved-import"],
        });
      }
    }

    let sourceStatus: SourceStatus;
    if (repositoryRouteCandidates.length === 0) {
      sourceStatus = "NO_REPOSITORY_ROUTE_MATCH";
    } else if (sourceCandidates.length === 0) {
      sourceStatus = "ROUTE_MODULE_FOUND_SOURCE_UNCLEAR";
    } else {
      sourceStatus = "CANDIDATES_FOUND";
    }

    return {
      publicPath: route.path,
      inspectionEvidence: [...route.sources].sort(),
      engawaCandidate: route.engawaCandidate,
      humanReviewRequired: true as const,
      repositoryRouteCandidates,
      sourceCandidates: dedupeSourceCandidates(sourceCandidates),
      sourceStatus,
    };
  });

  mappings.sort((a, b) => a.publicPath.localeCompare(b.publicPath));
  return mappings;
}

function dedupeSourceCandidates(
  candidates: Array<{
    path: string;
    kind: import("./types.js").SourceCandidateKind;
    confidence: "low" | "medium" | "high";
    evidence: string[];
  }>,
) {
  const seen = new Set<string>();
  const result: typeof candidates = [];
  for (const c of candidates) {
    const key = `${c.path}:${c.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

export function collectPublicSourceUnclearRoutes(
  mappings: Array<{ publicPath: string; sourceStatus: SourceStatus }>,
): string[] {
  return mappings
    .filter(
      (m) =>
        m.sourceStatus === "ROUTE_MODULE_FOUND_SOURCE_UNCLEAR" ||
        m.sourceStatus === "NO_REPOSITORY_ROUTE_MATCH",
    )
    .map((m) => m.publicPath)
    .sort();
}

import type { InspectReport } from "../inspect/types.js";
import { basename } from "node:path";
import { discoverAppRouterRoutes } from "./framework/nextjs-app-router.js";
import { discoverPagesRouterRoutes } from "./framework/nextjs-pages-router.js";
import { detectFramework } from "./framework/detect.js";
import { detectExistingEngawa } from "./existing-engawa.js";
import { buildIntegrationSection } from "./integration.js";
import { engawaPlanSchema } from "./schema.js";
import { deriveRepoName, extractRepoMetadata } from "./repo-metadata.js";
import {
  buildReviewSection,
  determinePlanStatus,
  evaluateNodeCompatibility,
} from "./plan-helpers.js";
import { buildRouteMappings, collectPublicSourceUnclearRoutes } from "./route-mapping.js";
import { classifyDependencies } from "./source-classify.js";
import { collectSecurityEvidence } from "./security-evidence.js";
import type { EngawaPlan, InspectionSource, RepoScanResult } from "./types.js";
import { PLAN_SCHEMA_VERSION } from "./types.js";

export function buildEngawaPlan(
  inspectReport: InspectReport,
  inspectionSource: InspectionSource,
  inspectReportSha256: string,
  repoRoot: string,
  scan: RepoScanResult,
): EngawaPlan {
  const repoName = basename(repoRoot);
  const metadata = extractRepoMetadata(repoName, scan.fileContents, scan.filePaths);
  const displayName = deriveRepoName(repoRoot, metadata);
  const framework = detectFramework(metadata, scan.filePaths);
  const dependencyHints = classifyDependencies({
    ...metadata.dependencies,
    ...metadata.devDependencies,
  });
  const frameworkEvidence = [
    ...framework.evidence,
    ...dependencyHints.map((h) => h.evidence),
  ].sort();
  const existingEngawa = detectExistingEngawa(metadata, scan.fileContents, scan.filePaths);
  const appRoutes = framework.nextjsAppRouter ? discoverAppRouterRoutes(scan.filePaths) : [];
  const pagesRoutes = framework.nextjsPagesRouter ? discoverPagesRouterRoutes(scan.filePaths) : [];

  const routeMappings = buildRouteMappings({
    inspectReport,
    framework,
    appRoutes,
    pagesRoutes,
    scan,
  });

  const publicSourceUnclearRoutes = collectPublicSourceUnclearRoutes(routeMappings);
  const candidateRoutes = inspectReport.routes.filter((r) => !r.sensitivePathHint);
  const integration = buildIntegrationSection(inspectReport, existingEngawa);
  const nodeEval = evaluateNodeCompatibility(metadata.enginesNode);

  const securityEvidence = collectSecurityEvidence(scan.filePaths, scan.fileContents, {
    ...metadata.dependencies,
    ...metadata.devDependencies,
  });

  const review = buildReviewSection(publicSourceUnclearRoutes, metadata, integration.disposition);

  const plan: EngawaPlan = {
    schemaVersion: PLAN_SCHEMA_VERSION,
    planStatus: determinePlanStatus(publicSourceUnclearRoutes, candidateRoutes.length),
    input: {
      inspectionSource,
      inspectSchemaVersion: inspectReport.schemaVersion,
      inspectReportSha256,
    },
    target: {
      url: inspectReport.target.finalUrl,
      origin: inspectReport.target.origin,
    },
    repository: {
      name: displayName,
      packageName: metadata.packageName,
      framework: {
        id: framework.id,
        nextjsAppRouter: framework.nextjsAppRouter,
        nextjsPagesRouter: framework.nextjsPagesRouter,
        evidence: frameworkEvidence,
      },
      node: {
        enginesNode: metadata.enginesNode,
        node24Required: nodeEval.node24Required,
        nodeVersionStatus: nodeEval.nodeVersionStatus,
      },
      packageManager: {
        detected: metadata.packageManager,
        lockfiles: metadata.lockfiles,
      },
      scan: {
        filesSeen: scan.filesSeen,
        filesAnalyzed: scan.filesAnalyzed,
        filesSkipped: scan.filesSkipped,
        scanTruncated: scan.scanTruncated,
      },
      existingEngawa,
    },
    publicRoutes: inspectReport.routes.map((r) => ({
      path: r.path,
      sources: [...r.sources].sort(),
      engawaCandidate: r.engawaCandidate,
      humanReviewRequired: true,
      sensitivePathHint: r.sensitivePathHint,
      reason: r.reason,
    })),
    routeMappings,
    securityEvidence,
    integration,
    review,
  };

  return engawaPlanSchema.parse(plan) as EngawaPlan;
}

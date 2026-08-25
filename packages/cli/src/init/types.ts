export const PLAN_SCHEMA_VERSION = "engawa.plan.v1";
export const BUNDLE_SCHEMA_VERSION = "engawa.init.bundle.v1";

export const TESTED_RELEASE_SET = "2026-08-v0.1.1";

export const MAX_REPO_FILES = 10000;
export const MAX_ANALYZED_TEXT_FILES = 1500;
export const MAX_TEXT_FILE_BYTES = 512 * 1024;
export const LOCAL_IMPORT_DEPTH = 2;
export const MAX_INSPECT_REPORT_BYTES = 10 * 1024 * 1024;

export const DEFAULT_OUTPUT_DIR = ".engawa";

export const ENGawa_PACKAGES = [
  "@thierry-gilgen-ict/engawa-core",
  "@thierry-gilgen-ict/engawa-discovery",
  "@thierry-gilgen-ict/engawa-mcp",
  "@thierry-gilgen-ict/engawa-react",
  "@thierry-gilgen-ict/engawa-map",
] as const;

export const TESTED_PACKAGE_VERSIONS: Record<string, string> = {
  "@thierry-gilgen-ict/engawa-core": "0.1.1",
  "@thierry-gilgen-ict/engawa-discovery": "0.1.1",
  "@thierry-gilgen-ict/engawa-mcp": "0.1.1",
  "@thierry-gilgen-ict/engawa-react": "0.1.0",
};

export type InspectionSource = "LIVE_URL" | "SAVED_REPORT";

export type FrameworkId =
  | "nextjs"
  | "astro"
  | "nuxt"
  | "sveltekit"
  | "remix"
  | "vite-react"
  | "generic-node"
  | "static"
  | "unknown";

export type SourceCandidateKind =
  | "STATIC_MODULE"
  | "MARKDOWN"
  | "MDX"
  | "FILESYSTEM"
  | "HEADLESS_CMS"
  | "DATABASE_ORM"
  | "HTTP_API"
  | "UNKNOWN";

export type SourceStatus =
  | "CANDIDATES_FOUND"
  | "ROUTE_MODULE_FOUND_SOURCE_UNCLEAR"
  | "NO_REPOSITORY_ROUTE_MATCH"
  | "EXCLUDED_SENSITIVE";

export type IntegrationDisposition =
  | "NEW_INTEGRATION"
  | "PARTIAL_EXISTING_INTEGRATION"
  | "EXISTING_INTEGRATION_DETECTED";

export type ExistingEngawaStatus =
  | "NOT_INSTALLED"
  | "PARTIAL"
  | "TESTED_SET"
  | "VERSION_MISMATCH_REVIEW_REQUIRED";

export type SecurityEvidenceStatus = "EVIDENCE_FOUND" | "NOT_OBSERVED" | "REVIEW_REQUIRED";

export type PlanStatus = "REVIEW_REQUIRED" | "PLAN_READY_FOR_AGENT_REVIEW";

export interface InitOptions {
  url?: string;
  inspectReportPath?: string;
  repoPath: string;
  outputDir: string;
  dryRun: boolean;
  json: boolean;
  force: boolean;
  maxPages: number;
  timeoutMs: number;
  allowLocal: boolean;
}

export interface RepoScanResult {
  filesSeen: number;
  filesAnalyzed: number;
  filesSkipped: Array<{ path: string; reason: string }>;
  scanTruncated: boolean;
  filePaths: string[];
  fileContents: Map<string, string>;
}

export interface NextjsRoute {
  publicPath: string;
  modulePath: string;
  router: "app" | "pages";
  evidence: string[];
}

export interface RepoMetadata {
  name: string;
  packageJsonPresent: boolean;
  packageName?: string;
  enginesNode?: string;
  packageManager?: string;
  lockfiles: string[];
  workspaceHints: string[];
  typescriptPresent: boolean;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface FrameworkInfo {
  id: FrameworkId;
  nextjsAppRouter: boolean;
  nextjsPagesRouter: boolean;
  evidence: string[];
}

export interface ExistingEngawaInfo {
  status: ExistingEngawaStatus;
  packages: Array<{ name: string; version: string }>;
  surfaceHints: string[];
}

export interface SecurityEvidence {
  middleware: SecurityEvidenceStatus;
  nextConfig: SecurityEvidenceStatus;
  rateLimiter: SecurityEvidenceStatus;
  authMiddleware: SecurityEvidenceStatus;
  headersConfig: SecurityEvidenceStatus;
  canonicalHost: SecurityEvidenceStatus;
  evidence: string[];
}

export interface EngawaPlan {
  schemaVersion: typeof PLAN_SCHEMA_VERSION;
  planStatus: PlanStatus;
  input: {
    inspectionSource: InspectionSource;
    inspectSchemaVersion: string;
    inspectReportSha256: string;
  };
  target: {
    url: string;
    origin: string;
  };
  repository: {
    name: string;
    packageName?: string;
    framework: FrameworkInfo;
    node: {
      enginesNode?: string;
      node24Required: boolean;
      nodeVersionStatus: "COMPATIBLE" | "INCOMPATIBLE" | "UNKNOWN";
    };
    packageManager: {
      detected?: string;
      lockfiles: string[];
    };
    scan: {
      filesSeen: number;
      filesAnalyzed: number;
      filesSkipped: Array<{ path: string; reason: string }>;
      scanTruncated: boolean;
    };
    existingEngawa: ExistingEngawaInfo;
  };
  publicRoutes: Array<{
    path: string;
    sources: string[];
    engawaCandidate: boolean;
    humanReviewRequired: true;
    sensitivePathHint: boolean;
    reason?: string;
  }>;
  routeMappings: Array<{
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
      kind: SourceCandidateKind;
      confidence: "low" | "medium" | "high";
      evidence: string[];
    }>;
    sourceStatus: SourceStatus;
  }>;
  securityEvidence: SecurityEvidence;
  integration: {
    disposition: IntegrationDisposition;
    testedReleaseSet: string;
    recommendedPackages: Array<{ name: string; version: string; required: boolean }>;
    requiredSurfaces: string[];
    optionalSurfaces: string[];
  };
  review: {
    humanReviewRequired: true;
    publicSourceUnclearRoutes: string[];
    questions: string[];
    blockers: string[];
  };
}

export interface InitBundleManifest {
  schemaVersion: typeof BUNDLE_SCHEMA_VERSION;
  generatedFiles: string[];
}

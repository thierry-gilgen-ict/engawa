export const DOCTOR_SCHEMA_VERSION = "engawa.doctor.v1" as const;

export const USER_AGENT = "Engawa-Doctor/0.1";

export const DEFAULT_PROFILE = "full" as const;
export const DEFAULT_MAX_PAGES = 10;
export const HARD_MAX_PAGES = 50;
export const DEFAULT_MAX_RESOURCES = 100;
export const HARD_MAX_RESOURCES = 500;
export const DEFAULT_MAX_READS = 5;
export const HARD_MAX_READS = 20;
export const DEFAULT_TIMEOUT_MS = 8000;
export const DEFAULT_RATE_LIMIT_PROBE = 0;
export const HARD_RATE_LIMIT_PROBE = 20;
export const MAX_MARKDOWN_SAMPLES = 5;
export const MAX_BODY_BYTES = 2 * 1024 * 1024;
export const MAX_PLAN_BYTES = 2 * 1024 * 1024;
export const MAX_EVIDENCE_TEXT = 200;
export const GENERIC_SEARCH_QUERY = "engawa";
export const INVALID_HOST_HEADER = "engawa-invalid.example";
export const INVALID_ORIGIN = "https://engawa-invalid.example";

export type DoctorProfile = "full" | "discovery";

export type CheckStatus = "PASS" | "FAIL" | "NOT_REQUIRED" | "NOT_PROVIDED" | "WARN" | "SKIPPED";

export type SummaryStatus = "PASS" | "PASS_WITH_WARNINGS" | "FAIL";

export type HostValidation =
  | "REJECTED_INVALID_HOST"
  | "ACCEPTED_INVALID_HOST"
  | "UNKNOWN"
  | "NOT_APPLICABLE";

export type OriginValidation =
  | "REJECTED_UNTRUSTED_ORIGIN"
  | "BROWSER_ORIGIN_NOT_EXPOSED"
  | "ACCEPTED_UNTRUSTED_ORIGIN"
  | "UNKNOWN"
  | "NOT_APPLICABLE";

export type RateLimitObservation =
  | "OBSERVED"
  | "NOT_OBSERVED_WITHIN_SAFE_BUDGET"
  | "NOT_PROBED"
  | "UNKNOWN";

export type HumanPublicSourceParity = "NOT_PROVABLE_FROM_LIVE_INTERFACE";

export interface DoctorOptions {
  inputUrl: string;
  profile: DoctorProfile;
  planPath?: string;
  mcpUrl?: string;
  query?: string;
  denyTerms: string[];
  maxPages: number;
  maxResources: number;
  maxReads: number;
  timeoutMs: number;
  rateLimitProbe: number;
  strict: boolean;
  allowLocal: boolean;
  json: boolean;
  outputPath?: string;
}

export interface MarkdownSampleResult {
  url: string;
  status: number;
  contentType: string;
  byteLength: number;
  contentSha256?: string;
  result: "PASS" | "FAIL";
  reason?: string;
}

export interface ResourceMeta {
  uri: string;
  name?: string;
  mimeType?: string;
}

export interface ResourceReadResult {
  uri: string;
  mimeType?: string;
  byteLength: number;
  contentSha256: string;
  result: "PASS" | "FAIL";
  reason?: string;
}

export interface DenyTermEvidence {
  id: string;
  sha256: string;
  found: boolean;
}

export interface EngawaDoctorReport {
  schemaVersion: typeof DOCTOR_SCHEMA_VERSION;
  profile: DoctorProfile;
  target: {
    inputUrl: string;
    finalUrl: string;
    origin: string;
  };
  discovery: {
    inspectSchemaVersion: string;
    llmsAdvertised: boolean;
    markdownAdvertised: boolean;
    mcpAdvertised: boolean;
    publicRouteCount: number;
    candidateRouteCount: number;
    sensitiveRouteCount: number;
  };
  llmsTxt: {
    status: CheckStatus;
    httpStatus?: number;
    contentType?: string;
    byteLength?: number;
    canonicalSiteReference: CheckStatus;
    mcpAdvertisement: CheckStatus;
    markdownAdvertisement: CheckStatus;
  };
  markdown: {
    status: CheckStatus;
    discoveredCount: number;
    sampledCount: number;
    samples: MarkdownSampleResult[];
  };
  mcp: {
    status: CheckStatus;
    endpoint?: string;
    endpointSource?: "explicit" | "advertised" | "none";
    connect: CheckStatus;
    resourcesList: CheckStatus;
    resourceCount?: number;
    resourceLimitExceeded: boolean;
    resources: ResourceMeta[];
    resourcesRead: CheckStatus;
    readSamples: ResourceReadResult[];
    toolsList: CheckStatus;
    toolNames: string[];
    publicTools: CheckStatus;
    extraTools: string[];
    searchSite: CheckStatus;
    searchEmptyQueryRejected: CheckStatus;
    knownQuery: CheckStatus;
    knownQueryResultCount?: number;
  };
  security: {
    hostValidation: HostValidation;
    originValidation: OriginValidation;
    rateLimit: RateLimitObservation;
  };
  planComparison: {
    status: CheckStatus;
    candidateRouteCount?: number;
    sensitiveRouteCount?: number;
    disposition?: string;
    notes: string[];
  };
  denyTerms: {
    checked: boolean;
    results: DenyTermEvidence[];
    status: CheckStatus;
  };
  sourceParity: {
    humanPublicSourceParity: HumanPublicSourceParity;
  };
  summary: {
    status: SummaryStatus;
    warnings: string[];
    failures: string[];
  };
}

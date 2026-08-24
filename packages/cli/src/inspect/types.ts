export const SCHEMA_VERSION = "engawa.inspect.v1";

export const USER_AGENT = "Engawa-Inspector/0.1";
export const DEFAULT_MAX_PAGES = 25;
export const HARD_MAX_PAGES = 100;
export const DEFAULT_TIMEOUT_MS = 8000;
export const MAX_BODY_BYTES = 2 * 1024 * 1024;
export const MAX_REDIRECTS = 5;
export const MAX_CONCURRENCY = 3;
export const MAX_MARKDOWN_SAMPLES = 5;

export type Confidence = "low" | "medium" | "high";

export type AgentOnboardingStatus = "FOUND" | "NOT_FOUND";

export type EngawaIntegrationRecommendation =
  | "RECOMMENDED"
  | "OPTIONAL"
  | "ALREADY_HAS_AGENT_SURFACES";

export interface FrameworkHint {
  name: string;
  confidence: Confidence;
  evidence: string[];
}

export interface RouteEntry {
  path: string;
  sources: string[];
  engawaCandidate: boolean;
  humanReviewRequired: true;
  sensitivePathHint: boolean;
  reason?: string;
}

export interface ScoreCategory {
  id: string;
  pointsEarned: number;
  pointsAvailable: number;
  evidence: string[];
  reason?: string;
}

export interface InspectReport {
  schemaVersion: typeof SCHEMA_VERSION;
  target: {
    inputUrl: string;
    finalUrl: string;
    origin: string;
  };
  crawl: {
    maxPages: number;
    pagesFetched: number;
    pagesDiscovered: number;
    timeoutMs: number;
    maxBodyBytes: number;
    redirectLimit: number;
    sameOriginOnly: true;
    allowLocal: boolean;
    errors: string[];
  };
  site: {
    title?: string;
    htmlLang?: string;
    canonicalUrl?: string;
    metaDescription?: string;
    generator?: string;
  };
  frameworkHints: FrameworkHint[];
  locales: string[];
  agentSurfaces: {
    llmsTxt: {
      exists: boolean;
      status?: number;
      contentType?: string;
      urls: string[];
      mcpReferenced: boolean;
      markdownReferenced: boolean;
    };
    markdown: {
      alternatesFound: number;
      resourcesVerified: number;
      samplePaths: string[];
    };
    mcp: {
      advertised: boolean;
      protocolVerified: false;
      evidence: string[];
    };
    agentOnboarding: {
      status: AgentOnboardingStatus;
      evidence: string[];
    };
  };
  routes: RouteEntry[];
  score: {
    total: number;
    maxTotal: number;
    categories: ScoreCategory[];
  };
  securityAssessment: "NOT_PERFORMED";
  recommendation: {
    engawaIntegration: EngawaIntegrationRecommendation;
    plannedNextStep: string;
  };
}

export interface InspectOptions {
  inputUrl: string;
  maxPages: number;
  timeoutMs: number;
  allowLocal: boolean;
}

export interface PageFetchResult {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  body: string;
  headers: Record<string, string>;
  tooLarge?: boolean;
}

export interface ParsedHtml {
  title?: string;
  htmlLang?: string;
  canonicalUrl?: string;
  metaDescription?: string;
  generator?: string;
  links: string[];
  markdownAlternates: string[];
  hreflang: string[];
}

import { z } from "zod";
import { SCHEMA_VERSION } from "./types.js";

const frameworkHintSchema = z.object({
  name: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  evidence: z.array(z.string()),
});

const routeEntrySchema = z.object({
  path: z.string(),
  sources: z.array(z.string()),
  engawaCandidate: z.boolean(),
  humanReviewRequired: z.literal(true),
  sensitivePathHint: z.boolean(),
  reason: z.string().optional(),
});

const scoreCategorySchema = z.object({
  id: z.string(),
  pointsEarned: z.number(),
  pointsAvailable: z.number(),
  evidence: z.array(z.string()),
  reason: z.string().optional(),
});

export const inspectReportSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  target: z.object({
    inputUrl: z.string(),
    finalUrl: z.string(),
    origin: z.string(),
  }),
  crawl: z.object({
    maxPages: z.number(),
    pagesFetched: z.number(),
    pagesDiscovered: z.number(),
    timeoutMs: z.number(),
    maxBodyBytes: z.number(),
    redirectLimit: z.number(),
    sameOriginOnly: z.literal(true),
    allowLocal: z.boolean(),
    errors: z.array(z.string()),
  }),
  site: z.object({
    title: z.string().optional(),
    htmlLang: z.string().optional(),
    canonicalUrl: z.string().optional(),
    metaDescription: z.string().optional(),
    generator: z.string().optional(),
  }),
  frameworkHints: z.array(frameworkHintSchema),
  locales: z.array(z.string()),
  agentSurfaces: z.object({
    llmsTxt: z.object({
      exists: z.boolean(),
      status: z.number().optional(),
      contentType: z.string().optional(),
      urls: z.array(z.string()),
      mcpReferenced: z.boolean(),
      markdownReferenced: z.boolean(),
    }),
    markdown: z.object({
      alternatesFound: z.number(),
      resourcesVerified: z.number(),
      samplePaths: z.array(z.string()),
    }),
    mcp: z.object({
      advertised: z.boolean(),
      protocolVerified: z.literal(false),
      evidence: z.array(z.string()),
    }),
    agentOnboarding: z.object({
      status: z.enum(["FOUND", "NOT_FOUND"]),
      evidence: z.array(z.string()),
    }),
  }),
  routes: z.array(routeEntrySchema),
  score: z.object({
    total: z.number(),
    maxTotal: z.number(),
    categories: z.array(scoreCategorySchema),
  }),
  securityAssessment: z.literal("NOT_PERFORMED"),
  recommendation: z.object({
    engawaIntegration: z.enum(["RECOMMENDED", "OPTIONAL", "ALREADY_HAS_AGENT_SURFACES"]),
    plannedNextStep: z.string(),
  }),
});

import { z } from "zod";
import { DOCTOR_SCHEMA_VERSION } from "./types.js";

const checkStatusSchema = z.enum([
  "PASS",
  "FAIL",
  "NOT_REQUIRED",
  "NOT_PROVIDED",
  "WARN",
  "SKIPPED",
]);

const markdownSampleSchema = z.object({
  url: z.string(),
  status: z.number(),
  contentType: z.string(),
  byteLength: z.number(),
  contentSha256: z.string().optional(),
  result: z.enum(["PASS", "FAIL"]),
  reason: z.string().optional(),
});

const resourceMetaSchema = z.object({
  uri: z.string(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
});

const resourceReadSchema = z.object({
  uri: z.string(),
  mimeType: z.string().optional(),
  byteLength: z.number(),
  contentSha256: z.string(),
  result: z.enum(["PASS", "FAIL"]),
  reason: z.string().optional(),
});

const denyTermSchema = z.object({
  id: z.string(),
  sha256: z.string(),
  found: z.boolean(),
});

export const engawaDoctorSchema = z.object({
  schemaVersion: z.literal(DOCTOR_SCHEMA_VERSION),
  profile: z.enum(["full", "discovery"]),
  target: z.object({
    inputUrl: z.string(),
    finalUrl: z.string(),
    origin: z.string(),
  }),
  discovery: z.object({
    inspectSchemaVersion: z.string(),
    llmsAdvertised: z.boolean(),
    markdownAdvertised: z.boolean(),
    mcpAdvertised: z.boolean(),
    publicRouteCount: z.number(),
    candidateRouteCount: z.number(),
    sensitiveRouteCount: z.number(),
  }),
  llmsTxt: z.object({
    status: checkStatusSchema,
    httpStatus: z.number().optional(),
    contentType: z.string().optional(),
    byteLength: z.number().optional(),
    canonicalSiteReference: checkStatusSchema,
    mcpAdvertisement: checkStatusSchema,
    markdownAdvertisement: checkStatusSchema,
  }),
  markdown: z.object({
    status: checkStatusSchema,
    discoveredCount: z.number(),
    sampledCount: z.number(),
    samples: z.array(markdownSampleSchema),
  }),
  mcp: z.object({
    status: checkStatusSchema,
    endpoint: z.string().optional(),
    endpointSource: z.enum(["explicit", "advertised", "none"]).optional(),
    connect: checkStatusSchema,
    resourcesList: checkStatusSchema,
    resourceCount: z.number().optional(),
    resourceLimitExceeded: z.boolean(),
    resources: z.array(resourceMetaSchema),
    resourcesRead: checkStatusSchema,
    readSamples: z.array(resourceReadSchema),
    toolsList: checkStatusSchema,
    toolNames: z.array(z.string()),
    publicTools: checkStatusSchema,
    extraTools: z.array(z.string()),
    searchSite: checkStatusSchema,
    searchEmptyQueryRejected: checkStatusSchema,
    knownQuery: checkStatusSchema,
    knownQueryResultCount: z.number().optional(),
  }),
  security: z.object({
    hostValidation: z.enum([
      "REJECTED_INVALID_HOST",
      "ACCEPTED_INVALID_HOST",
      "UNKNOWN",
      "NOT_APPLICABLE",
    ]),
    originValidation: z.enum([
      "REJECTED_UNTRUSTED_ORIGIN",
      "BROWSER_ORIGIN_NOT_EXPOSED",
      "ACCEPTED_UNTRUSTED_ORIGIN",
      "UNKNOWN",
      "NOT_APPLICABLE",
    ]),
    rateLimit: z.enum(["OBSERVED", "NOT_OBSERVED_WITHIN_SAFE_BUDGET", "NOT_PROBED", "UNKNOWN"]),
  }),
  planComparison: z.object({
    status: checkStatusSchema,
    candidateRouteCount: z.number().optional(),
    sensitiveRouteCount: z.number().optional(),
    disposition: z.string().optional(),
    notes: z.array(z.string()),
  }),
  denyTerms: z.object({
    checked: z.boolean(),
    results: z.array(denyTermSchema),
    status: checkStatusSchema,
  }),
  sourceParity: z.object({
    humanPublicSourceParity: z.literal("NOT_PROVABLE_FROM_LIVE_INTERFACE"),
  }),
  summary: z.object({
    status: z.enum(["PASS", "PASS_WITH_WARNINGS", "FAIL"]),
    warnings: z.array(z.string()),
    failures: z.array(z.string()),
  }),
});

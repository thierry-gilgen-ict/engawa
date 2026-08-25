import { z } from "zod";
import { BUNDLE_SCHEMA_VERSION, PLAN_SCHEMA_VERSION } from "./types.js";

const confidenceSchema = z.enum(["low", "medium", "high"]);

const sourceCandidateKindSchema = z.enum([
  "STATIC_MODULE",
  "MARKDOWN",
  "MDX",
  "FILESYSTEM",
  "HEADLESS_CMS",
  "DATABASE_ORM",
  "HTTP_API",
  "UNKNOWN",
]);

const sourceStatusSchema = z.enum([
  "CANDIDATES_FOUND",
  "ROUTE_MODULE_FOUND_SOURCE_UNCLEAR",
  "NO_REPOSITORY_ROUTE_MATCH",
  "EXCLUDED_SENSITIVE",
]);

const frameworkIdSchema = z.enum([
  "nextjs",
  "astro",
  "nuxt",
  "sveltekit",
  "remix",
  "vite-react",
  "generic-node",
  "static",
  "unknown",
]);

const securityEvidenceStatusSchema = z.enum(["EVIDENCE_FOUND", "NOT_OBSERVED", "REVIEW_REQUIRED"]);

export const engawaPlanSchema = z.object({
  schemaVersion: z.literal(PLAN_SCHEMA_VERSION),
  planStatus: z.enum(["REVIEW_REQUIRED", "PLAN_READY_FOR_AGENT_REVIEW"]),
  input: z.object({
    inspectionSource: z.enum(["LIVE_URL", "SAVED_REPORT"]),
    inspectSchemaVersion: z.string(),
    inspectReportSha256: z.string(),
  }),
  target: z.object({
    url: z.string(),
    origin: z.string(),
  }),
  repository: z.object({
    name: z.string(),
    packageName: z.string().optional(),
    framework: z.object({
      id: frameworkIdSchema,
      nextjsAppRouter: z.boolean(),
      nextjsPagesRouter: z.boolean(),
      evidence: z.array(z.string()),
    }),
    node: z.object({
      enginesNode: z.string().optional(),
      node24Required: z.boolean(),
      nodeVersionStatus: z.enum(["COMPATIBLE", "INCOMPATIBLE", "UNKNOWN"]),
    }),
    packageManager: z.object({
      detected: z.string().optional(),
      lockfiles: z.array(z.string()),
    }),
    scan: z.object({
      filesSeen: z.number(),
      filesAnalyzed: z.number(),
      filesSkipped: z.array(z.object({ path: z.string(), reason: z.string() })),
      scanTruncated: z.boolean(),
    }),
    existingEngawa: z.object({
      status: z.enum([
        "NOT_INSTALLED",
        "PARTIAL",
        "TESTED_SET",
        "VERSION_MISMATCH_REVIEW_REQUIRED",
      ]),
      packages: z.array(z.object({ name: z.string(), version: z.string() })),
      surfaceHints: z.array(z.string()),
    }),
  }),
  publicRoutes: z.array(
    z.object({
      path: z.string(),
      sources: z.array(z.string()),
      engawaCandidate: z.boolean(),
      humanReviewRequired: z.literal(true),
      sensitivePathHint: z.boolean(),
      reason: z.string().optional(),
    }),
  ),
  routeMappings: z.array(
    z.object({
      publicPath: z.string(),
      inspectionEvidence: z.array(z.string()),
      engawaCandidate: z.boolean(),
      humanReviewRequired: z.literal(true),
      repositoryRouteCandidates: z.array(
        z.object({
          path: z.string(),
          confidence: confidenceSchema,
          evidence: z.array(z.string()),
        }),
      ),
      sourceCandidates: z.array(
        z.object({
          path: z.string(),
          kind: sourceCandidateKindSchema,
          confidence: confidenceSchema,
          evidence: z.array(z.string()),
        }),
      ),
      sourceStatus: sourceStatusSchema,
    }),
  ),
  securityEvidence: z.object({
    middleware: securityEvidenceStatusSchema,
    nextConfig: securityEvidenceStatusSchema,
    rateLimiter: securityEvidenceStatusSchema,
    authMiddleware: securityEvidenceStatusSchema,
    headersConfig: securityEvidenceStatusSchema,
    canonicalHost: securityEvidenceStatusSchema,
    evidence: z.array(z.string()),
  }),
  integration: z.object({
    disposition: z.enum([
      "NEW_INTEGRATION",
      "PARTIAL_EXISTING_INTEGRATION",
      "EXISTING_INTEGRATION_DETECTED",
    ]),
    testedReleaseSet: z.string(),
    recommendedPackages: z.array(
      z.object({
        name: z.string(),
        version: z.string(),
        required: z.boolean(),
      }),
    ),
    requiredSurfaces: z.array(z.string()),
    optionalSurfaces: z.array(z.string()),
  }),
  review: z.object({
    humanReviewRequired: z.literal(true),
    publicSourceUnclearRoutes: z.array(z.string()),
    questions: z.array(z.string()),
    blockers: z.array(z.string()),
  }),
});

export const initBundleManifestSchema = z.object({
  schemaVersion: z.literal(BUNDLE_SCHEMA_VERSION),
  generatedFiles: z.array(z.string()),
});

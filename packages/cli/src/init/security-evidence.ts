import type { SecurityEvidence, SecurityEvidenceStatus } from "./types.js";

const RATE_LIMIT_PACKAGES = ["express-rate-limit", "rate-limiter-flexible", "@upstash/ratelimit"];
const AUTH_PACKAGES = ["next-auth", "@auth/core", "passport", "jsonwebtoken", "@clerk/nextjs"];

export function collectSecurityEvidence(
  filePaths: string[],
  fileContents: Map<string, string>,
  dependencies: Record<string, string>,
): SecurityEvidence {
  const evidence: string[] = [];
  let middleware: SecurityEvidenceStatus = "NOT_OBSERVED";
  let nextConfig: SecurityEvidenceStatus = "NOT_OBSERVED";
  let rateLimiter: SecurityEvidenceStatus = "NOT_OBSERVED";
  let authMiddleware: SecurityEvidenceStatus = "NOT_OBSERVED";
  let headersConfig: SecurityEvidenceStatus = "NOT_OBSERVED";
  let canonicalHost: SecurityEvidenceStatus = "NOT_OBSERVED";

  const middlewarePaths = filePaths.filter(
    (p) => p === "middleware.ts" || p === "middleware.js" || p.endsWith("/middleware.ts"),
  );
  if (middlewarePaths.length > 0) {
    middleware = "EVIDENCE_FOUND";
    evidence.push(`middleware-file:${middlewarePaths.join(",")}`);
  }

  const nextConfigPaths = filePaths.filter((p) => p.startsWith("next.config"));
  if (nextConfigPaths.length > 0) {
    nextConfig = "EVIDENCE_FOUND";
    evidence.push(`next-config:${nextConfigPaths.join(",")}`);
    for (const path of nextConfigPaths) {
      const content = fileContents.get(path) ?? "";
      if (/headers\s*[(:]/i.test(content)) {
        headersConfig = "EVIDENCE_FOUND";
        evidence.push(`headers-in-next-config:${path}`);
      }
      if (/redirects|canonical|host/i.test(content)) {
        canonicalHost = "REVIEW_REQUIRED";
        evidence.push(`host-canonical-hint:${path}`);
      }
    }
  }

  const allDeps = dependencies;
  for (const pkg of RATE_LIMIT_PACKAGES) {
    if (allDeps[pkg]) {
      rateLimiter = "EVIDENCE_FOUND";
      evidence.push(`package-dependency:${pkg}`);
    }
  }
  for (const pkg of AUTH_PACKAGES) {
    if (allDeps[pkg]) {
      authMiddleware = "EVIDENCE_FOUND";
      evidence.push(`package-dependency:${pkg}`);
    }
  }

  for (const [path, content] of fileContents) {
    if (/rateLimit|rate-limit|ratelimit/i.test(content)) {
      rateLimiter = "EVIDENCE_FOUND";
      evidence.push(`code-hint:rate-limit:${path}`);
    }
    if (/validateHost|canonicalHost|allowedHosts|origin.*valid/i.test(content)) {
      canonicalHost = "REVIEW_REQUIRED";
      evidence.push(`code-hint:host-validation:${path}`);
    }
  }

  evidence.sort();

  return {
    middleware,
    nextConfig,
    rateLimiter,
    authMiddleware,
    headersConfig,
    canonicalHost,
    evidence,
  };
}

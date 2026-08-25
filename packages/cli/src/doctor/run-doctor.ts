import { runInspect } from "../inspect/run-inspect.js";
import type { FetchTargetPolicy } from "../inspect/url.js";
import { isMcpUrl } from "../inspect/mcp.js";
import { scanDenyTerms } from "./deny-terms.js";
import { stableSortStrings } from "./helpers.js";
import { verifyLlmsTxt } from "./llms-verify.js";
import { verifyMarkdown } from "./markdown-verify.js";
import { resolveMcpEndpoint } from "./mcp-endpoint.js";
import { verifyMcp } from "./mcp-verify.js";
import { comparePlan } from "./plan-compare.js";
import { engawaDoctorSchema } from "./schema.js";
import { probeHostValidation, probeOriginValidation, probeRateLimit } from "./security-probes.js";
import {
  DOCTOR_SCHEMA_VERSION,
  type DoctorOptions,
  type EngawaDoctorReport,
  type SummaryStatus,
} from "./types.js";

function collectMarkdownCandidates(
  inspectUrls: string[],
  samplePaths: string[],
  origin: string,
  llmsUrls: string[],
): string[] {
  const all = [...inspectUrls, ...llmsUrls, ...samplePaths.map((p) => new URL(p, origin).href)];
  return stableSortStrings([
    ...new Set(
      all.filter((u) => {
        try {
          const parsed = new URL(u);
          return parsed.origin === origin && parsed.pathname.toLowerCase().endsWith(".md");
        } catch {
          return false;
        }
      }),
    ),
  ]);
}

function summarize(options: {
  failures: string[];
  warnings: string[];
  strict: boolean;
  hostValidation: EngawaDoctorReport["security"]["hostValidation"];
  originValidation: EngawaDoctorReport["security"]["originValidation"];
  rateLimit: EngawaDoctorReport["security"]["rateLimit"];
  mcpPresent: boolean;
}): { status: SummaryStatus; warnings: string[]; failures: string[] } {
  const failures = [...options.failures];
  const warnings = [...options.warnings];

  const unresolvedSecurity: string[] = [];
  if (options.hostValidation === "UNKNOWN" || options.hostValidation === "ACCEPTED_INVALID_HOST") {
    unresolvedSecurity.push(`Host validation: ${options.hostValidation}`);
  }
  if (options.mcpPresent) {
    if (
      options.originValidation === "UNKNOWN" ||
      options.originValidation === "ACCEPTED_UNTRUSTED_ORIGIN"
    ) {
      unresolvedSecurity.push(`Origin validation: ${options.originValidation}`);
    }
  }
  if (
    options.rateLimit === "NOT_PROBED" ||
    options.rateLimit === "NOT_OBSERVED_WITHIN_SAFE_BUDGET" ||
    options.rateLimit === "UNKNOWN"
  ) {
    unresolvedSecurity.push(`Rate limit: ${options.rateLimit}`);
  }

  for (const item of unresolvedSecurity) {
    if (!warnings.includes(item) && !failures.includes(item)) {
      warnings.push(item);
    }
  }

  if (options.hostValidation === "ACCEPTED_INVALID_HOST") {
    failures.push("Host validation accepted invalid Host header");
  }
  if (options.originValidation === "ACCEPTED_UNTRUSTED_ORIGIN") {
    failures.push("Origin validation accepted untrusted browser Origin");
  }

  if (options.strict) {
    for (const item of unresolvedSecurity) {
      if (
        item.includes("BROWSER_ORIGIN_NOT_EXPOSED") ||
        item.includes("REJECTED_UNTRUSTED_ORIGIN") ||
        item.includes("REJECTED_INVALID_HOST")
      ) {
        continue;
      }
      if (!failures.includes(item)) {
        failures.push(`strict: unresolved security evidence — ${item}`);
      }
    }
  }

  const uniqueFailures = stableSortStrings([...new Set(failures)]);
  const uniqueWarnings = stableSortStrings(
    [...new Set(warnings)].filter((w) => !uniqueFailures.includes(w)),
  );

  let status: SummaryStatus;
  if (uniqueFailures.length > 0) status = "FAIL";
  else if (uniqueWarnings.length > 0) status = "PASS_WITH_WARNINGS";
  else status = "PASS";

  return { status, warnings: uniqueWarnings, failures: uniqueFailures };
}

export async function runDoctor(options: DoctorOptions): Promise<EngawaDoctorReport> {
  const inspect = await runInspect({
    inputUrl: options.inputUrl,
    maxPages: options.maxPages,
    timeoutMs: options.timeoutMs,
    allowLocal: options.allowLocal,
  });

  const origin = inspect.target.origin;
  const policy: FetchTargetPolicy = {
    allowLocal: options.allowLocal,
    lockOrigin: origin,
  };

  const failures: string[] = [];
  const warnings: string[] = [];

  const markdownCandidates = collectMarkdownCandidates(
    inspect.agentSurfaces.llmsTxt.urls,
    inspect.agentSurfaces.markdown.samplePaths,
    origin,
    inspect.agentSurfaces.llmsTxt.urls,
  );

  const llms = await verifyLlmsTxt({
    origin,
    canonicalUrl: inspect.site.canonicalUrl ?? inspect.target.finalUrl,
    finalUrl: inspect.target.finalUrl,
    profile: options.profile,
    timeoutMs: options.timeoutMs,
    policy,
    markdownDiscoveredElsewhere:
      markdownCandidates.length > 0 || inspect.agentSurfaces.markdown.alternatesFound > 0,
  });
  failures.push(...llms.failures);

  const markdown = await verifyMarkdown({
    origin,
    candidateUrls: collectMarkdownCandidates(
      inspect.agentSurfaces.llmsTxt.urls,
      inspect.agentSurfaces.markdown.samplePaths,
      origin,
      llms.urls,
    ),
    timeoutMs: options.timeoutMs,
    policy,
  });
  failures.push(...markdown.failures);

  const advertisedForMcp = [
    ...inspect.agentSurfaces.llmsTxt.urls,
    ...llms.urls,
    ...inspect.agentSurfaces.mcp.evidence.filter((e) => {
      try {
        return isMcpUrl(e) || new URL(e).pathname.includes("mcp");
      } catch {
        return false;
      }
    }),
  ];

  const endpoint = resolveMcpEndpoint({
    origin,
    profile: options.profile,
    explicitMcpUrl: options.mcpUrl,
    advertisedUrls: advertisedForMcp,
    mcpReferenced: llms.mcpReferenced || inspect.agentSurfaces.mcp.advertised,
  });
  failures.push(...endpoint.failures);

  const emptyMcp = {
    status: endpoint.status === "NOT_REQUIRED" ? ("NOT_REQUIRED" as const) : ("FAIL" as const),
    endpoint: endpoint.endpoint,
    endpointSource: endpoint.endpointSource,
    connect: "SKIPPED" as const,
    resourcesList: "SKIPPED" as const,
    resourceLimitExceeded: false,
    resources: [] as EngawaDoctorReport["mcp"]["resources"],
    resourcesRead: "SKIPPED" as const,
    readSamples: [] as EngawaDoctorReport["mcp"]["readSamples"],
    toolsList: "SKIPPED" as const,
    toolNames: [] as string[],
    publicTools: "SKIPPED" as const,
    extraTools: [] as string[],
    searchSite: "SKIPPED" as const,
    searchEmptyQueryRejected: "SKIPPED" as const,
    knownQuery: options.query ? ("SKIPPED" as const) : ("NOT_REQUIRED" as const),
  };

  let mcpSection: EngawaDoctorReport["mcp"] = emptyMcp;
  let mcpBodies: string[] = [];
  let searchTexts: string[] = [];
  let mcpPresent = false;

  if (endpoint.status === "PASS" && endpoint.endpoint) {
    mcpPresent = true;
    const mcp = await verifyMcp({
      endpoint: endpoint.endpoint,
      timeoutMs: options.timeoutMs,
      maxResources: options.maxResources,
      maxReads: options.maxReads,
      knownQuery: options.query,
      lockOrigin: origin,
      allowLocal: options.allowLocal,
    });
    failures.push(...mcp.failures);
    mcpBodies = mcp.sampledBodies;
    searchTexts = mcp.searchTexts;
    mcpSection = {
      status: mcp.status,
      endpoint: endpoint.endpoint,
      endpointSource: endpoint.endpointSource,
      connect: mcp.connect,
      resourcesList: mcp.resourcesList,
      resourceCount: mcp.resourceCount,
      resourceLimitExceeded: mcp.resourceLimitExceeded,
      resources: mcp.resources,
      resourcesRead: mcp.resourcesRead,
      readSamples: mcp.readSamples,
      toolsList: mcp.toolsList,
      toolNames: mcp.toolNames,
      publicTools: mcp.publicTools,
      extraTools: mcp.extraTools,
      searchSite: mcp.searchSite,
      searchEmptyQueryRejected: mcp.searchEmptyQueryRejected,
      knownQuery: mcp.knownQuery,
      knownQueryResultCount: mcp.knownQueryResultCount,
    };
  } else if (endpoint.status === "NOT_REQUIRED") {
    mcpSection = { ...emptyMcp, status: "NOT_REQUIRED" };
  } else {
    mcpSection = { ...emptyMcp, status: "FAIL" };
  }

  const securityTarget = endpoint.endpoint ?? new URL("/", origin).href;
  const hostValidation = await probeHostValidation({
    targetUrl: securityTarget,
    timeoutMs: options.timeoutMs,
    allowLocal: options.allowLocal,
    lockOrigin: origin,
  });

  let originValidation: EngawaDoctorReport["security"]["originValidation"] = "NOT_APPLICABLE";
  if (mcpPresent && endpoint.endpoint) {
    originValidation = await probeOriginValidation({
      mcpUrl: endpoint.endpoint,
      timeoutMs: options.timeoutMs,
      allowLocal: options.allowLocal,
      lockOrigin: origin,
    });
  }

  const rateLimit = await probeRateLimit({
    targetUrl: securityTarget,
    count: options.rateLimitProbe,
    timeoutMs: options.timeoutMs,
    allowLocal: options.allowLocal,
    lockOrigin: origin,
  });

  if (rateLimit === "NOT_PROBED") {
    warnings.push("Rate limiting not actively verified");
  }

  const candidateRouteCount = inspect.routes.filter((r) => r.engawaCandidate).length;
  const sensitiveRouteCount = inspect.routes.filter((r) => r.sensitivePathHint).length;

  const plan = comparePlan({
    planPath: options.planPath,
    doctorOrigin: origin,
    candidateRouteCount,
    sensitiveRouteCount,
  });
  failures.push(...plan.failures);
  if (plan.status === "WARN") {
    warnings.push(...plan.notes);
  }

  const deny = scanDenyTerms(options.denyTerms, [
    ...markdown.bodiesForInternalUse,
    ...mcpBodies,
    ...searchTexts,
  ]);
  failures.push(...deny.failures);

  const summary = summarize({
    failures,
    warnings,
    strict: options.strict,
    hostValidation,
    originValidation,
    rateLimit,
    mcpPresent,
  });

  const report: EngawaDoctorReport = {
    schemaVersion: DOCTOR_SCHEMA_VERSION,
    profile: options.profile,
    target: {
      inputUrl: options.inputUrl,
      finalUrl: inspect.target.finalUrl,
      origin,
    },
    discovery: {
      inspectSchemaVersion: inspect.schemaVersion,
      llmsAdvertised: inspect.agentSurfaces.llmsTxt.exists,
      markdownAdvertised: inspect.agentSurfaces.markdown.alternatesFound > 0,
      mcpAdvertised: inspect.agentSurfaces.mcp.advertised,
      publicRouteCount: inspect.routes.length,
      candidateRouteCount,
      sensitiveRouteCount,
    },
    llmsTxt: {
      status: llms.status,
      httpStatus: llms.httpStatus,
      contentType: llms.contentType,
      byteLength: llms.byteLength,
      canonicalSiteReference: llms.canonicalSiteReference,
      mcpAdvertisement: llms.mcpAdvertisement,
      markdownAdvertisement: llms.markdownAdvertisement,
    },
    markdown: {
      status: markdown.status,
      discoveredCount: markdown.discoveredCount,
      sampledCount: markdown.sampledCount,
      samples: markdown.samples,
    },
    mcp: mcpSection,
    security: {
      hostValidation,
      originValidation,
      rateLimit,
    },
    planComparison: {
      status: plan.status,
      candidateRouteCount: plan.candidateRouteCount,
      sensitiveRouteCount: plan.sensitiveRouteCount,
      disposition: plan.disposition,
      notes: plan.notes,
    },
    denyTerms: {
      checked: deny.checked,
      results: deny.results,
      status: deny.status,
    },
    sourceParity: {
      humanPublicSourceParity: "NOT_PROVABLE_FROM_LIVE_INTERFACE",
    },
    summary,
  };

  return engawaDoctorSchema.parse(report);
}

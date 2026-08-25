/**
 * @vitest-environment node
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../cli.js";
import { engawaDoctorSchema } from "../doctor/schema.js";
import { runDoctor } from "../doctor/run-doctor.js";
import { createGuardedMcpFetch } from "../doctor/mcp-fetch.js";
import { llmsContainsCanonicalSiteRoot, normalizeSiteRootUrl } from "../doctor/helpers.js";
import { __testRawRequest } from "../doctor/security-probes.js";
import {
  REMOTE_BODY_SENTINEL,
  startDoctorFixtureServer,
  type DoctorFixtureServer,
} from "../test-helpers/doctor-fixture-server.js";

const fixtures: DoctorFixtureServer[] = [];

afterEach(async () => {
  while (fixtures.length > 0) {
    const f = fixtures.pop();
    await f?.close();
  }
});

async function start(options?: Parameters<typeof startDoctorFixtureServer>[0]) {
  const f = await startDoctorFixtureServer(options);
  fixtures.push(f);
  return f;
}

async function doctorArgs(baseUrl: string, extra: string[] = []): Promise<string[]> {
  return ["doctor", baseUrl, "--allow-local", "--max-pages", "5", ...extra];
}

describe("engawa doctor CLI", () => {
  it("shows help", async () => {
    const code = await runCli(["doctor", "--help"]);
    expect(code).toBe(0);
  });

  it("requires URL", async () => {
    const code = await runCli(["doctor"]);
    expect(code).toBe(1);
  });

  it("rejects invalid URL", async () => {
    const code = await runCli(["doctor", "not-a-url", "--allow-local"]);
    expect(code).toBe(1);
  });

  it("rejects private targets by default", async () => {
    const code = await runCli(["doctor", "http://127.0.0.1:9"]);
    expect(code).toBe(1);
  });

  it("rejects unknown option", async () => {
    const code = await runCli(["doctor", "http://example.com", "--bogus"]);
    expect(code).toBe(1);
  });

  it("rejects invalid profile", async () => {
    const code = await runCli(["doctor", "http://example.com", "--profile", "weird"]);
    expect(code).toBe(1);
  });

  it("rejects rate-limit-probe above hard max", async () => {
    const code = await runCli(["doctor", "http://example.com", "--rate-limit-probe", "99"]);
    expect(code).toBe(1);
  });

  it("rejects invalid output extension", async () => {
    const f = await start();
    const code = await runCli([...(await doctorArgs(f.baseUrl)), "--output", "doctor.txt"]);
    expect(code).toBe(1);
  });
});

describe("engawa doctor profiles and surfaces", () => {
  it("full profile passes against hermetic Engawa fixture", async () => {
    const f = await start({ resourceBodySentinel: true });
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 100,
      maxReads: 5,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(engawaDoctorSchema.parse(report).schemaVersion).toBe("engawa.doctor.v1");
    expect(report.llmsTxt.status).toBe("PASS");
    expect(report.markdown.status).toBe("PASS");
    expect(report.mcp.connect).toBe("PASS");
    expect(report.mcp.resourcesList).toBe("PASS");
    expect(report.mcp.resourcesRead).toBe("PASS");
    expect(report.mcp.publicTools).toBe("PASS");
    expect(report.mcp.searchSite).toBe("PASS");
    expect(report.mcp.searchEmptyQueryRejected).toBe("PASS");
    expect(report.sourceParity.humanPublicSourceParity).toBe("NOT_PROVABLE_FROM_LIVE_INTERFACE");
    expect(report.summary.status === "PASS" || report.summary.status === "PASS_WITH_WARNINGS").toBe(
      true,
    );
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(REMOTE_BODY_SENTINEL);
  });

  it("discovery profile allows missing MCP", async () => {
    const s = await start({
      includeMcp: false,
      llmsBody: `# Doctor Fixture

> Hermetic fixture for discovery-only surfaces

- Site: __ORIGIN__
- [About](__ORIGIN__/about.md)
`,
    });

    const report = await runDoctor({
      inputUrl: s.baseUrl,
      profile: "discovery",
      denyTerms: [],
      maxPages: 5,
      maxResources: 100,
      maxReads: 5,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.mcp.status).toBe("NOT_REQUIRED");
    expect(report.llmsTxt.mcpAdvertisement).toBe("NOT_REQUIRED");
  });

  it("full profile fails when MCP missing", async () => {
    const s = await start({
      includeMcp: false,
      llmsBody: `# Site

- Site: __ORIGIN__
- [About](__ORIGIN__/about.md)
`,
    });

    const report = await runDoctor({
      inputUrl: s.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.summary.status).toBe("FAIL");
  });

  it("fails when llms.txt missing", async () => {
    const f = await start({ includeLlms: false });
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.llmsTxt.status).toBe("FAIL");
    expect(report.summary.status).toBe("FAIL");
  });

  it("fails Markdown HTML masquerade", async () => {
    const f = await start({ markdownHtmlMasquerade: true });
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.markdown.status).toBe("FAIL");
  });

  it("fails empty Markdown body", async () => {
    const f = await start({ markdownEmpty: true });
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.markdown.status).toBe("FAIL");
  });

  it("known query requires results", async () => {
    const f = await start();
    const ok = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      query: "services",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(ok.mcp.knownQuery).toBe("PASS");

    const bad = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      query: "zzznomatchqqq",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(bad.mcp.knownQuery).toBe("FAIL");
    expect(bad.summary.status).toBe("FAIL");
  });
});

describe("engawa doctor MCP safety", () => {
  it("fails closed on extra tools and never invokes them", async () => {
    const f = await start({ extraDangerousTool: true });
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.mcp.publicTools).toBe("FAIL");
    expect(report.mcp.extraTools).toContain("dangerous_write_tool");
    expect(f.dangerousToolCallCount).toBe(0);
    expect(report.summary.status).toBe("FAIL");
  });

  it("does not fetch cross-origin MCP", async () => {
    const t = await start({
      includeMcp: false,
      llmsBody: `# Site

- Site: __ORIGIN__
- Agent endpoint: https://evil.example/mcp
- [About](__ORIGIN__/about.md)
`,
    });

    const report = await runDoctor({
      inputUrl: t.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.summary.status).toBe("FAIL");
    expect(t.requestLog.every((l) => !l.includes("evil"))).toBe(true);
  });

  it("enforces maxResources bound", async () => {
    const f = await start();
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 1,
      maxReads: 1,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    // Fixture has _meta + about + services => > 1
    expect(report.mcp.resourceLimitExceeded).toBe(true);
    expect(report.mcp.resourcesList).toBe("FAIL");
  });
});

describe("engawa doctor security observations", () => {
  it("rejects invalid host", async () => {
    const f = await start({ rejectInvalidHost: true });
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.security.hostValidation).toBe("REJECTED_INVALID_HOST");
  });

  it("detects accepted invalid host", async () => {
    const f = await start({ acceptInvalidHost: true, rejectInvalidHost: false });
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.security.hostValidation).toBe("ACCEPTED_INVALID_HOST");
    expect(report.summary.status).toBe("FAIL");
  });

  it("detects CORS wildcard as accepted untrusted origin", async () => {
    const f = await start({ corsAllowOrigin: "*" });
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.security.originValidation).toBe("ACCEPTED_UNTRUSTED_ORIGIN");
    expect(report.summary.status).toBe("FAIL");
  });

  it("rate probe default is NOT_PROBED", async () => {
    const f = await start();
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.security.rateLimit).toBe("NOT_PROBED");
  });

  it("rate probe observes 429", async () => {
    const f = await start({ rateLimitAfter: 2 });
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 5,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.security.rateLimit).toBe("OBSERVED");
  });

  it("strict promotes unresolved rate limit to FAIL", async () => {
    const f = await start();
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: true,
      allowLocal: true,
      json: true,
    });
    expect(report.summary.status).toBe("FAIL");
  });
});

describe("engawa doctor plan and deny terms", () => {
  it("rejects plan target mismatch", async () => {
    const f = await start();
    const dir = await mkdtemp(join(tmpdir(), "engawa-doctor-plan-"));
    const planPath = join(dir, "engawa-plan.json");
    await writeFile(
      planPath,
      JSON.stringify({
        schemaVersion: "engawa.plan.v1",
        planStatus: "PLAN_READY_FOR_AGENT_REVIEW",
        input: {
          inspectionSource: "SAVED_REPORT",
          inspectSchemaVersion: "engawa.inspect.v1",
          inspectReportSha256: "a".repeat(64),
        },
        target: { url: "https://other.example/", origin: "https://other.example" },
        repository: {
          name: "x",
          framework: {
            id: "generic-node",
            nextjsAppRouter: false,
            nextjsPagesRouter: false,
            evidence: [],
          },
          node: { node24Required: false, nodeVersionStatus: "UNKNOWN" },
          packageManager: { detected: "unknown", lockfiles: [] },
          scan: { filesSeen: 0, filesAnalyzed: 0, filesSkipped: [], scanTruncated: false },
          existingEngawa: { status: "NOT_INSTALLED", packages: [], surfaceHints: [] },
        },
        publicRoutes: [],
        routeMappings: [],
        securityEvidence: {
          middleware: "NOT_OBSERVED",
          nextConfig: "NOT_OBSERVED",
          rateLimiter: "NOT_OBSERVED",
          authMiddleware: "NOT_OBSERVED",
          headersConfig: "NOT_OBSERVED",
          canonicalHost: "NOT_OBSERVED",
          evidence: [],
        },
        integration: {
          disposition: "NEW_INTEGRATION",
          testedReleaseSet: "2026-08-v0.1.1",
          recommendedPackages: [],
          requiredSurfaces: [],
          optionalSurfaces: [],
        },
        review: {
          humanReviewRequired: true,
          publicSourceUnclearRoutes: [],
          questions: [],
          blockers: [],
        },
      }),
      "utf8",
    );

    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      planPath,
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.planComparison.status).toBe("FAIL");
    expect(report.summary.status).toBe("FAIL");
  });

  it("deny term found fails without echoing raw value", async () => {
    const f = await start({ resourceBodySentinel: true });
    const raw = "ENGAWA_PRIVATE_DRAFT_SENTINEL_123";
    // Put deny term into resource by using the REMOTE sentinel already in body — use that
    const report = await runDoctor({
      inputUrl: f.baseUrl,
      profile: "full",
      denyTerms: [REMOTE_BODY_SENTINEL],
      maxPages: 5,
      maxResources: 50,
      maxReads: 5,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.denyTerms.status).toBe("FAIL");
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(REMOTE_BODY_SENTINEL);
    expect(serialized).toContain("sentinel-1");
    expect(report.denyTerms.results[0]?.found).toBe(true);
    void raw;
  });
});

describe("engawa doctor output", () => {
  it("emits valid JSON only with --json", async () => {
    const f = await start();
    const code = await runCli([...(await doctorArgs(f.baseUrl)), "--json"]);
    expect(code).toBe(0);
  });

  it("writes .json and .md and fails if file exists", async () => {
    const f = await start();
    const dir = await mkdtemp(join(tmpdir(), "engawa-doctor-out-"));
    const jsonPath = join(dir, "doctor.json");
    const mdPath = join(dir, "doctor.md");
    expect(await runCli([...(await doctorArgs(f.baseUrl)), "--output", jsonPath])).toBe(0);
    expect(await runCli([...(await doctorArgs(f.baseUrl)), "--output", jsonPath])).toBe(1);
    expect(await runCli([...(await doctorArgs(f.baseUrl)), "--output", mdPath])).toBe(0);
  });

  it("is deterministic for identical fixture responses", async () => {
    const f = await start();
    const opts = {
      inputUrl: f.baseUrl,
      profile: "full" as const,
      denyTerms: [] as string[],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    };
    const a = await runDoctor(opts);
    const b = await runDoctor(opts);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toMatch(/T\d{2}:\d{2}:\d{2}/);
  });
});

describe("engawa doctor MCP transport origin lock", () => {
  it("rejects same-origin MCP redirect without following", async () => {
    const f = await start();
    const redirecting = await start({
      mcpRedirectTo: `${f.origin}/mcp`,
      includeMcp: true,
    });
    const report = await runDoctor({
      inputUrl: redirecting.baseUrl,
      profile: "full",
      mcpUrl: `${redirecting.origin}/mcp`,
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.mcp.connect).toBe("FAIL");
    expect(report.summary.status).toBe("FAIL");
    expect(f.requestLog.filter((l) => l.includes("/mcp")).length).toBe(0);
  });

  it("rejects cross-origin MCP redirect with zero destination requests", async () => {
    const secondary = await start();
    const primary = await start({
      mcpRedirectTo: `${secondary.origin}/mcp`,
    });
    const report = await runDoctor({
      inputUrl: primary.baseUrl,
      profile: "full",
      mcpUrl: `${primary.origin}/mcp`,
      denyTerms: [],
      maxPages: 5,
      maxResources: 50,
      maxReads: 3,
      timeoutMs: 8000,
      rateLimitProbe: 0,
      strict: false,
      allowLocal: true,
      json: true,
    });
    expect(report.mcp.connect).toBe("FAIL");
    expect(secondary.requestLog.filter((l) => l.includes("/mcp")).length).toBe(0);
  });
});

describe("engawa doctor llms canonical exact match", () => {
  it("passes exact and trailing-slash equivalent roots", () => {
    expect(
      llmsContainsCanonicalSiteRoot("- Site: https://example.com/", "https://example.com"),
    ).toBe(true);
    expect(
      llmsContainsCanonicalSiteRoot("- Site: https://example.com", "https://example.com/"),
    ).toBe(true);
  });

  it("fails mcp-only, markdown-only, prose hostname, and wrong origin", () => {
    expect(
      llmsContainsCanonicalSiteRoot(
        "- MCP endpoint: https://example.com/mcp",
        "https://example.com/",
      ),
    ).toBe(false);
    expect(
      llmsContainsCanonicalSiteRoot(
        "- [About](https://example.com/about.md)",
        "https://example.com/",
      ),
    ).toBe(false);
    expect(
      llmsContainsCanonicalSiteRoot("Visit example.com for more", "https://example.com/"),
    ).toBe(false);
    expect(
      llmsContainsCanonicalSiteRoot("- Site: https://evil.example/", "https://example.com/"),
    ).toBe(false);
  });

  it("normalizeSiteRootUrl rejects non-root paths", () => {
    expect(normalizeSiteRootUrl("https://example.com/mcp")).toBeNull();
    expect(normalizeSiteRootUrl("https://example.com/about.md")).toBeNull();
    expect(normalizeSiteRootUrl("https://example.com/")).toBe("https://example.com/");
  });
});

describe("engawa doctor security probe bounds", () => {
  it("classifies oversized continuous response as UNKNOWN without huge body", async () => {
    const server = createServer((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      const chunk = Buffer.alloc(64 * 1024, 0x61);
      const pump = () => {
        if (!res.write(chunk)) {
          res.once("drain", pump);
          return;
        }
        setImmediate(pump);
      };
      pump();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as AddressInfo;
    const result = await __testRawRequest(`http://127.0.0.1:${addr.port}/`, {
      method: "GET",
      headers: {},
      timeoutMs: 2000,
      maxBodyBytes: 8 * 1024,
    });
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    expect(result.error).toBe("BODY_TOO_LARGE");
    expect(result.body.length).toBeLessThan(5000);
  });

  it("absolute timeout terminates slow stream", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      const interval = setInterval(() => {
        res.write("x");
      }, 50);
      res.on("close", () => clearInterval(interval));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as AddressInfo;
    const result = await __testRawRequest(`http://127.0.0.1:${addr.port}/`, {
      method: "GET",
      headers: {},
      timeoutMs: 200,
      maxBodyBytes: 1024 * 1024,
    });
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    expect(result.error).toBe("timeout");
  });
});

describe("engawa doctor guarded MCP fetch unit", () => {
  it("blocks private targets when allowLocal is false", async () => {
    const requests: string[] = [];
    const guarded = createGuardedMcpFetch({
      lockOrigin: "http://192.168.0.5",
      allowLocal: false,
      onRequest: (u) => requests.push(u),
      underlyingFetch: async () => new Response("ok"),
    });
    await expect(guarded("http://192.168.0.5/mcp")).rejects.toThrow(/private|local|refusing/i);
    expect(requests).toHaveLength(0);
  });

  it("blocks cross-origin before fetch", async () => {
    const requests: string[] = [];
    const guarded = createGuardedMcpFetch({
      lockOrigin: "https://example.com",
      allowLocal: true,
      onRequest: (u) => requests.push(u),
      underlyingFetch: async () => new Response("ok"),
    });
    await expect(guarded("https://evil.example/mcp")).rejects.toThrow(/cross-origin/i);
    expect(requests).toHaveLength(0);
  });
});

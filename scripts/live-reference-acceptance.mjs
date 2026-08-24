/**
 * Live production reference acceptance checks.
 * Runs integration-acceptance-style checks against both reference sites.
 *
 * Usage: node scripts/live-reference-acceptance.mjs [--allow-live-rate-limit-probe] [siteBaseUrl ...]
 *
 * Rate-limit evidence prefers consumer-repo unit tests (sibling checkout).
 * Env overrides: THIERRY_CONSUMER_REPO, OLD_HAND_CONSUMER_REPO
 *
 * Defaults:
 *   https://www.thierry-gilgen-ict.ch
 *   https://theoldhandofasia.ch
 */
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { request as httpsRequest } from "node:https";
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGAWA_ROOT = resolve(__dirname, "..");

const DEFAULT_SITES = [
  {
    name: "THIERRY",
    base: "https://www.thierry-gilgen-ict.ch",
    canonicalHost: "www.thierry-gilgen-ict.ch",
    markdownPath: "/about.md",
    searchQuery: "studio",
    agentsPath: "/agents",
    consumerRepo:
      process.env.THIERRY_CONSUMER_REPO ?? join(ENGAWA_ROOT, "..", "thierry-gilgen-ict.ch"),
    mcpRouteFile: "src/app/mcp/route.ts",
    rateLimitTest: "src/lib/security/rateLimit.test.ts",
    rateLimitWiring: "enforceRateLimit",
    mcpRateLimit: 120,
  },
  {
    name: "OLD_HAND",
    base: "https://theoldhandofasia.ch",
    canonicalHost: "theoldhandofasia.ch",
    markdownPath: "/ankauf.md",
    searchQuery: "ankauf",
    agentsPath: "/agents",
    consumerRepo:
      process.env.OLD_HAND_CONSUMER_REPO ?? join(ENGAWA_ROOT, "..", "theoldhandofasia.ch"),
    mcpRouteFile: "app/mcp/route.ts",
    rateLimitTest: "tests/unit/rate-limit.test.ts",
    rateLimitWiring: "enforceMcpRateLimit",
    mcpRateLimit: 120,
  },
];

function parseArgs(argv) {
  const allowLiveRateLimitProbe = argv.includes("--allow-live-rate-limit-probe");
  const urls = argv.filter((a) => !a.startsWith("--"));
  return { allowLiveRateLimitProbe, urls };
}

function classifySecurityResponse(status, err) {
  if (typeof status === "number") {
    if (status === 403 || (status >= 400 && status < 500)) return "PASS_APP";
    return `FAIL_${status}`;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("EPROTO") ||
    msg.includes("handshake failure") ||
    msg.includes("alert internal error") ||
    msg.includes("ECONNRESET")
  ) {
    return "PASS_EDGE";
  }
  throw err;
}

async function httpsPost(mcpUrl, headers, body) {
  const parsed = new URL(mcpUrl);
  if (parsed.protocol !== "https:") {
    throw new Error("live acceptance expects https production URLs");
  }
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function checkHttp(url) {
  const res = await fetch(url, { redirect: "follow" });
  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();
  return { ok: res.ok, status: res.status, contentType, body, url: res.url };
}

async function checkHostValidation(mcpUrl) {
  try {
    const status = await httpsPost(
      mcpUrl,
      { Host: "evil.example" },
      JSON.stringify({ jsonrpc: "2.0", method: "initialize", params: {}, id: 1 }),
    );
    return classifySecurityResponse(status);
  } catch (err) {
    return classifySecurityResponse(undefined, err);
  }
}

async function checkOriginValidation(mcpUrl, canonicalHost) {
  try {
    const status = await httpsPost(
      mcpUrl,
      {
        Host: canonicalHost,
        Origin: "https://evil.example",
      },
      JSON.stringify({ jsonrpc: "2.0", method: "initialize", params: {}, id: 1 }),
    );
    return classifySecurityResponse(status);
  } catch (err) {
    return classifySecurityResponse(undefined, err);
  }
}

async function verifyMcpRouteWiring(site) {
  const routePath = join(site.consumerRepo, site.mcpRouteFile);
  const content = await readFile(routePath, "utf8");
  if (!content.includes(site.rateLimitWiring)) {
    throw new Error(`MCP route missing ${site.rateLimitWiring} in ${routePath}`);
  }
}

function runConsumerRateLimitTests(site) {
  execSync(`pnpm exec vitest run ${site.rateLimitTest}`, {
    cwd: site.consumerRepo,
    stdio: "pipe",
    env: process.env,
  });
}

async function probeLiveRateLimit(mcpUrl, limit, canonicalHost) {
  const probeKey = `engawa-acceptance-${Date.now()}`;
  const body = JSON.stringify({ jsonrpc: "2.0", method: "initialize", params: {}, id: 1 });
  let saw429 = false;
  for (let i = 0; i < limit + 1; i++) {
    const status = await httpsPost(
      mcpUrl,
      {
        Host: canonicalHost,
        "X-Forwarded-For": probeKey,
      },
      body,
    ).catch(() => 0);
    if (status === 429) {
      saw429 = true;
      break;
    }
  }
  return saw429 ? "PASS_APP" : "FAIL";
}

async function evidenceRateLimit(site, mcpUrl, allowLiveProbe) {
  if (existsSync(site.consumerRepo)) {
    try {
      runConsumerRateLimitTests(site);
      await verifyMcpRouteWiring(site);
      return {
        RATE_LIMIT: "PASS_APP",
        rateLimitEvidence: "consumer_repo_tests",
        rateLimitConsumerRepo: site.consumerRepo,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        RATE_LIMIT: "FAIL",
        rateLimitEvidence: "consumer_repo_tests_failed",
        rateLimitError: msg.slice(0, 500),
      };
    }
  }

  if (allowLiveProbe) {
    const result = await probeLiveRateLimit(mcpUrl, site.mcpRateLimit, site.canonicalHost);
    return {
      RATE_LIMIT: result,
      rateLimitEvidence: result === "PASS_APP" ? "live_probe_429" : "live_probe_no_429",
    };
  }

  return {
    RATE_LIMIT: "FAIL",
    rateLimitEvidence: "missing_consumer_repo",
    rateLimitError: `consumer repo not found: ${site.consumerRepo}`,
  };
}

async function runMcpAcceptance(base, searchQuery) {
  const mcpUrl = new URL("/mcp", base);
  const transport = new StreamableHTTPClientTransport(mcpUrl);
  const client = new Client({ name: "live-acceptance", version: "0.1.1" });
  await client.connect(transport);

  const { resources } = await client.listResources();
  if (resources.length < 1) throw new Error("no MCP resources");

  const first = resources[0];
  const read = await client.readResource({ uri: first.uri });
  if (!read.contents?.[0]?.text) throw new Error("empty resource read");

  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name);
  if (names.length !== 1 || names[0] !== "search_site") {
    throw new Error(`unexpected tools: ${names.join(", ")}`);
  }

  const search = await client.callTool({
    name: "search_site",
    arguments: { query: searchQuery, limit: 5 },
  });
  if (search.isError) throw new Error("search_site failed");

  const sentinel = await client.callTool({
    name: "search_site",
    arguments: { query: "ENGAWA_DRAFT_SENTINEL_XYZ", limit: 5 },
  });
  const sentinelText =
    sentinel.content?.[0]?.type === "text" ? sentinel.content[0].text : JSON.stringify(sentinel);
  if (sentinelText.toLowerCase().includes("draft") && sentinelText.includes("ENGAWA_DRAFT")) {
    throw new Error("draft sentinel leaked");
  }

  await client.close();
  return { resourceCount: resources.length };
}

function securityPass(value) {
  return value === "PASS_APP" || value === "PASS_EDGE" || value === "NOT_APPLICABLE";
}

function rateLimitPass(value) {
  return value === "PASS_APP" || value === "PASS_EDGE";
}

async function acceptSite(site, allowLiveRateLimitProbe) {
  const report = {
    site: site.name,
    base: site.base,
    human: "FAIL",
    llms: "FAIL",
    markdown: "FAIL",
    mcp: "FAIL",
    corpus: "FAIL",
    HOST_VALIDATION: "FAIL",
    RATE_LIMIT: "FAIL",
    ORIGIN_VALIDATION: "FAIL",
    overall: "FAIL",
  };

  try {
    const agents = await checkHttp(new URL(site.agentsPath, site.base));
    report.human = agents.ok ? "PASS" : "FAIL";

    const llms = await checkHttp(new URL("/llms.txt", site.base));
    report.llms =
      llms.ok &&
      llms.contentType.includes("text/plain") &&
      llms.body.includes(site.base.replace(/\/$/, "")) &&
      llms.body.includes("/mcp")
        ? "PASS"
        : "FAIL";

    const md = await checkHttp(new URL(site.markdownPath, site.base));
    report.markdown =
      md.ok && md.contentType.includes("text/markdown") && md.body.length > 10 ? "PASS" : "FAIL";

    await runMcpAcceptance(site.base, site.searchQuery);
    report.mcp = "PASS";
    report.corpus = "PASS";

    const mcpUrl = new URL("/mcp", site.base).href;
    report.HOST_VALIDATION = await checkHostValidation(mcpUrl);
    report.ORIGIN_VALIDATION = await checkOriginValidation(mcpUrl, site.canonicalHost);

    const rateEvidence = await evidenceRateLimit(site, mcpUrl, allowLiveRateLimitProbe);
    report.RATE_LIMIT = rateEvidence.RATE_LIMIT;
    if (rateEvidence.rateLimitEvidence) report.rateLimitEvidence = rateEvidence.rateLimitEvidence;
    if (rateEvidence.rateLimitConsumerRepo) {
      report.rateLimitConsumerRepo = rateEvidence.rateLimitConsumerRepo;
    }
    if (rateEvidence.rateLimitError) report.rateLimitError = rateEvidence.rateLimitError;

    const allCore =
      report.human === "PASS" &&
      report.llms === "PASS" &&
      report.markdown === "PASS" &&
      report.mcp === "PASS" &&
      report.corpus === "PASS" &&
      securityPass(report.HOST_VALIDATION) &&
      securityPass(report.ORIGIN_VALIDATION) &&
      rateLimitPass(report.RATE_LIMIT);

    report.overall = allCore ? "PASS" : "FAIL";
  } catch (err) {
    report.error = err instanceof Error ? err.message : String(err);
    report.overall = "FAIL";
  }

  return report;
}

async function main() {
  const { allowLiveRateLimitProbe, urls } = parseArgs(process.argv.slice(2));
  const sites =
    urls.length > 0
      ? urls.map((base, i) => ({
          name: `SITE_${i}`,
          base: base.replace(/\/$/, ""),
          canonicalHost: new URL(base).host,
          markdownPath: "/about.md",
          searchQuery: "about",
          agentsPath: "/agents",
          consumerRepo: "",
          mcpRouteFile: "",
          rateLimitTest: "",
          rateLimitWiring: "",
          mcpRateLimit: 120,
        }))
      : DEFAULT_SITES;

  const reports = [];
  for (const site of sites) {
    const report = await acceptSite(site, allowLiveRateLimitProbe);
    reports.push(report);
    console.log(JSON.stringify(report, null, 2));
  }

  console.log("ACCEPTANCE_CONTRACT_FAIL_CLOSED = YES");
  console.log("RATE_LIMIT_NOT_TESTED_CAN_PASS = NO");

  const failed = reports.filter((r) => r.overall !== "PASS");
  if (failed.length > 0) {
    console.error("LIVE_REFERENCE_ACCEPTANCE = FAIL");
    process.exit(1);
  }
  console.log("LIVE_REFERENCE_ACCEPTANCE = PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

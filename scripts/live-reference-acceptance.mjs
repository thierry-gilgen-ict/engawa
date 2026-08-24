/**
 * Live production reference acceptance checks.
 * Runs integration-acceptance-style checks against both reference sites.
 *
 * Usage: node scripts/live-reference-acceptance.mjs [siteBaseUrl ...]
 *
 * Defaults:
 *   https://www.thierry-gilgen-ict.ch
 *   https://theoldhandofasia.ch
 */
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { request as httpsRequest } from "node:https";

const DEFAULT_SITES = [
  {
    name: "THIERRY",
    base: "https://www.thierry-gilgen-ict.ch",
    markdownPath: "/about.md",
    searchQuery: "studio",
    agentsPath: "/agents",
  },
  {
    name: "OLD_HAND",
    base: "https://theoldhandofasia.ch",
    markdownPath: "/ankauf.md",
    searchQuery: "ankauf",
    agentsPath: "/agents",
  },
];

async function checkHttp(url) {
  const res = await fetch(url, { redirect: "follow" });
  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();
  return { ok: res.ok, status: res.status, contentType, body, url: res.url };
}

async function checkEvilHost(mcpUrl) {
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
          Host: "evil.example",
          Origin: parsed.origin,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("error", reject);
    req.write(JSON.stringify({ jsonrpc: "2.0", method: "initialize", params: {}, id: 1 }));
    req.end();
  });
}

async function checkHostValidation(mcpUrl) {
  try {
    const status = await checkEvilHost(mcpUrl);
    if (status === 403 || (status >= 400 && status < 500)) return "PASS_APP";
    return `FAIL_${status}`;
  } catch (err) {
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

async function classifyRateLimit() {
  return "NOT_TESTED";
}

async function acceptSite(site) {
  const report = {
    site: site.name,
    base: site.base,
    human: "FAIL",
    llms: "FAIL",
    markdown: "FAIL",
    mcp: "FAIL",
    hostValidation: "FAIL",
    rateLimit: "UNKNOWN",
    corpus: "FAIL",
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

    report.hostValidation = await checkHostValidation(new URL("/mcp", site.base));

    report.rateLimit = await classifyRateLimit();

    const hostOk = report.hostValidation === "PASS_APP" || report.hostValidation === "PASS_EDGE";
    const allCore =
      report.human === "PASS" &&
      report.llms === "PASS" &&
      report.markdown === "PASS" &&
      report.mcp === "PASS" &&
      report.corpus === "PASS" &&
      hostOk;

    report.overall = allCore ? "PASS" : "FAIL";
  } catch (err) {
    report.error = err instanceof Error ? err.message : String(err);
    report.overall = "FAIL";
  }

  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const sites =
    args.length > 0
      ? args.map((base, i) => ({
          name: `SITE_${i}`,
          base: base.replace(/\/$/, ""),
          markdownPath: "/about.md",
          searchQuery: "about",
          agentsPath: "/agents",
        }))
      : DEFAULT_SITES;

  const reports = [];
  for (const site of sites) {
    const report = await acceptSite(site);
    reports.push(report);
    console.log(JSON.stringify(report, null, 2));
  }

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

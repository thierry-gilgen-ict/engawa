/**
 * Stranger-path smoke test.
 * Builds a temporary consumer OUTSIDE the Engawa workspace using public npm only.
 * Proves a stranger can integrate from docs + npm without the monorepo.
 *
 * Usage: node scripts/stranger-path-smoke.mjs
 *
 * Not part of default CI (external registry dependency).
 */
import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const scope = "@thierry-gilgen-ict";
const VERSION = "0.1.1";
const HOST = "127.0.0.1";

const serverSource = `
import { createServer } from "node:http";
import {
  buildResourceUri,
  createEngawa,
  normalizeCanonicalUrl,
  validateEngawaConfig,
  validateResourceId,
} from "${scope}/engawa-core";
import { generateLlmsTxt } from "${scope}/engawa-discovery";
import { createEngawaPublicMcpHandler } from "${scope}/engawa-mcp";
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";

const PUBLIC_PAGES = new Map([
  [
    "about",
    {
      id: "about",
      title: "About",
      description: "Who we are",
      path: "/about.md",
      markdown: "# About\\n\\nStranger smoke site — public only.",
    },
  ],
]);

class SiteContentAdapter {
  constructor(canonicalUrl) {
    this.canonicalBase = normalizeCanonicalUrl(canonicalUrl);
    this.uriIndex = new Map();
    for (const page of PUBLIC_PAGES.values()) {
      validateResourceId(page.id);
      this.uriIndex.set(buildResourceUri(this.canonicalBase, page.id), page.id);
    }
  }

  async listResources() {
    const resources = [];
    for (const page of PUBLIC_PAGES.values()) {
      resources.push(this.toResource(page));
    }
    return resources.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getResource(idOrUri) {
    const byId = PUBLIC_PAGES.get(idOrUri);
    if (byId) return this.toResource(byId);
    const id = this.uriIndex.get(idOrUri);
    if (!id) return undefined;
    const page = PUBLIC_PAGES.get(id);
    return page ? this.toResource(page) : undefined;
  }

  async search(query) {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();
    const matches = [];
    for (const page of PUBLIC_PAGES.values()) {
      const haystack = [page.id, page.title, page.description ?? "", page.markdown]
        .join(" ")
        .toLowerCase();
      if (haystack.includes(lower)) matches.push(this.toResource(page));
    }
    return matches.sort((a, b) => a.id.localeCompare(b.id));
  }

  toResource(page) {
    const path = page.path.startsWith("/") ? page.path : \`/\${page.path}\`;
    return {
      id: page.id,
      uri: buildResourceUri(this.canonicalBase, page.id),
      title: page.title,
      description: page.description,
      mimeType: "text/markdown",
      content: page.markdown,
      canonicalUrl: \`\${this.canonicalBase}\${path}\`,
    };
  }
}

const config = validateEngawaConfig({
  site: {
    name: "Stranger Smoke",
    canonicalUrl: "http://127.0.0.1:PORT_PLACEHOLDER",
    description: "External npm-only stranger fixture",
    language: "en",
  },
  agentInterface: { enabled: true, public: true },
  security: { publicDefault: "read-only" },
  metadata: { version: "${VERSION}" },
});

const engawa = createEngawa(config, new SiteContentAdapter(config.site.canonicalUrl));
const mcpHandler = toNodeHandler(createEngawaPublicMcpHandler(engawa));
const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", \`http://\${HOST_PLACEHOLDER}\`);

  if (req.method === "GET" && url.pathname === "/llms.txt") {
    const resources = await engawa.listResources();
    const body = generateLlmsTxt(engawa.config, resources);
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(body);
    return;
  }

  if (req.method === "GET" && url.pathname === "/about.md") {
    const resource = await engawa.getResource("about");
    if (!resource) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": "text/markdown; charset=utf-8" });
    res.end(resource.content);
    return;
  }

  if (url.pathname === "/mcp") {
    if (!validateHost(req, res) || !validateOrigin(req, res)) return;
    await mcpHandler(req, res);
    return;
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT_PLACEHOLDER, HOST_PLACEHOLDER, () => {
  console.log("STRANGER_SERVER_READY");
});
`;

async function waitForReady(child, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server start timeout")), timeoutMs);
    child.stdout.on("data", (chunk) => {
      if (String(chunk).includes("STRANGER_SERVER_READY")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cleanupTemp(dir, child) {
  if (child && !child.killed) {
    child.kill();
    await sleep(500);
  }
  try {
    await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "EBUSY") {
      console.warn("temp cleanup skipped (EBUSY):", dir);
      return;
    }
    throw err;
  }
}

function getEphemeralPort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, HOST, () => {
      const addr = s.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      s.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function runMcpChecks(baseUrl) {
  const mcpUrl = new URL("/mcp", baseUrl);
  const transport = new StreamableHTTPClientTransport(mcpUrl);
  const client = new Client({ name: "stranger-smoke", version: "0.1.1" });
  await client.connect(transport);

  const { resources } = await client.listResources();
  if (resources.length < 1) throw new Error("MCP resource list empty");

  const about = resources.find((r) => r.uri.includes("/r/about"));
  if (!about) throw new Error("about resource missing");

  const read = await client.readResource({ uri: about.uri });
  const text = read.contents[0]?.text ?? "";
  if (!text.includes("Stranger smoke")) throw new Error("resource read content mismatch");

  let unknownFailed = false;
  try {
    await client.readResource({ uri: "engawa://127.0.0.1/r/nonexistent" });
  } catch {
    unknownFailed = true;
  }
  if (!unknownFailed) throw new Error("unknown resource should fail");

  const tools = await client.listTools();
  const toolNames = tools.tools.map((t) => t.name);
  if (toolNames.length !== 1 || toolNames[0] !== "search_site") {
    throw new Error(`unexpected tools: ${toolNames.join(", ")}`);
  }

  const search = await client.callTool({
    name: "search_site",
    arguments: { query: "about", limit: 5 },
  });
  const searchText =
    search.content?.[0]?.type === "text" ? search.content[0].text : JSON.stringify(search);
  if (!searchText.toLowerCase().includes("about")) throw new Error("search_site miss");

  const rejected = await client.callTool({
    name: "search_site",
    arguments: { query: "", limit: 5 },
  });
  if (!rejected.isError) throw new Error("empty search should error");

  await client.close();
}

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "engawa-stranger-smoke-"));
  let child = null;
  try {
    const port = await getEphemeralPort();
    const baseUrl = `http://${HOST}:${port}`;

    const pkg = {
      name: "engawa-stranger-smoke",
      private: true,
      type: "module",
      dependencies: {
        [`${scope}/engawa-core`]: VERSION,
        [`${scope}/engawa-discovery`]: VERSION,
        [`${scope}/engawa-mcp`]: VERSION,
        "@modelcontextprotocol/node": "2.0.0",
      },
    };

    await writeFile(join(dir, "package.json"), JSON.stringify(pkg, null, 2));

    const serverCode = serverSource
      .replaceAll("PORT_PLACEHOLDER", String(port))
      .replaceAll("HOST_PLACEHOLDER", `"${HOST}"`);

    await writeFile(join(dir, "server.mjs"), serverCode);

    execSync("npm install --no-package-lock", {
      cwd: dir,
      stdio: "inherit",
      env: { ...process.env, npm_config_registry: "https://registry.npmjs.org" },
    });

    child = spawn(process.execPath, ["server.mjs"], {
      cwd: dir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "development" },
    });

    await waitForReady(child);

    const llms = await fetch(`${baseUrl}/llms.txt`);
    const llmsType = llms.headers.get("content-type") ?? "";
    const llmsBody = await llms.text();
    if (!llms.ok || !llmsType.includes("text/plain") || !llmsBody.includes("Stranger Smoke")) {
      throw new Error("llms.txt check failed");
    }
    console.log("STRANGER_LLMS_TXT = PASS");

    const md = await fetch(`${baseUrl}/about.md`);
    const mdType = md.headers.get("content-type") ?? "";
    const mdBody = await md.text();
    if (!md.ok || !mdType.includes("text/markdown") || !mdBody.includes("# About")) {
      throw new Error("about.md check failed");
    }
    console.log("STRANGER_MARKDOWN = PASS");

    await runMcpChecks(baseUrl);
    console.log("STRANGER_MCP = PASS");
    console.log("STRANGER_RESOURCE_LIST = PASS");
    console.log("STRANGER_RESOURCE_READ = PASS");
    console.log("STRANGER_SEARCH_SITE = PASS");
    console.log("STRANGER_SOURCE = PUBLIC_NPM_ONLY");
    console.log("STRANGER_MONOREPO_DEPENDENCY = NO");
    console.log("STRANGER_SMOKE = PASS");
  } finally {
    await cleanupTemp(dir, child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

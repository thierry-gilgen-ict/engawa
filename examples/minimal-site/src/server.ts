import { createServer } from "node:http";
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import { generateLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";
import { createEngawaPublicMcpHandler } from "@thierry-gilgen-ict/engawa-mcp";
import { exampleEngawa } from "./site.js";

const PORT = 3847;
const HOST = "127.0.0.1";

const mcpHandler = createEngawaPublicMcpHandler(exampleEngawa);
const nodeMcpHandler = toNodeHandler(mcpHandler);
const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

async function buildLlmsTxt(): Promise<string> {
  const resources = await exampleEngawa.listResources();
  return generateLlmsTxt(exampleEngawa.config, resources, {
    optionalResourceIds: ["contact"],
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}`);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        engawaVersion: exampleEngawa.metadata.engawaVersion,
        implementationProfile: exampleEngawa.metadata.implementationProfile,
        mcpProtocolBaseline: exampleEngawa.metadata.mcpProtocolBaseline,
      }),
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/llms.txt") {
    const body = await buildLlmsTxt();
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(body);
    return;
  }

  if (req.method === "GET" && url.pathname.endsWith(".md")) {
    const id = url.pathname.slice(1).replace(/\.md$/, "");
    const resource = await exampleEngawa.getResource(id);
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
    await nodeMcpHandler(req, res);
    return;
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, HOST, () => {
  console.log(`Example Studio running at http://${HOST}:${PORT}`);
  console.log(`  llms.txt: http://${HOST}:${PORT}/llms.txt`);
  console.log(`  MCP:      http://${HOST}:${PORT}/mcp`);
});

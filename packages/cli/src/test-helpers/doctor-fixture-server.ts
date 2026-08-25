import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import { createEngawa, StaticContentAdapter } from "@thierry-gilgen-ict/engawa-core";
import { generateLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";
import { createEngawaPublicMcpHandler } from "@thierry-gilgen-ict/engawa-mcp";
import * as z from "zod";

export const REMOTE_BODY_SENTINEL = "REMOTE_BODY_SENTINEL_SHOULD_NOT_APPEAR_IN_REPORT";

export interface DoctorFixtureOptions {
  includeMcp?: boolean;
  includeLlms?: boolean;
  includeMarkdown?: boolean;
  llmsBody?: string;
  llmsStatus?: number;
  markdownHtmlMasquerade?: boolean;
  markdownEmpty?: boolean;
  markdownMissing?: boolean;
  crossOriginMcpInLlms?: string;
  crossOriginMarkdownInLlms?: string;
  rejectInvalidHost?: boolean;
  acceptInvalidHost?: boolean;
  corsAllowOrigin?: string | null;
  rateLimitAfter?: number;
  extraDangerousTool?: boolean;
  resourceBodySentinel?: boolean;
  /** If set, GET/POST /mcp returns 302 to this Location instead of handling MCP. */
  mcpRedirectTo?: string;
}

export interface DoctorFixtureServer {
  baseUrl: string;
  origin: string;
  close: () => Promise<void>;
  server: Server;
  requestLog: string[];
  crossOriginRequestCount: number;
  dangerousToolCallCount: number;
}

export async function startDoctorFixtureServer(
  options: DoctorFixtureOptions = {},
): Promise<DoctorFixtureServer> {
  const includeMcp = options.includeMcp !== false;
  const includeLlms = options.includeLlms !== false;
  const includeMarkdown = options.includeMarkdown !== false;
  const rejectInvalidHost = options.rejectInvalidHost !== false;
  const requestLog: string[] = [];
  const counters = { crossOriginRequestCount: 0, dangerousToolCallCount: 0 };
  let rateCount = 0;

  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${addr.port}`;

  const bodyExtra = options.resourceBodySentinel ? `\n\n${REMOTE_BODY_SENTINEL}` : "";
  const adapter = new StaticContentAdapter(origin, [
    {
      id: "about",
      title: "About",
      description: "About page",
      path: "/about.md",
      content: `# About\n\nPublic about content for agents.${bodyExtra}`,
    },
    {
      id: "services",
      title: "Services",
      description: "Services page",
      path: "/services.md",
      content: "# Services\n\nWe offer consulting and design services.",
    },
  ]);

  const engawa = createEngawa(
    {
      site: {
        name: "Doctor Fixture",
        canonicalUrl: origin,
        description: "Hermetic Engawa doctor fixture",
        language: "en",
      },
      agentInterface: { enabled: true, public: true },
      content: {
        maxResourceBytes: 65536,
        maxSearchResults: 10,
        maxSearchQueryLength: 200,
      },
      security: { publicDefault: "read-only" as const },
      metadata: { version: "0.1.0" },
    },
    adapter,
  );

  const mcpHandler = createEngawaPublicMcpHandler(engawa);
  const nodeMcpHandler = toNodeHandler(mcpHandler);
  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();

  let dangerousHandler: ((req: IncomingMessage, res: ServerResponse) => Promise<void>) | undefined;

  if (options.extraDangerousTool) {
    const searchInput = z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(10).optional(),
    });
    const custom = createMcpHandler(async () => {
      const s = new McpServer({ name: "fixture-extra", version: "0.1.0" });
      const resources = await engawa.listResources();
      for (const resource of resources) {
        s.registerResource(
          resource.id,
          resource.uri,
          {
            title: resource.title,
            description: resource.description,
            mimeType: "text/markdown",
          },
          async () => ({
            contents: [
              {
                uri: resource.uri,
                mimeType: "text/markdown",
                text: resource.content,
              },
            ],
          }),
        );
      }
      s.registerTool(
        "search_site",
        {
          description: "search",
          inputSchema: searchInput,
        },
        async ({ query, limit }) => {
          const results = await engawa.search(query);
          const bounded = results.slice(0, limit ?? 5);
          const output = {
            results: bounded.map((r) => ({
              uri: r.uri,
              title: r.title,
              description: r.description,
              canonicalUrl: r.canonicalUrl,
            })),
          };
          return { content: [{ type: "text" as const, text: JSON.stringify(output) }] };
        },
      );
      s.registerTool(
        "dangerous_write_tool",
        {
          description: "must never be called",
          inputSchema: z.object({}),
        },
        async () => {
          counters.dangerousToolCallCount += 1;
          return { content: [{ type: "text" as const, text: "mutated" }] };
        },
      );
      return s;
    });
    dangerousHandler = toNodeHandler(custom);
  }

  const resources = await engawa.listResources();
  const defaultLlms =
    `${generateLlmsTxt(engawa.config, resources).trimEnd()}\n\n- Site: ${origin}/\n`.replaceAll(
      "__ORIGIN__",
      origin,
    );

  server.on("request", async (req, res) => {
    const hostHeader = req.headers.host ?? `127.0.0.1:${addr.port}`;
    const url = new URL(req.url ?? "/", `http://${hostHeader}`);
    requestLog.push(`${req.method ?? "GET"} ${url.pathname}`);

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html><html><head>
<title>Doctor Fixture</title>
<link rel="canonical" href="${origin}/"/>
<link rel="alternate" type="text/markdown" href="/about.md"/>
</head><body>
<a href="/about.md">About</a>
<a href="/services.md">Services</a>
</body></html>`);
      return;
    }

    if (req.method === "GET" && url.pathname === "/llms.txt") {
      if (!includeLlms) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("missing");
        return;
      }
      let body = (options.llmsBody ?? defaultLlms).replaceAll("__ORIGIN__", origin);
      if (options.crossOriginMcpInLlms) {
        body += `\n- MCP endpoint: ${options.crossOriginMcpInLlms}\n`;
      }
      if (options.crossOriginMarkdownInLlms) {
        body += `\n- [Offsite](${options.crossOriginMarkdownInLlms})\n`;
      }
      res.writeHead(options.llmsStatus ?? 200, { "content-type": "text/plain; charset=utf-8" });
      res.end(body);
      return;
    }

    if (req.method === "GET" && url.pathname.endsWith(".md")) {
      if (options.markdownMissing || !includeMarkdown) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("missing");
        return;
      }
      if (options.markdownHtmlMasquerade) {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<html><body>not markdown</body></html>");
        return;
      }
      if (options.markdownEmpty) {
        res.writeHead(200, { "content-type": "text/markdown" });
        res.end("");
        return;
      }
      const id = url.pathname.slice(1).replace(/\.md$/, "");
      const resource = await engawa.getResource(id);
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
      if (!includeMcp && !options.mcpRedirectTo) {
        res.writeHead(404).end("no mcp");
        return;
      }

      if (options.mcpRedirectTo) {
        res.writeHead(302, { Location: options.mcpRedirectTo });
        res.end();
        return;
      }

      if (options.rateLimitAfter !== undefined) {
        rateCount += 1;
        if (rateCount > options.rateLimitAfter) {
          res.writeHead(429, { "content-type": "text/plain" });
          res.end("rate limited");
          return;
        }
      }

      if (options.acceptInvalidHost) {
        // intentionally skip host validation
      } else if (rejectInvalidHost) {
        if (!validateHost(req, res)) return;
      }

      if (options.corsAllowOrigin !== undefined) {
        if (req.method === "OPTIONS") {
          const headers: Record<string, string> = {
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "content-type, mcp-session-id",
          };
          if (options.corsAllowOrigin) {
            headers["Access-Control-Allow-Origin"] = options.corsAllowOrigin;
          }
          res.writeHead(204, headers);
          res.end();
          return;
        }
      } else if (!validateOrigin(req, res)) {
        return;
      }

      if (dangerousHandler) {
        await dangerousHandler(req, res);
        return;
      }
      await nodeMcpHandler(req, res);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  });

  return {
    baseUrl: origin,
    origin,
    server,
    requestLog,
    get crossOriginRequestCount() {
      return counters.crossOriginRequestCount;
    },
    get dangerousToolCallCount() {
      return counters.dangerousToolCallCount;
    },
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface FixtureOptions {
  html?: string;
  llmsTxt?: string;
  sitemapXml?: string;
  robotsTxt?: string;
  markdown?: Record<string, string>;
  redirectTo?: string;
  largeBody?: boolean;
  title?: string;
}

export async function startFixtureServer(options: FixtureOptions = {}): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
  server: Server;
}> {
  const markdown = options.markdown ?? {};
  const html =
    options.html ??
    `<!DOCTYPE html><html lang="en"><head>
<title>${options.title ?? "Fixture Site"}</title>
<link rel="canonical" href="/"/>
<link rel="alternate" type="text/markdown" href="/about.md"/>
<link rel="alternate" hreflang="de" href="/de"/>
</head><body>
<a href="/about">About</a>
<a href="/login">Login</a>
<a href="/admin">Admin</a>
<a href="https://evil.example/offsite">Offsite</a>
</body></html>`;

  const server = createServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    if (options.redirectTo && path === "/") {
      res.writeHead(302, { Location: options.redirectTo });
      res.end();
      return;
    }
    if (path === "/llms.txt") {
      const body = options.llmsTxt ?? "https://fixture.test/mcp\n/about.md";
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(body);
      return;
    }
    if (path === "/robots.txt") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(options.robotsTxt ?? "Sitemap: /sitemap.xml\n");
      return;
    }
    if (path === "/sitemap.xml") {
      res.writeHead(200, { "content-type": "application/xml" });
      res.end(
        options.sitemapXml ??
          `<?xml version="1.0"?><urlset><url><loc>/about</loc></url><url><loc>/services</loc></url></urlset>`,
      );
      return;
    }
    if (path === "/agents") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><title>Agents</title></html>");
      return;
    }
    if (options.largeBody && path === "/large") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("x".repeat(3 * 1024 * 1024));
      return;
    }
    if (path in markdown) {
      res.writeHead(200, { "content-type": "text/markdown" });
      res.end(markdown[path]);
      return;
    }
    if (path.endsWith(".md")) {
      res.writeHead(200, { "content-type": "text/markdown" });
      res.end(markdown[path] ?? "# Page\n\nContent.");
      return;
    }
    if (path === "/" || path === "/about" || path === "/services") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html);
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    server,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}

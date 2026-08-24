import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface FixtureOptions {
  html?: string;
  llmsTxt?: string;
  sitemapXml?: string;
  robotsTxt?: string;
  markdown?: Record<string, string>;
  redirectTo?: string;
  pathRedirects?: Record<string, string>;
  redirectChain?: string[];
  largeBody?: boolean;
  title?: string;
  omitCanonical?: boolean;
  extraLinks?: string[];
  hangPaths?: string[];
  hangDelayMs?: number;
  failPaths?: string[];
}

export interface FixtureServer {
  baseUrl: string;
  close: () => Promise<void>;
  server: Server;
  requestLog: string[];
}

function buildDefaultHtml(options: FixtureOptions): string {
  const canonical = options.omitCanonical ? "" : `<link rel="canonical" href="/"/>`;
  const extraLinks = (options.extraLinks ?? [])
    .map((href) => `<a href="${href}">${href}</a>`)
    .join("");
  return (
    options.html ??
    `<!DOCTYPE html><html lang="en"><head>
<title>${options.title ?? "Fixture Site"}</title>
${canonical}
<link rel="alternate" type="text/markdown" href="/about.md"/>
<link rel="alternate" hreflang="de" href="/de"/>
</head><body>
<a href="/about">About</a>
<a href="/login">Login</a>
<a href="/admin">Admin</a>
<a href="https://evil.example/offsite">Offsite</a>
${extraLinks}
</body></html>`
  );
}

function createHandler(
  options: FixtureOptions,
  requestLog: string[],
  markdown: Record<string, string>,
  html: string,
): (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void {
  return (req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    requestLog.push(path);

    if (options.failPaths?.includes(path)) {
      res.destroy();
      return;
    }

    if (options.hangPaths?.includes(path)) {
      const delay = options.hangDelayMs ?? 30000;
      setTimeout(() => {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<html><body>late</body></html>");
      }, delay);
      return;
    }

    const pathRedirect = options.pathRedirects?.[path];
    if (pathRedirect) {
      res.writeHead(302, { Location: pathRedirect });
      res.end();
      return;
    }

    if (options.redirectChain) {
      const idx = options.redirectChain.indexOf(path);
      if (idx >= 0 && idx < options.redirectChain.length - 1) {
        res.writeHead(302, { Location: options.redirectChain[idx + 1] });
        res.end();
        return;
      }
      if (path === "/" && options.redirectChain.length > 0) {
        res.writeHead(302, { Location: options.redirectChain[0] });
        res.end();
        return;
      }
    }

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
    if (
      path === "/" ||
      path === "/about" ||
      path === "/services" ||
      path === "/page1" ||
      path === "/page2" ||
      path === "/page3" ||
      path === "/page4" ||
      path === "/page5"
    ) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html);
      return;
    }
    res.writeHead(404);
    res.end("not found");
  };
}

export async function startFixtureServer(options: FixtureOptions = {}): Promise<FixtureServer> {
  const markdown = options.markdown ?? {};
  const html = buildDefaultHtml(options);
  const requestLog: string[] = [];

  const server = createServer(createHandler(options, requestLog, markdown, html));

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    server,
    requestLog,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}

export async function startSecondaryFixtureServer(): Promise<{
  baseUrl: string;
  requestLog: string[];
  close: () => Promise<void>;
}> {
  const requestLog: string[] = [];
  const server = createServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    requestLog.push(path);
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html><body>other origin</body></html>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    requestLog,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}

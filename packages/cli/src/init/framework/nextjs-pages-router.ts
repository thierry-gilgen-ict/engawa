import type { NextjsRoute } from "../types.js";

const EXCLUDED_BASENAMES = new Set([
  "_app.ts",
  "_app.tsx",
  "_app.js",
  "_app.jsx",
  "_document.ts",
  "_document.tsx",
  "_document.js",
  "_document.jsx",
  "_error.ts",
  "_error.tsx",
  "_error.js",
  "_error.jsx",
  "404.ts",
  "404.tsx",
  "404.js",
  "404.jsx",
  "500.ts",
  "500.tsx",
  "500.js",
  "500.jsx",
]);

function isExcludedPagesModule(modulePath: string): boolean {
  if (modulePath.includes("/api/")) return true;
  const basename = modulePath.split("/").pop() ?? "";
  return EXCLUDED_BASENAMES.has(basename);
}

function fileToPublicPath(modulePath: string, pagesRoot: string): string {
  const rel = modulePath.slice(pagesRoot.length + 1);
  const withoutExt = rel.replace(/\.(tsx?|jsx?|mdx)$/, "");
  if (withoutExt === "index") return "/";
  if (withoutExt.endsWith("/index")) {
    const parent = withoutExt.slice(0, -"/index".length);
    return parent ? `/${parent}` : "/";
  }
  return `/${withoutExt}`;
}

export function discoverPagesRouterRoutes(filePaths: string[]): NextjsRoute[] {
  const pagesRoots: string[] = [];
  if (filePaths.some((p) => p.startsWith("pages/"))) pagesRoots.push("pages");
  if (filePaths.some((p) => p.startsWith("src/pages/"))) pagesRoots.push("src/pages");

  const routes: NextjsRoute[] = [];
  const extensions = /\.(tsx?|jsx?|mdx)$/;

  for (const pagesRoot of pagesRoots) {
    const prefix = `${pagesRoot}/`;
    const modules = filePaths.filter((p) => {
      if (!p.startsWith(prefix)) return false;
      if (!extensions.test(p)) return false;
      return !isExcludedPagesModule(p);
    });

    for (const modulePath of modules) {
      const publicPath = fileToPublicPath(modulePath, pagesRoot);
      routes.push({
        publicPath,
        modulePath,
        router: "pages",
        evidence: ["nextjs-pages-router-module"],
      });
    }
  }

  routes.sort((a, b) => a.publicPath.localeCompare(b.publicPath));
  return routes;
}

export function matchInspectPathToPagesRoute(
  inspectPath: string,
  routes: NextjsRoute[],
): NextjsRoute[] {
  const normalized = inspectPath === "/" ? "/" : inspectPath.replace(/\/$/, "") || "/";

  const exact = routes.filter((r) => r.publicPath === normalized);
  if (exact.length > 0) return exact;

  const inspectSegments = normalized.split("/").filter(Boolean);
  const matches: NextjsRoute[] = [];

  for (const route of routes) {
    const routeSegments = route.publicPath.split("/").filter(Boolean);
    if (routeSegments.length !== inspectSegments.length) continue;

    let match = true;
    for (let i = 0; i < routeSegments.length; i++) {
      const rs = routeSegments[i];
      if (rs.startsWith("[") && rs.endsWith("]")) continue;
      if (rs !== inspectSegments[i]) {
        match = false;
        break;
      }
    }
    if (match) matches.push(route);
  }

  return matches;
}

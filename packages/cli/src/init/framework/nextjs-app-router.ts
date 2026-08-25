import type { NextjsRoute } from "../types.js";

const PAGE_MODULE_NAMES = new Set(["page.ts", "page.tsx", "page.js", "page.jsx", "page.mdx"]);

function isRouteGroup(segment: string): boolean {
  return segment.startsWith("(") && segment.endsWith(")");
}

function segmentToUrlPart(segment: string): string | null {
  if (isRouteGroup(segment)) return null;
  if (segment.startsWith("[[...") && segment.endsWith("]]")) {
    const inner = segment.slice(3, -2);
    return `[[...${inner}]]`;
  }
  if (segment.startsWith("[...") && segment.endsWith("]")) {
    return segment;
  }
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return segment;
  }
  return segment;
}

function appDirToPublicPath(dirPath: string, appRoot: string): string {
  const rel = dirPath.startsWith(appRoot) ? dirPath.slice(appRoot.length) : dirPath;
  const segments = rel.split("/").filter(Boolean);
  const urlParts: string[] = [];
  for (const seg of segments) {
    const part = segmentToUrlPart(seg);
    if (part) urlParts.push(part);
  }
  if (urlParts.length === 0) return "/";
  return `/${urlParts.join("/")}`;
}

export function discoverAppRouterRoutes(filePaths: string[]): NextjsRoute[] {
  const appRoots: string[] = [];
  if (filePaths.some((p) => p.startsWith("app/"))) appRoots.push("app");
  if (filePaths.some((p) => p.startsWith("src/app/"))) appRoots.push("src/app");

  const routes: NextjsRoute[] = [];

  for (const appRoot of appRoots) {
    const prefix = `${appRoot}/`;
    const pageModules = filePaths.filter((p) => {
      if (!p.startsWith(prefix)) return false;
      const basename = p.split("/").pop() ?? "";
      return PAGE_MODULE_NAMES.has(basename);
    });

    for (const modulePath of pageModules) {
      const dirPath = modulePath.slice(0, modulePath.lastIndexOf("/"));
      const publicPath = appDirToPublicPath(dirPath, appRoot);
      routes.push({
        publicPath,
        modulePath,
        router: "app",
        evidence: ["nextjs-app-router-page-module"],
      });
    }
  }

  routes.sort((a, b) => a.publicPath.localeCompare(b.publicPath));
  return routes;
}

export function normalizeAppRoutePath(publicPath: string): string {
  return publicPath === "/" ? "" : publicPath.replace(/^\//, "");
}

export function matchInspectPathToAppRoute(
  inspectPath: string,
  routes: NextjsRoute[],
): NextjsRoute[] {
  const normalized = inspectPath === "/" ? "/" : inspectPath.replace(/\/$/, "") || "/";

  const exact = routes.filter((r) => r.publicPath === normalized);
  if (exact.length > 0) return exact;

  // Structural match for dynamic routes
  const inspectSegments = normalized.split("/").filter(Boolean);
  const matches: NextjsRoute[] = [];

  for (const route of routes) {
    const routeSegments = route.publicPath.split("/").filter(Boolean);
    if (routeSegments.length !== inspectSegments.length) continue;

    let match = true;
    for (let i = 0; i < routeSegments.length; i++) {
      const rs = routeSegments[i];
      const is = inspectSegments[i];
      if (rs.startsWith("[") && rs.endsWith("]")) continue;
      if (rs !== is) {
        match = false;
        break;
      }
    }
    if (match) matches.push(route);
  }

  return matches;
}

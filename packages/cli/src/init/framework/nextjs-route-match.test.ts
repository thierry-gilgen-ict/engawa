/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { matchInspectPathToRoute, segmentToUrlPart } from "./nextjs-route-match.js";
import { discoverAppRouterRoutes } from "./nextjs-app-router.js";
import { discoverPagesRouterRoutes } from "./nextjs-pages-router.js";
import { matchInspectPathToAppRoute } from "./nextjs-app-router.js";
import { matchInspectPathToPagesRoute } from "./nextjs-pages-router.js";

describe("nextjs-route-match", () => {
  it("segmentToUrlPart preserves optional catch-all", () => {
    expect(segmentToUrlPart("[[...slug]]")).toBe("[[...slug]]");
    expect(segmentToUrlPart("[...slug]")).toBe("[...slug]");
    expect(segmentToUrlPart("(marketing)")).toBe(null);
  });

  describe("[slug] single segment", () => {
    const route = "/blog/[slug]";
    it("matches one segment", () => {
      expect(matchInspectPathToRoute("/blog/post", route)).toBe(true);
    });
    it("does not match zero segments", () => {
      expect(matchInspectPathToRoute("/blog", route)).toBe(false);
    });
    it("does not match two segments", () => {
      expect(matchInspectPathToRoute("/blog/a/b", route)).toBe(false);
    });
  });

  describe("[...slug] catch-all", () => {
    const route = "/docs/[...slug]";
    it("matches one segment", () => {
      expect(matchInspectPathToRoute("/docs/a", route)).toBe(true);
    });
    it("matches multiple segments", () => {
      expect(matchInspectPathToRoute("/docs/a/b/c", route)).toBe(true);
    });
    it("does not match prefix only", () => {
      expect(matchInspectPathToRoute("/docs", route)).toBe(false);
    });
  });

  describe("[[...slug]] optional catch-all", () => {
    const route = "/docs/[[...slug]]";
    it("matches prefix only", () => {
      expect(matchInspectPathToRoute("/docs", route)).toBe(true);
    });
    it("matches one segment", () => {
      expect(matchInspectPathToRoute("/docs/a", route)).toBe(true);
    });
    it("matches multiple segments", () => {
      expect(matchInspectPathToRoute("/docs/a/b", route)).toBe(true);
    });
  });

  describe("route groups with catch-all", () => {
    const filePaths = [
      "src/app/(marketing)/docs/[[...slug]]/page.tsx",
      "src/app/docs/[...slug]/page.tsx",
    ];
    const routes = discoverAppRouterRoutes(filePaths);
    const optional = routes.find((r) => r.publicPath === "/docs/[[...slug]]");
    const required = routes.find((r) => r.publicPath === "/docs/[...slug]");

    expect(optional).toBeDefined();
    expect(required).toBeDefined();

    it("optional catch-all app route paths", () => {
      expect(matchInspectPathToAppRoute("/docs", routes).some((r) => r === optional)).toBe(true);
      expect(matchInspectPathToAppRoute("/docs/a", routes).some((r) => r === optional)).toBe(true);
    });

    it("required catch-all app route paths", () => {
      expect(matchInspectPathToAppRoute("/docs/a", routes).some((r) => r === required)).toBe(true);
      expect(matchInspectPathToAppRoute("/docs", routes).some((r) => r === required)).toBe(false);
    });
  });

  describe("pages router catch-all", () => {
    const filePaths = ["pages/docs/[...slug].tsx", "pages/docs/[[...slug]].tsx", "pages/about.tsx"];
    const routes = discoverPagesRouterRoutes(filePaths);

    it("discovers catch-all paths", () => {
      expect(routes.some((r) => r.publicPath === "/docs/[...slug]")).toBe(true);
      expect(routes.some((r) => r.publicPath === "/docs/[[...slug]]")).toBe(true);
    });

    it("matches pages catch-all", () => {
      expect(matchInspectPathToPagesRoute("/docs/a/b", routes).length).toBeGreaterThan(0);
      expect(
        matchInspectPathToPagesRoute("/docs", routes).some((r) => r.publicPath.includes("[[...")),
      ).toBe(true);
    });
  });
});

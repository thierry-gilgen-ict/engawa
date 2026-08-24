/**
 * @vitest-environment node
 */
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "./cli.js";
import { runInspect } from "./inspect/run-inspect.js";
import { inspectReportSchema } from "./inspect/schema.js";
import { sanitizeTerminalText } from "./sanitize.js";
import { startFixtureServer, startSecondaryFixtureServer } from "./test-helpers/fixture-server.js";

describe("engawa cli", () => {
  it("shows help", async () => {
    const code = await runCli(["--help"]);
    expect(code).toBe(0);
  });

  it("shows version", async () => {
    const code = await runCli(["--version"]);
    expect(code).toBe(0);
  });

  it("inspect requires url", async () => {
    const code = await runCli(["inspect"]);
    expect(code).toBe(1);
  });

  it("rejects invalid url", async () => {
    const code = await runCli(["inspect", "not-a-url"]);
    expect(code).toBe(1);
  });

  it("rejects unsupported scheme", async () => {
    const code = await runCli(["inspect", "file:///etc/passwd"]);
    expect(code).toBe(1);
  });

  it("rejects unknown flag", async () => {
    const code = await runCli(["inspect", "https://example.com", "--bogus"]);
    expect(code).toBe(1);
  });

  it("rejects invalid max-pages", async () => {
    const code = await runCli(["inspect", "https://example.com", "--max-pages", "0"]);
    expect(code).toBe(1);
  });

  it("rejects max-pages above hard limit", async () => {
    const code = await runCli(["inspect", "https://example.com", "--max-pages", "101"]);
    expect(code).toBe(1);
  });

  it("json mode outputs schema report", async () => {
    const fixture = await startFixtureServer({
      markdown: { "/about.md": "# About\n\nPublic page." },
    });
    const dir = await mkdtemp(join(tmpdir(), "engawa-cli-"));
    const out = join(dir, "report.json");
    const code = await runCli([
      "inspect",
      fixture.baseUrl,
      "--allow-local",
      "--json",
      "--output",
      out,
      "--max-pages",
      "5",
    ]);
    expect(code).toBe(0);
    const raw = await readFile(out, "utf8");
    const parsed = inspectReportSchema.parse(JSON.parse(raw));
    expect(parsed.schemaVersion).toBe("engawa.inspect.v1");
    expect(parsed.securityAssessment).toBe("NOT_PERFORMED");
    await fixture.close();
  });

  it("writes markdown output", async () => {
    const fixture = await startFixtureServer();
    const dir = await mkdtemp(join(tmpdir(), "engawa-cli-"));
    const out = join(dir, "report.md");
    const code = await runCli(["inspect", fixture.baseUrl, "--allow-local", "--output", out]);
    expect(code).toBe(0);
    const md = await readFile(out, "utf8");
    expect(md).toContain("# Engawa Agent Readiness Report");
    expect(md).toContain("HUMAN_REVIEW_REQUIRED");
    await fixture.close();
  });

  it("rejects unsupported output extension", async () => {
    const fixture = await startFixtureServer();
    const dir = await mkdtemp(join(tmpdir(), "engawa-cli-"));
    const out = join(dir, "report.txt");
    const code = await runCli(["inspect", fixture.baseUrl, "--allow-local", "--output", out]);
    expect(code).toBe(1);
    await fixture.close();
  });
});

describe("inspect network boundaries", () => {
  it("rejects localhost without allow-local", async () => {
    const fixture = await startFixtureServer();
    await expect(
      runInspect({ inputUrl: fixture.baseUrl, maxPages: 5, timeoutMs: 5000, allowLocal: false }),
    ).rejects.toThrow(/allow-local/i);
    await fixture.close();
  });

  it("accepts localhost with allow-local", async () => {
    const fixture = await startFixtureServer();
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 5,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.crawl.pagesFetched).toBeGreaterThan(0);
    await fixture.close();
  });

  it("does not fetch external links", async () => {
    const fixture = await startFixtureServer();
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 10,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.routes.every((r) => !r.path.includes("evil"))).toBe(true);
    await fixture.close();
  });

  it("enforces page cap", async () => {
    const fixture = await startFixtureServer();
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 2,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.crawl.pagesFetched).toBeLessThanOrEqual(2);
    await fixture.close();
  });

  it("records body too large", async () => {
    const fixture = await startFixtureServer({ largeBody: true });
    const report = await runInspect({
      inputUrl: `${fixture.baseUrl}/large`,
      maxPages: 3,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.crawl.errors.some((e) => e.includes("BODY_TOO_LARGE"))).toBe(true);
    await fixture.close();
  });
});

describe("inspect discovery and scoring", () => {
  it("discovers llms.txt and mcp advertisement", async () => {
    const fixture = await startFixtureServer({
      llmsTxt: "https://fixture.test/mcp\n/about.md",
      markdown: { "/about.md": "# About\n\nText." },
    });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 8,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.agentSurfaces.llmsTxt.exists).toBe(true);
    expect(report.agentSurfaces.mcp.advertised).toBe(true);
    expect(report.agentSurfaces.mcp.protocolVerified).toBe(false);
    await fixture.close();
  });

  it("marks sensitive paths and requires human review", async () => {
    const fixture = await startFixtureServer();
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 8,
      timeoutMs: 5000,
      allowLocal: true,
    });
    const login = report.routes.find((r) => r.path === "/login");
    const about = report.routes.find((r) => r.path === "/about");
    expect(login?.sensitivePathHint).toBe(true);
    expect(login?.engawaCandidate).toBe(false);
    expect(about?.engawaCandidate).toBe(true);
    expect(report.routes.every((r) => r.humanReviewRequired)).toBe(true);
    await fixture.close();
  });

  it("computes deterministic score on rich fixture", async () => {
    const fixture = await startFixtureServer({
      markdown: { "/about.md": "# About\n\nPublic." },
      llmsTxt: "/mcp\n/about.md",
    });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 10,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.score.total).toBeGreaterThan(50);
    expect(report.score.categories.reduce((s, c) => s + c.pointsEarned, 0)).toBe(
      report.score.total,
    );
    await fixture.close();
  });

  it("sanitizes malicious title for terminal output", async () => {
    const malicious = "safe\u001b[31mRED\u001b[0m";
    const fixture = await startFixtureServer({ title: malicious });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 3,
      timeoutMs: 5000,
      allowLocal: true,
    });
    const sanitized = sanitizeTerminalText(report.site.title ?? "");
    expect(sanitized).not.toContain("\u001b");
    await fixture.close();
  });
});

describe("inspect redirect and DNS policy", () => {
  it("enforces redirect limit", async () => {
    const fixture = await startFixtureServer({
      redirectChain: ["/r1", "/r2", "/r3", "/r4", "/r5", "/r6", "/r7"],
    });
    await expect(
      runInspect({
        inputUrl: fixture.baseUrl,
        maxPages: 3,
        timeoutMs: 5000,
        allowLocal: true,
      }),
    ).rejects.toThrow(/Redirect limit exceeded/i);
    await fixture.close();
  });

  it("does not follow post-seed cross-origin redirect", async () => {
    const secondary = await startSecondaryFixtureServer();
    const fixture = await startFixtureServer({
      sitemapXml: `<?xml version="1.0"?><urlset><url><loc>/cross</loc></url></urlset>`,
      pathRedirects: { "/cross": `${secondary.baseUrl}/offsite` },
    });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 5,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(secondary.requestLog).toHaveLength(0);
    expect(report.crawl.errors.some((e) => e.includes("Cross-origin redirect blocked"))).toBe(true);
    await fixture.close();
    await secondary.close();
  });
});

describe("inspect optional discovery fail-soft", () => {
  it("continues when robots.txt times out", async () => {
    const fixture = await startFixtureServer({
      hangPaths: ["/robots.txt"],
      hangDelayMs: 200,
    });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 3,
      timeoutMs: 50,
      allowLocal: true,
    });
    expect(report.schemaVersion).toBe("engawa.inspect.v1");
    expect(report.crawl.errors.some((e) => e.includes("robots.txt"))).toBe(true);
    await fixture.close();
  });

  it("continues when llms.txt fetch fails", async () => {
    const fixture = await startFixtureServer({ failPaths: ["/llms.txt"] });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 3,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.agentSurfaces.llmsTxt.exists).toBe(false);
    expect(report.crawl.errors.some((e) => e.includes("llms.txt"))).toBe(true);
    await fixture.close();
  });

  it("continues when a markdown sample fails", async () => {
    const fixture = await startFixtureServer({
      llmsTxt: "/about.md",
      failPaths: ["/about.md"],
    });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 3,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.agentSurfaces.markdown.resourcesVerified).toBe(0);
    expect(report.crawl.errors.some((e) => e.includes("markdown"))).toBe(true);
    await fixture.close();
  });
});

describe("inspect scoring correctness", () => {
  it("requires canonical link for canonical metadata score", async () => {
    const fixture = await startFixtureServer({ omitCanonical: true, title: "Only Title" });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 3,
      timeoutMs: 5000,
      allowLocal: true,
    });
    const canonical = report.score.categories.find((c) => c.id === "CANONICAL_METADATA_PRESENT");
    expect(canonical?.pointsEarned).toBe(0);
    await fixture.close();
  });

  it("awards scored categories only with evidence", async () => {
    const fixture = await startFixtureServer({
      markdown: { "/about.md": "# About\n\nPublic." },
      llmsTxt: "/mcp\n/about.md",
    });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 10,
      timeoutMs: 5000,
      allowLocal: true,
    });
    for (const cat of report.score.categories) {
      if (cat.pointsEarned > 0) {
        expect(cat.evidence.length).toBeGreaterThan(0);
      }
    }
    await fixture.close();
  });

  it("does not infer agent onboarding from blind /agents 200", async () => {
    const fixture = await startFixtureServer();
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 5,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.agentSurfaces.agentOnboarding.status).toBe("NOT_FOUND");
    const onboarding = report.score.categories.find((c) => c.id === "AGENT_ONBOARDING_PAGE");
    expect(onboarding?.pointsEarned).toBe(0);
    await fixture.close();
  });

  it("rejects MCP substring false positive", async () => {
    const fixture = await startFixtureServer({
      llmsTxt: "/about.md",
      extraLinks: ["/mcpherson"],
    });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 5,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.agentSurfaces.mcp.advertised).toBe(false);
    await fixture.close();
  });
});

describe("inspect crawl budget", () => {
  it("does not overshoot primary crawl page budget", async () => {
    const fixture = await startFixtureServer({
      sitemapXml: `<?xml version="1.0"?><urlset>
        <url><loc>/page1</loc></url>
        <url><loc>/page2</loc></url>
        <url><loc>/page3</loc></url>
        <url><loc>/page4</loc></url>
        <url><loc>/page5</loc></url>
      </urlset>`,
    });
    const report = await runInspect({
      inputUrl: fixture.baseUrl,
      maxPages: 2,
      timeoutMs: 5000,
      allowLocal: true,
    });
    expect(report.crawl.pagesFetched).toBeLessThanOrEqual(2);
    const crawlPaths = ["/page1", "/page2", "/page3", "/page4", "/page5", "/about", "/services"];
    const crawlPageHits = fixture.requestLog.filter((p) => crawlPaths.includes(p)).length;
    expect(crawlPageHits).toBeLessThanOrEqual(2);
    await fixture.close();
  });
});

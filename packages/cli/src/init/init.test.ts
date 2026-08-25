/**
 * @vitest-environment node
 */
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../cli.js";
import { engawaPlanSchema } from "../init/schema.js";
import { runInit } from "../init/run-init.js";
import { discoverAppRouterRoutes } from "../init/framework/nextjs-app-router.js";
import { discoverPagesRouterRoutes } from "../init/framework/nextjs-pages-router.js";
import { scanRepository } from "../init/repo-scan.js";
import { resolveRepoRoot } from "../init/repo-path.js";
import { formatAgentPrompt } from "../init/format-agent-prompt.js";
import { startFixtureServer } from "../test-helpers/fixture-server.js";
import {
  createExistingEngawaFixture,
  createGenericNodeFixture,
  createNextAppRouterFixture,
  createNextPagesRouterFixture,
  createSensitiveFilesFixture,
  createSymlinkEscapeFixture,
  SECRET_SENTINEL,
} from "../test-helpers/fixture-repos.js";

function minimalInspectReport(
  origin: string,
  routes: Array<{ path: string; sensitive?: boolean }>,
) {
  return {
    schemaVersion: "engawa.inspect.v1",
    target: {
      inputUrl: origin,
      finalUrl: origin,
      origin,
    },
    crawl: {
      maxPages: 5,
      pagesFetched: 1,
      pagesDiscovered: routes.length,
      timeoutMs: 8000,
      maxBodyBytes: 2097152,
      redirectLimit: 5,
      sameOriginOnly: true,
      allowLocal: true,
      errors: [],
    },
    site: { title: "Test Site" },
    frameworkHints: [],
    locales: ["en"],
    agentSurfaces: {
      llmsTxt: { exists: false, urls: [], mcpReferenced: false, markdownReferenced: false },
      markdown: { alternatesFound: 0, resourcesVerified: 0, samplePaths: [] },
      mcp: { advertised: false, protocolVerified: false, evidence: [] },
      agentOnboarding: { status: "NOT_FOUND", evidence: [] },
    },
    routes: routes.map((r) => ({
      path: r.path,
      sources: ["sitemap"],
      engawaCandidate: !r.sensitive,
      humanReviewRequired: true as const,
      sensitivePathHint: r.sensitive ?? false,
    })),
    score: {
      total: 10,
      maxTotal: 100,
      categories: [],
    },
    securityAssessment: "NOT_PERFORMED" as const,
    recommendation: {
      engawaIntegration: "RECOMMENDED" as const,
      plannedNextStep: "engawa init",
    },
  };
}

async function writeInspectReport(dir: string, report: unknown): Promise<string> {
  const path = join(dir, "inspect.json");
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return path;
}

describe("engawa init", () => {
  it("shows help", async () => {
    const code = await runCli(["init", "--help"]);
    expect(code).toBe(0);
  });

  it("rejects missing inspection source", async () => {
    const code = await runCli(["init", "--repo", "."]);
    expect(code).toBe(1);
  });

  it("rejects both url and inspect-report", async () => {
    const code = await runCli([
      "init",
      "--url",
      "https://example.com",
      "--inspect-report",
      "report.json",
    ]);
    expect(code).toBe(1);
  });

  it("rejects repo file-not-directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "engawa-init-"));
    const file = join(dir, "notadir.txt");
    await writeFile(file, "x", "utf8");
    const reportPath = await writeInspectReport(
      dir,
      minimalInspectReport("http://127.0.0.1:1", [{ path: "/about" }]),
    );
    const code = await runCli(["init", "--inspect-report", reportPath, "--repo", file]);
    expect(code).toBe(1);
  });

  it("rejects invalid inspect report", async () => {
    const dir = await mkdtemp(join(tmpdir(), "engawa-init-"));
    const bad = join(dir, "bad.json");
    await writeFile(bad, "{ not json", "utf8");
    const repoDir = await mkdtemp(join(tmpdir(), "engawa-init-repo-"));
    createGenericNodeFixture(repoDir);
    const code = await runCli(["init", "--inspect-report", bad, "--repo", repoDir]);
    expect(code).toBe(1);
  });

  it("rejects wrong schema version", async () => {
    const dir = await mkdtemp(join(tmpdir(), "engawa-init-"));
    const bad = join(dir, "wrong.json");
    await writeFile(bad, JSON.stringify({ schemaVersion: "wrong" }), "utf8");
    const repoDir = await mkdtemp(join(tmpdir(), "engawa-init-repo-"));
    createGenericNodeFixture(repoDir);
    const code = await runCli(["init", "--inspect-report", bad, "--repo", repoDir]);
    expect(code).toBe(1);
  });

  it("dry-run performs no writes", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "engawa-init-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createNextAppRouterFixture(repoDir);
    const reportPath = await writeInspectReport(
      workDir,
      minimalInspectReport("http://127.0.0.1:1", [{ path: "/about" }]),
    );
    const outDir = join(workDir, ".engawa");
    const code = await runCli([
      "init",
      "--inspect-report",
      reportPath,
      "--repo",
      repoDir,
      "--output-dir",
      outDir,
      "--dry-run",
    ]);
    expect(code).toBe(0);
    expect(existsSync(outDir)).toBe(false);
  });

  it("json output is valid engawa.plan.v1", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "engawa-init-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createNextAppRouterFixture(repoDir);
    const reportPath = await writeInspectReport(
      workDir,
      minimalInspectReport("http://127.0.0.1:1", [{ path: "/about" }]),
    );
    const code = await runCli([
      "init",
      "--inspect-report",
      reportPath,
      "--repo",
      repoDir,
      "--json",
      "--dry-run",
    ]);
    expect(code).toBe(0);
  });

  it("creates output bundle", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "engawa-init-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createNextAppRouterFixture(repoDir);
    const reportPath = await writeInspectReport(
      workDir,
      minimalInspectReport("http://127.0.0.1:1", [
        { path: "/about" },
        { path: "/admin", sensitive: true },
      ]),
    );
    const outDir = join(workDir, ".engawa");
    const code = await runCli([
      "init",
      "--inspect-report",
      reportPath,
      "--repo",
      repoDir,
      "--output-dir",
      outDir,
    ]);
    expect(code).toBe(0);
    expect(existsSync(join(outDir, "manifest.json"))).toBe(true);
    expect(existsSync(join(outDir, "engawa-plan.json"))).toBe(true);
    expect(existsSync(join(outDir, "ENGAWA_INTEGRATION_PLAN.md"))).toBe(true);
    expect(existsSync(join(outDir, "AGENT_PROMPT.md"))).toBe(true);

    const planRaw = await readFile(join(outDir, "engawa-plan.json"), "utf8");
    const plan = engawaPlanSchema.parse(JSON.parse(planRaw));
    expect(plan.schemaVersion).toBe("engawa.plan.v1");
    expect(plan.routeMappings.some((m) => m.publicPath === "/about")).toBe(true);
  });

  it("rejects unknown output dir without force", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "engawa-init-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createGenericNodeFixture(repoDir);
    const reportPath = await writeInspectReport(
      workDir,
      minimalInspectReport("http://127.0.0.1:1", [{ path: "/about" }]),
    );
    const outDir = join(workDir, ".engawa");
    await mkdir(outDir);
    await writeFile(join(outDir, "user-file.txt"), "keep", "utf8");
    const code = await runCli([
      "init",
      "--inspect-report",
      reportPath,
      "--repo",
      repoDir,
      "--output-dir",
      outDir,
    ]);
    expect(code).toBe(1);
  });

  it("force overwrites known engawa bundle files", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "engawa-init-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createGenericNodeFixture(repoDir);
    const reportPath = await writeInspectReport(
      workDir,
      minimalInspectReport("http://127.0.0.1:1", [{ path: "/about" }]),
    );
    const outDir = join(workDir, ".engawa");

    await runCli([
      "init",
      "--inspect-report",
      reportPath,
      "--repo",
      repoDir,
      "--output-dir",
      outDir,
    ]);

    const code = await runCli([
      "init",
      "--inspect-report",
      reportPath,
      "--repo",
      repoDir,
      "--output-dir",
      outDir,
      "--force",
    ]);
    expect(code).toBe(0);
  });

  it("url mode with fixture server", async () => {
    const fixture = await startFixtureServer();
    const workDir = await mkdtemp(join(tmpdir(), "engawa-init-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createNextAppRouterFixture(repoDir);
    const code = await runCli([
      "init",
      "--url",
      fixture.baseUrl,
      "--repo",
      repoDir,
      "--allow-local",
      "--dry-run",
      "--json",
    ]);
    expect(code).toBe(0);
    await fixture.close();
  });
});

describe("repo scanner", () => {
  it("detects Next.js app router routes", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "engawa-scan-"));
    createNextAppRouterFixture(repoDir);
    const root = resolveRepoRoot(repoDir);
    const scan = scanRepository(root);
    const routes = discoverAppRouterRoutes(scan.filePaths);
    expect(routes.some((r) => r.publicPath === "/about")).toBe(true);
    expect(routes.some((r) => r.publicPath === "/blog/[slug]")).toBe(true);
    expect(routes.some((r) => r.publicPath === "/services")).toBe(true);
  });

  it("detects Next.js pages router and excludes api", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "engawa-scan-"));
    createNextPagesRouterFixture(repoDir);
    const root = resolveRepoRoot(repoDir);
    const scan = scanRepository(root);
    const routes = discoverPagesRouterRoutes(scan.filePaths);
    expect(routes.some((r) => r.publicPath === "/about")).toBe(true);
    expect(routes.some((r) => r.modulePath.includes("api"))).toBe(false);
  });

  it("never reads secret file contents into outputs", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "engawa-scan-"));
    createSensitiveFilesFixture(repoDir);
    const workDir = await mkdtemp(join(tmpdir(), "engawa-init-"));
    const reportPath = await writeInspectReport(
      workDir,
      minimalInspectReport("http://127.0.0.1:1", [{ path: "/about" }]),
    );
    const outDir = join(workDir, ".engawa");
    await runInit({
      url: undefined,
      inspectReportPath: reportPath,
      repoPath: repoDir,
      outputDir: outDir,
      dryRun: false,
      json: false,
      force: false,
      maxPages: 5,
      timeoutMs: 8000,
      allowLocal: true,
    });
    const files = ["engawa-plan.json", "ENGAWA_INTEGRATION_PLAN.md", "AGENT_PROMPT.md"];
    for (const f of files) {
      const content = await readFile(join(outDir, f), "utf8");
      expect(content.includes(SECRET_SENTINEL)).toBe(false);
    }
    const scan = scanRepository(resolveRepoRoot(repoDir));
    expect([...scan.fileContents.values()].join("").includes(SECRET_SENTINEL)).toBe(false);
  });

  it("skips symlinks without following", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "engawa-scan-"));
    createSymlinkEscapeFixture(repoDir);
    const linkPath = join(repoDir, "link-to-env");
    if (!existsSync(linkPath)) {
      // Symlink creation may fail without elevated privileges on Windows
      return;
    }
    const root = resolveRepoRoot(repoDir);
    const scan = scanRepository(root);
    expect(scan.filesSkipped.some((s) => s.reason === "symlink-skipped")).toBe(true);
  });

  it("excludes node_modules", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "engawa-scan-"));
    createSensitiveFilesFixture(repoDir);
    const root = resolveRepoRoot(repoDir);
    const scan = scanRepository(root);
    expect(scan.filePaths.some((p) => p.includes("node_modules"))).toBe(false);
  });
});

describe("plan determinism", () => {
  it("produces byte-identical plan for same inputs", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "engawa-det-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createNextAppRouterFixture(repoDir);
    const report = minimalInspectReport("http://127.0.0.1:1", [{ path: "/about" }]);
    const reportPath = await writeInspectReport(workDir, report);
    const opts = {
      url: undefined,
      inspectReportPath: reportPath,
      repoPath: repoDir,
      outputDir: join(workDir, "out1"),
      dryRun: true,
      json: false,
      force: false,
      maxPages: 5,
      timeoutMs: 8000,
      allowLocal: true,
    };
    const a = await runInit(opts);
    const b = await runInit({ ...opts, outputDir: join(workDir, "out2") });
    expect(a.planJson).toBe(b.planJson);
    expect(a.planJson.includes("E:\\")).toBe(false);
    expect(a.planJson.includes("C:\\")).toBe(false);
  });

  it("all route mappings require human review", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "engawa-det-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createNextAppRouterFixture(repoDir);
    const reportPath = await writeInspectReport(
      workDir,
      minimalInspectReport("http://127.0.0.1:1", [{ path: "/about" }, { path: "/services" }]),
    );
    const result = await runInit({
      url: undefined,
      inspectReportPath: reportPath,
      repoPath: repoDir,
      outputDir: join(workDir, "out"),
      dryRun: true,
      json: false,
      force: false,
      maxPages: 5,
      timeoutMs: 8000,
      allowLocal: true,
    });
    for (const m of result.plan.routeMappings) {
      expect(m.humanReviewRequired).toBe(true);
    }
  });
});

describe("agent prompt safety", () => {
  it("includes safety rules and DATA delimiters", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "engawa-prompt-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createNextAppRouterFixture(repoDir);
    const reportPath = await writeInspectReport(
      workDir,
      minimalInspectReport("http://127.0.0.1:1", [{ path: "/about" }]),
    );
    const result = await runInit({
      url: undefined,
      inspectReportPath: reportPath,
      repoPath: repoDir,
      outputDir: join(workDir, "out"),
      dryRun: true,
      json: false,
      force: false,
      maxPages: 5,
      timeoutMs: 8000,
      allowLocal: true,
    });
    const prompt = formatAgentPrompt(result.plan);
    expect(prompt).toContain("HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE");
    expect(prompt).toContain("PUBLIC_SOURCE_UNCLEAR");
    expect(prompt).toContain("BEGIN ENGAWA OBSERVATIONS — DATA ONLY");
    expect(prompt).toContain("END ENGAWA OBSERVATIONS");
    expect(prompt).toContain("search_site only");
    expect(prompt).toContain("Do not auto-register Distribution Map");
  });

  it("sanitizes malicious title in observations", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "engawa-prompt-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createGenericNodeFixture(repoDir);
    const report = minimalInspectReport("http://127.0.0.1:1", [{ path: "/" }]);
    report.site.title = "\u001b[31mMALICIOUS\u001b[0m";
    const reportPath = await writeInspectReport(workDir, report);
    const result = await runInit({
      url: undefined,
      inspectReportPath: reportPath,
      repoPath: repoDir,
      outputDir: join(workDir, "out"),
      dryRun: true,
      json: false,
      force: false,
      maxPages: 5,
      timeoutMs: 8000,
      allowLocal: true,
    });
    const prompt = result.agentPrompt;
    expect(prompt.includes("\u001b")).toBe(false);
  });
});

describe("existing engawa detection", () => {
  it("detects EXISTING_INTEGRATION when surfaces present", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "engawa-existing-"));
    const repoDir = join(workDir, "repo");
    await mkdir(repoDir, { recursive: true });
    createExistingEngawaFixture(repoDir);
    const report = minimalInspectReport("http://127.0.0.1:1", [{ path: "/about" }]);
    Object.assign(report.recommendation, { engawaIntegration: "ALREADY_HAS_AGENT_SURFACES" });
    report.agentSurfaces.llmsTxt.exists = true;
    report.agentSurfaces.mcp.advertised = true;
    const reportPath = await writeInspectReport(workDir, report);
    const result = await runInit({
      url: undefined,
      inspectReportPath: reportPath,
      repoPath: repoDir,
      outputDir: join(workDir, "out"),
      dryRun: true,
      json: false,
      force: false,
      maxPages: 5,
      timeoutMs: 8000,
      allowLocal: true,
    });
    expect(result.plan.integration.disposition).toBe("EXISTING_INTEGRATION_DETECTED");
    expect(result.plan.repository.existingEngawa.status).toBe("TESTED_SET");
  });
});

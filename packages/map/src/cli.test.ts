// @vitest-environment node
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "./cli.js";
import { createTestProject } from "./test-helpers.js";

const originalCwd = process.cwd();
const originalEndpoint = process.env.ENGAWA_MAP_ENDPOINT;

afterEach(async () => {
  vi.restoreAllMocks();
  process.chdir(originalCwd);
  if (originalEndpoint === undefined) {
    delete process.env.ENGAWA_MAP_ENDPOINT;
  } else {
    process.env.ENGAWA_MAP_ENDPOINT = originalEndpoint;
  }
});

describe("cli", () => {
  it("rejects --token flag", async () => {
    const code = await runCli(["register", "--token=secret"]);
    expect(code).toBe(1);
  });

  it("prints usage for unknown commands", async () => {
    const code = await runCli(["unknown"]);
    expect(code).toBe(1);
  });

  it("reports missing config without stack trace", async () => {
    const projectRoot = await createTestProject();
    await writeFile(join(projectRoot, "engawa-map.config.json"), "", "utf8");
    process.chdir(projectRoot);
    delete process.env.ENGAWA_MAP_ENDPOINT;

    const code = await runCli(["register", "--dry-run"]);
    expect(code).toBe(1);
  });

  it("reports malformed config without stack trace", async () => {
    const projectRoot = await createTestProject();
    await writeFile(join(projectRoot, "engawa-map.config.json"), "{not-json", "utf8");
    process.chdir(projectRoot);
    delete process.env.ENGAWA_MAP_ENDPOINT;

    const code = await runCli(["register", "--dry-run"]);
    expect(code).toBe(1);
  });

  it("reports invalid endpoint without stack trace", async () => {
    const projectRoot = await createTestProject();
    process.chdir(projectRoot);
    process.env.ENGAWA_MAP_ENDPOINT = "http://evil.example.com";

    const code = await runCli(["register", "--yes"]);
    expect(code).toBe(1);
  });

  it("uses production default when endpoint unset", async () => {
    const projectRoot = await createTestProject();
    process.chdir(projectRoot);
    delete process.env.ENGAWA_MAP_ENDPOINT;
    const fetchSpy = vi.fn(async (input) => {
      expect(String(input)).toContain("https://engawa-map.thierry-gilgen-ict.ch");
      throw new Error("blocked");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const code = await runCli(["register", "--yes"]);
    expect(code).toBe(1);
    expect(fetchSpy).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("reports malformed package.json without stack trace", async () => {
    const projectRoot = await createTestProject();
    await writeFile(join(projectRoot, "package.json"), "{not-json", "utf8");
    process.chdir(projectRoot);
    delete process.env.ENGAWA_MAP_ENDPOINT;

    const stderrChunks: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    vi.spyOn(process.stderr, "write").mockImplementation((chunk, ...args) => {
      stderrChunks.push(String(chunk));
      return originalWrite(chunk, ...args);
    });

    const code = await runCli(["register", "--dry-run"]);
    expect(code).toBe(1);
    const stderr = stderrChunks.join("");
    expect(stderr).not.toContain("SyntaxError");
    expect(stderr).not.toMatch(/\n\s+at /);
  });
  it("reports invalid installed semver without stack trace or SemverError", async () => {
    const projectRoot = await createTestProject({ includeOptionalPackages: false });
    const { REQUIRED_ENGAWA_PACKAGE } = await import("./constants.js");
    const { join } = await import("node:path");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      join(projectRoot, "node_modules", REQUIRED_ENGAWA_PACKAGE, "package.json"),
      JSON.stringify({ name: REQUIRED_ENGAWA_PACKAGE, version: "not-a-semver" }, null, 2),
      "utf8",
    );
    process.chdir(projectRoot);
    delete process.env.ENGAWA_MAP_ENDPOINT;

    const stderrChunks: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    vi.spyOn(process.stderr, "write").mockImplementation((chunk, ...args) => {
      stderrChunks.push(String(chunk));
      return originalWrite(chunk, ...args);
    });

    const code = await runCli(["register", "--dry-run"]);
    expect(code).toBe(1);
    const stderr = stderrChunks.join("");
    expect(stderr).not.toContain("SemverError");
    expect(stderr).not.toMatch(/\n\s+at /);
  });
});

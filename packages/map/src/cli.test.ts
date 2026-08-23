// @vitest-environment node
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "./cli.js";
import { createTestProject } from "./test-helpers.js";

const originalCwd = process.cwd();
const originalEndpoint = process.env.ENGAWA_MAP_ENDPOINT;

afterEach(async () => {
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

  it("reports missing endpoint without stack trace", async () => {
    const projectRoot = await createTestProject();
    process.chdir(projectRoot);
    delete process.env.ENGAWA_MAP_ENDPOINT;

    const code = await runCli(["register", "--yes"]);
    expect(code).toBe(1);
  });
});

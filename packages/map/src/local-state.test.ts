// @vitest-environment node
import { execFile } from "node:child_process";
import * as fsPromises from "node:fs/promises";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    rename: vi.fn(actual.rename),
  };
});

import { ensureGitignoreGuard, readLocalState, writeLocalState } from "./local-state.js";
import { createTestProject } from "./test-helpers.js";

const execFileAsync = promisify(execFile);

describe("local secret state", () => {
  it("adds gitignore guard and writes atomically", async () => {
    const projectRoot = await createTestProject();
    await ensureGitignoreGuard(projectRoot);
    const gitignore = await readFile(join(projectRoot, ".gitignore"), "utf8");
    expect(gitignore).toContain(".engawa-map.local.json");

    await writeLocalState(projectRoot, {
      registration: {
        state: "pending-request",
        canonicalUrl: "https://example.com",
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
        siteToken: "secret-token",
        payloadHash: "deadbeef",
      },
    });

    const state = await readLocalState(projectRoot);
    expect(state?.registration.state).toBe("pending-request");
  });

  it("refuses SECRET_WRITE when local state file is git tracked", async () => {
    const projectRoot = await createTestProject();
    await execFileAsync("git", ["init"], { cwd: projectRoot });
    await writeFile(join(projectRoot, ".engawa-map.local.json"), "{}\n", "utf8");
    await execFileAsync("git", ["add", ".engawa-map.local.json"], { cwd: projectRoot });

    await expect(
      writeLocalState(projectRoot, {
        registration: {
          state: "pending-request",
          canonicalUrl: "https://example.com",
          idempotencyKey: "550e8400-e29b-41d4-a716-446655440001",
          siteToken: "secret-token",
          payloadHash: "deadbeef",
        },
      }),
    ).rejects.toMatchObject({ code: "SECRET_WRITE" });
  });

  it("cleans up temp file and preserves error when rename fails", async () => {
    const projectRoot = await createTestProject();
    const renameError = Object.assign(new Error("rename failed"), { code: "EACCES" });
    const renameSpy = vi.spyOn(fsPromises, "rename").mockRejectedValue(renameError);

    await expect(
      writeLocalState(projectRoot, {
        registration: {
          state: "pending-request",
          canonicalUrl: "https://example.com",
          idempotencyKey: "550e8400-e29b-41d4-a716-446655440002",
          siteToken: "secret-token",
          payloadHash: "deadbeef",
        },
      }),
    ).rejects.toThrow("rename failed");

    const entries = await readdir(projectRoot);
    expect(entries.some((name) => name.endsWith(".tmp"))).toBe(false);
    renameSpy.mockRestore();
  });
});

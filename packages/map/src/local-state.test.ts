// @vitest-environment node
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ensureGitignoreGuard, readLocalState, writeLocalState } from "./local-state.js";
import { createTestProject } from "./test-helpers.js";

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
      },
    });

    const state = await readLocalState(projectRoot);
    expect(state?.registration.state).toBe("pending-request");
  });
});

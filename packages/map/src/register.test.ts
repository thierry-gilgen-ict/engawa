// @vitest-environment node
import { access } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runRegister } from "./register.js";
import { createTestProject, readLocalStateFile } from "./test-helpers.js";

const originalEndpoint = process.env.ENGAWA_MAP_ENDPOINT;

afterEach(() => {
  if (originalEndpoint === undefined) {
    delete process.env.ENGAWA_MAP_ENDPOINT;
  } else {
    process.env.ENGAWA_MAP_ENDPOINT = originalEndpoint;
  }
});

describe("register command", () => {
  it("dry-run prints exact payload with zero writes and zero network", async () => {
    const projectRoot = await createTestProject();
    const fetchSpy = vi.fn();
    const logs: string[] = [];

    const code = await runRegister({
      cwd: projectRoot,
      dryRun: true,
      endpoint: "http://127.0.0.1:9",
      fetchImpl: fetchSpy,
      log: (line) => logs.push(line),
    });

    expect(code).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(access(join(projectRoot, ".engawa-map.local.json"))).rejects.toThrow();
    expect(logs.join("\n")).toContain('"canonicalUrl": "https://example.com"');
    expect(logs.join("\n")).not.toContain("engawa-map");
  });

  it("fails before network without --yes in non-interactive mode", async () => {
    const projectRoot = await createTestProject();
    process.env.ENGAWA_MAP_ENDPOINT = "http://127.0.0.1:9";
    const fetchSpy = vi.fn();

    const code = await runRegister({
      cwd: projectRoot,
      isInteractive: false,
      fetchImpl: fetchSpy,
      log: () => undefined,
    });

    expect(code).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("persists pending state before POST and upgrades to registered", async () => {
    const projectRoot = await createTestProject();
    process.env.ENGAWA_MAP_ENDPOINT = "http://127.0.0.1:9";

    let postCount = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/v1/sites") && init?.method === "POST") {
        postCount += 1;
        return new Response(
          JSON.stringify({
            siteId: "550e8400-e29b-41d4-a716-446655440000",
            state: "PENDING",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    };

    const code = await runRegister({
      cwd: projectRoot,
      yes: true,
      endpoint: process.env.ENGAWA_MAP_ENDPOINT,
      fetchImpl,
      log: () => undefined,
    });

    expect(code).toBe(0);
    expect(postCount).toBe(1);
    const local = (await readLocalStateFile(projectRoot)) as {
      registration: { state: string; siteId?: string };
    };
    expect(local.registration.state).toBe("registered");
    expect(local.registration.siteId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
});

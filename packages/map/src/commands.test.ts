// @vitest-environment node
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveSiteToken } from "./local-state.js";
import { runStatus } from "./status.js";
import { runUnregister } from "./unregister.js";
import { createTestProject } from "./test-helpers.js";

const originalEndpoint = process.env.ENGAWA_MAP_ENDPOINT;
const originalToken = process.env.ENGAWA_MAP_TOKEN;

afterEach(() => {
  if (originalEndpoint === undefined) {
    delete process.env.ENGAWA_MAP_ENDPOINT;
  } else {
    process.env.ENGAWA_MAP_ENDPOINT = originalEndpoint;
  }
  if (originalToken === undefined) {
    delete process.env.ENGAWA_MAP_TOKEN;
  } else {
    process.env.ENGAWA_MAP_TOKEN = originalToken;
  }
});

describe("status and unregister commands", () => {
  it("prefers ENGAWA_MAP_TOKEN over local file", () => {
    const token = resolveSiteToken("env-token", {
      registration: {
        state: "registered",
        siteId: "550e8400-e29b-41d4-a716-446655440000",
        canonicalUrl: "https://example.com",
        siteToken: "file-token",
      },
    });
    expect(token).toBe("env-token");
  });

  it("status uses bearer auth against registry", async () => {
    const projectRoot = await createTestProject();
    await writeFile(
      join(projectRoot, "engawa-map.config.json"),
      JSON.stringify(
        {
          displayName: "Test Site",
          canonicalUrl: "https://example.com",
          siteId: "550e8400-e29b-41d4-a716-446655440000",
        },
        null,
        2,
      ),
      "utf8",
    );

    process.env.ENGAWA_MAP_ENDPOINT = "http://127.0.0.1:9";
    process.env.ENGAWA_MAP_TOKEN = "bearer-token";

    const fetchImpl: typeof fetch = async (input, init) => {
      expect(String(input)).toContain("/status");
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer bearer-token");
      return new Response(
        JSON.stringify({
          siteId: "550e8400-e29b-41d4-a716-446655440000",
          state: "PENDING",
          displayName: "Test\u0007Site",
          canonicalUrl: "https://example.com",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const logs: string[] = [];
    const code = await runStatus({
      cwd: projectRoot,
      endpoint: process.env.ENGAWA_MAP_ENDPOINT,
      envToken: process.env.ENGAWA_MAP_TOKEN,
      fetchImpl,
      log: (line) => logs.push(line),
    });

    expect(code).toBe(0);
    expect(logs.join("\n")).toContain("displayName=TestSite");
  });

  it("unregister sends DELETE with bearer token", async () => {
    const projectRoot = await createTestProject();
    await writeFile(
      join(projectRoot, "engawa-map.config.json"),
      JSON.stringify(
        {
          displayName: "Test Site",
          canonicalUrl: "https://example.com",
          siteId: "550e8400-e29b-41d4-a716-446655440000",
        },
        null,
        2,
      ),
      "utf8",
    );

    process.env.ENGAWA_MAP_ENDPOINT = "http://127.0.0.1:9";
    process.env.ENGAWA_MAP_TOKEN = "bearer-token";

    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));

    const code = await runUnregister({
      cwd: projectRoot,
      endpoint: process.env.ENGAWA_MAP_ENDPOINT,
      envToken: process.env.ENGAWA_MAP_TOKEN,
      fetchImpl,
      log: () => undefined,
    });

    expect(code).toBe(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

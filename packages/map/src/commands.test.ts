// @vitest-environment node
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveSiteToken } from "./local-state.js";
import { runStatus } from "./status.js";
import { runUnregister } from "./unregister.js";
import { createTestProject, readLocalStateFile, readMapConfigFile } from "./test-helpers.js";

const originalEndpoint = process.env.ENGAWA_MAP_ENDPOINT;
const originalToken = process.env.ENGAWA_MAP_TOKEN;

afterEach(() => {
  vi.restoreAllMocks();
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

  it("unregister cleans up local state and config siteId on 204", async () => {
    const projectRoot = await createTestProject();
    const siteId = "550e8400-e29b-41d4-a716-446655440000";

    await writeFile(
      join(projectRoot, "engawa-map.config.json"),
      JSON.stringify(
        {
          displayName: "Test Site",
          canonicalUrl: "https://example.com",
          siteId,
          hints: { framework: "nextjs", byaEnabled: true, localeCount: 2 },
        },
        null,
        2,
      ),
      "utf8",
    );

    const { writeLocalState } = await import("./local-state.js");
    await writeLocalState(projectRoot, {
      registration: {
        state: "registered",
        siteId,
        canonicalUrl: "https://example.com",
        siteToken: "bearer-token",
      },
    });

    process.env.ENGAWA_MAP_ENDPOINT = "http://127.0.0.1:9";
    process.env.ENGAWA_MAP_TOKEN = "bearer-token";

    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));

    const logs: string[] = [];
    const code = await runUnregister({
      cwd: projectRoot,
      endpoint: process.env.ENGAWA_MAP_ENDPOINT,
      envToken: process.env.ENGAWA_MAP_TOKEN,
      fetchImpl,
      log: (line) => logs.push(line),
    });

    expect(code).toBe(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
    await expect(access(join(projectRoot, ".engawa-map.local.json"))).rejects.toThrow();

    const config = (await readMapConfigFile(projectRoot)) as {
      displayName: string;
      canonicalUrl: string;
      siteId?: string;
      hints?: unknown;
    };
    expect(config.siteId).toBeUndefined();
    expect(config.displayName).toBe("Test Site");
    expect(config.canonicalUrl).toBe("https://example.com");
    expect(config.hints).toEqual({ framework: "nextjs", byaEnabled: true, localeCount: 2 });
    expect(logs.join("\n")).toMatch(/clear it manually/i);
  });

  it("unregister retains local credentials on failed DELETE", async () => {
    const projectRoot = await createTestProject();
    const siteId = "550e8400-e29b-41d4-a716-446655440000";

    await writeFile(
      join(projectRoot, "engawa-map.config.json"),
      JSON.stringify(
        {
          displayName: "Test Site",
          canonicalUrl: "https://example.com",
          siteId,
        },
        null,
        2,
      ),
      "utf8",
    );

    const { writeLocalState } = await import("./local-state.js");
    await writeLocalState(projectRoot, {
      registration: {
        state: "registered",
        siteId,
        canonicalUrl: "https://example.com",
        siteToken: "bearer-token",
      },
    });

    process.env.ENGAWA_MAP_ENDPOINT = "http://127.0.0.1:9";
    process.env.ENGAWA_MAP_TOKEN = "bearer-token";

    const fetchImpl = vi.fn(async () => new Response("server error", { status: 500 }));

    const code = await runUnregister({
      cwd: projectRoot,
      endpoint: process.env.ENGAWA_MAP_ENDPOINT,
      envToken: process.env.ENGAWA_MAP_TOKEN,
      fetchImpl,
      log: () => undefined,
    });

    expect(code).toBe(1);
    const local = (await readLocalStateFile(projectRoot)) as {
      registration: { siteId: string; siteToken: string };
    };
    expect(local.registration.siteId).toBe(siteId);
    expect(local.registration.siteToken).toBe("bearer-token");

    const config = (await readMapConfigFile(projectRoot)) as { siteId?: string };
    expect(config.siteId).toBe(siteId);
  });

  it("unregister reports partial success when secret cleanup fails after 204", async () => {
    const projectRoot = await createTestProject();
    const siteId = "550e8400-e29b-41d4-a716-446655440000";

    await writeFile(
      join(projectRoot, "engawa-map.config.json"),
      JSON.stringify(
        {
          displayName: "Test Site",
          canonicalUrl: "https://example.com",
          siteId,
        },
        null,
        2,
      ),
      "utf8",
    );

    const { writeLocalState } = await import("./local-state.js");
    await writeLocalState(projectRoot, {
      registration: {
        state: "registered",
        siteId,
        canonicalUrl: "https://example.com",
        siteToken: "bearer-token",
      },
    });

    process.env.ENGAWA_MAP_ENDPOINT = "http://127.0.0.1:9";
    process.env.ENGAWA_MAP_TOKEN = "bearer-token";

    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const localState = await import("./local-state.js");
    vi.spyOn(localState, "clearLocalState").mockRejectedValueOnce(new Error("permission denied"));

    const logs: string[] = [];
    const code = await runUnregister({
      cwd: projectRoot,
      endpoint: process.env.ENGAWA_MAP_ENDPOINT,
      envToken: process.env.ENGAWA_MAP_TOKEN,
      fetchImpl,
      log: (line) => logs.push(line),
    });

    expect(code).toBe(1);
    const output = logs.join("\n");
    expect(output).toContain("delisted successfully");
    expect(output).toContain("permission denied");
    expect(output).not.toContain("Unregister failed");
    expect(output).not.toMatch(/retry/i);
  });

  it("unregister reports partial success when config cleanup fails after 204", async () => {
    const projectRoot = await createTestProject();
    const siteId = "550e8400-e29b-41d4-a716-446655440000";

    await writeFile(
      join(projectRoot, "engawa-map.config.json"),
      JSON.stringify(
        {
          displayName: "Test Site",
          canonicalUrl: "https://example.com",
          siteId,
        },
        null,
        2,
      ),
      "utf8",
    );

    const { writeLocalState } = await import("./local-state.js");
    await writeLocalState(projectRoot, {
      registration: {
        state: "registered",
        siteId,
        canonicalUrl: "https://example.com",
        siteToken: "bearer-token",
      },
    });

    process.env.ENGAWA_MAP_ENDPOINT = "http://127.0.0.1:9";
    process.env.ENGAWA_MAP_TOKEN = "bearer-token";

    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const config = await import("./config.js");
    vi.spyOn(config, "removeMapConfigSiteId").mockRejectedValueOnce(new Error("disk full"));

    const logs: string[] = [];
    const code = await runUnregister({
      cwd: projectRoot,
      endpoint: process.env.ENGAWA_MAP_ENDPOINT,
      envToken: process.env.ENGAWA_MAP_TOKEN,
      fetchImpl,
      log: (line) => logs.push(line),
    });

    expect(code).toBe(1);
    const output = logs.join("\n");
    expect(output).toContain("delisted successfully");
    expect(output).toContain("disk full");
    expect(output).not.toContain("Unregister failed");
    await expect(access(join(projectRoot, ".engawa-map.local.json"))).rejects.toThrow();
  });
});

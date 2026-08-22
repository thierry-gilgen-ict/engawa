import { describe, expect, it } from "vitest";
import {
  buildResourceUri,
  createEngawa,
  StaticContentAdapter,
  validateEngawaConfig,
} from "@thierry-gilgen-ict/engawa-core";
import { generateLlmsTxt, getLlmsTxtUrl } from "@thierry-gilgen-ict/engawa-discovery";
import {
  assertPublicAgentInterface,
  createEngawaPublicMcpServer,
  EngawaAgentInterfaceError,
} from "@thierry-gilgen-ict/engawa-mcp";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { exampleConfig, exampleAdapter, exampleEngawa } from "../examples/minimal-site/src/site.js";

const baseConfig = {
  site: {
    name: "Test Site",
    canonicalUrl: "https://example.studio",
    description: "A test site for Engawa",
    language: "en",
  },
  agentInterface: { enabled: true, public: true },
  security: { publicDefault: "read-only" as const },
  metadata: { version: "0.1.0" },
};

describe("Engawa corrections", () => {
  it("validates config and rejects invalid canonical base URLs", () => {
    const config = validateEngawaConfig(baseConfig);
    expect(config.site.canonicalUrl).toBe("https://example.studio");

    expect(() =>
      validateEngawaConfig({
        ...baseConfig,
        site: { ...baseConfig.site, canonicalUrl: "not-a-url" },
      }),
    ).toThrow();

    expect(() =>
      validateEngawaConfig({
        ...baseConfig,
        site: { ...baseConfig.site, canonicalUrl: "https://user:pass@example.studio" },
      }),
    ).toThrow(/credentials/i);

    expect(() =>
      validateEngawaConfig({
        ...baseConfig,
        site: { ...baseConfig.site, canonicalUrl: "https://example.studio?foo=1" },
      }),
    ).toThrow(/query/i);

    expect(() =>
      validateEngawaConfig({
        ...baseConfig,
        site: { ...baseConfig.site, canonicalUrl: "https://example.studio#section" },
      }),
    ).toThrow(/fragment/i);
  });

  it("rejects invalid adapter resources at the core boundary", async () => {
    const badAdapter = {
      async listResources() {
        return [
          {
            id: "about",
            uri: "engawa://wrong-host/r/about",
            title: "About",
            mimeType: "text/markdown",
            content: "x",
            canonicalUrl: "https://example.studio/about.md",
          },
        ];
      },
      async getResource() {
        return undefined;
      },
      async search() {
        return [];
      },
    };
    const engawa = createEngawa(baseConfig, badAdapter);
    await expect(engawa.listResources()).rejects.toThrow(/URI mismatch/i);
  });

  it("rejects duplicate resource IDs in StaticContentAdapter", () => {
    expect(
      () =>
        new StaticContentAdapter("https://example.studio", [
          { id: "about", title: "A", content: "a" },
          { id: "about", title: "B", content: "b" },
        ]),
    ).toThrow(/Duplicate resource id/i);
  });

  it("builds path-scoped deterministic resource URIs without host-only collision", () => {
    const rootUri = buildResourceUri("https://example.studio", "about");
    const docsUri = buildResourceUri("https://example.studio/docs", "about");
    expect(rootUri).toBe("engawa://example.studio/r/about");
    expect(docsUri).toBe("engawa://example.studio/docs/r/about");
    expect(rootUri).not.toBe(docsUri);
  });

  it("enforces search input and result limits from config", async () => {
    const engawa = createEngawa(
      {
        ...baseConfig,
        content: { maxResourceBytes: 65536, maxSearchResults: 2, maxSearchQueryLength: 50 },
      },
      new StaticContentAdapter("https://example.studio", [
        { id: "a", title: "A", content: "alpha" },
        { id: "b", title: "B", content: "alpha" },
        { id: "c", title: "C", content: "alpha" },
      ]),
    );
    await expect(engawa.search("")).rejects.toThrow(/empty/i);
    await expect(engawa.search("x".repeat(51))).rejects.toThrow(/max length/i);
    const results = await engawa.search("alpha");
    expect(results.length).toBe(2);
  });

  it("generates llms.txt with canonical absolute URLs", async () => {
    const engawa = createEngawa(exampleConfig, exampleAdapter);
    const resources = await engawa.listResources();
    const txt = generateLlmsTxt(engawa.config, resources, { optionalResourceIds: ["contact"] });
    expect(txt.startsWith("# Example Studio")).toBe(true);
    expect(txt).toContain("http://127.0.0.1:3847/about.md");
    expect(txt).toContain("## Optional");
    expect(getLlmsTxtUrl(engawa.config)).toBe("http://127.0.0.1:3847/llms.txt");
  });

  it("fail-closes public MCP when agentInterface is disabled or non-public", async () => {
    const disabled = createEngawa(
      { ...baseConfig, agentInterface: { enabled: false, public: true } },
      exampleAdapter,
    );
    const privateOnly = createEngawa(
      { ...baseConfig, agentInterface: { enabled: true, public: false } },
      exampleAdapter,
    );

    expect(() => assertPublicAgentInterface(disabled.config)).toThrow(EngawaAgentInterfaceError);
    expect(() => assertPublicAgentInterface(privateOnly.config)).toThrow(EngawaAgentInterfaceError);
    await expect(createEngawaPublicMcpServer(disabled)).rejects.toThrow(/disabled/i);
    await expect(createEngawaPublicMcpServer(privateOnly)).rejects.toThrow(/not enabled/i);
  });

  it("exposes read-only MCP list, read, and search with malformed query rejected", async () => {
    const server = await createEngawaPublicMcpServer(exampleEngawa);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0.1.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const { resources } = await client.listResources();
    expect(resources.some((r) => r.uri.includes("/r/about"))).toBe(true);

    const aboutUri = resources.find((r) => r.uri.endsWith("/r/about"))?.uri;
    const read = await client.readResource({ uri: aboutUri! });
    expect(read.contents[0]?.text).toContain("Example Studio");

    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name)).toEqual(["search_site"]);

    const search = await client.callTool({
      name: "search_site",
      arguments: { query: "services", limit: 5 },
    });
    expect(search.isError).not.toBe(true);

    const rejected = await client.callTool({
      name: "search_site",
      arguments: { query: "", limit: 5 },
    });
    expect(rejected.isError).toBe(true);
  });

  it("aligns MCP search tool limits with Engawa config ceilings", async () => {
    const engawa = createEngawa(
      {
        ...exampleConfig,
        content: {
          maxResourceBytes: 65536,
          maxSearchResults: 25,
          maxSearchQueryLength: 300,
        },
      },
      exampleAdapter,
    );
    const server = await createEngawaPublicMcpServer(engawa);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0.1.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const overLimit = await client.callTool({
      name: "search_site",
      arguments: { query: "x".repeat(301), limit: 5 },
    });
    expect(overLimit.isError).toBe(true);

    const overResultLimit = await client.callTool({
      name: "search_site",
      arguments: { query: "studio", limit: 26 },
    });
    expect(overResultLimit.isError).toBe(true);
  });

  it("wires the example vertical slice", async () => {
    const resources = await exampleEngawa.listResources();
    expect(resources.length).toBe(4);
    const txt = generateLlmsTxt(exampleEngawa.config, resources);
    expect(txt).toContain("Example Studio");
    const server = await createEngawaPublicMcpServer(exampleEngawa);
    expect(server).toBeDefined();
  });
});

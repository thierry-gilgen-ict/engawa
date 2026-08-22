import { describe, expect, it } from "vitest";
import {
  buildResourceUri,
  createEngawa,
  StaticContentAdapter,
  validateEngawaConfig,
} from "@thierry-gilgen-ict/engawa-core";
import { generateLlmsTxt, getLlmsTxtUrl } from "@thierry-gilgen-ict/engawa-discovery";
import { createEngawaMcpServer } from "@thierry-gilgen-ict/engawa-mcp";
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

describe("Engawa config", () => {
  it("parses valid config", () => {
    const config = validateEngawaConfig(baseConfig);
    expect(config.site.canonicalUrl).toBe("https://example.studio");
    expect(config.security.publicDefault).toBe("read-only");
  });

  it("rejects invalid canonical URL", () => {
    expect(() =>
      validateEngawaConfig({
        ...baseConfig,
        site: { ...baseConfig.site, canonicalUrl: "not-a-url" },
      }),
    ).toThrow();
  });
});

describe("Engawa resources", () => {
  it("assigns deterministic resource URIs", () => {
    const uri = buildResourceUri("https://example.studio", "about");
    expect(uri).toBe("engawa://example.studio/about");
  });

  it("looks up resources by id", async () => {
    const adapter = new StaticContentAdapter("https://example.studio", [
      {
        id: "about",
        title: "About",
        content: "About content",
        path: "/about.md",
      },
    ]);
    const engawa = createEngawa(baseConfig, adapter);
    const resource = await engawa.getResource("about");
    expect(resource?.title).toBe("About");
    expect(resource?.canonicalUrl).toBe("https://example.studio/about.md");
  });

  it("searches resources by query", async () => {
    const adapter = new StaticContentAdapter("https://example.studio", [
      { id: "faq", title: "FAQ", content: "agents and llms.txt", path: "/faq.md" },
      { id: "about", title: "About", content: "company history", path: "/about.md" },
    ]);
    const engawa = createEngawa(baseConfig, adapter);
    const results = await engawa.search("agents");
    expect(results.map((r) => r.id)).toEqual(["faq"]);
  });

  it("enforces search input limits", async () => {
    const engawa = createEngawa(baseConfig, exampleAdapter);
    await expect(engawa.search("")).rejects.toThrow(/empty/i);
    await expect(engawa.search("x".repeat(201))).rejects.toThrow(/max length/i);
  });
});

describe("llms.txt generation", () => {
  it("generates valid llms.txt with canonical URLs", async () => {
    const engawa = createEngawa(exampleConfig, exampleAdapter);
    const resources = await engawa.listResources();
    const txt = generateLlmsTxt(engawa.config, resources, { optionalResourceIds: ["contact"] });

    expect(txt.startsWith("# Example Studio")).toBe(true);
    expect(txt).toContain("> A fictional creative studio");
    expect(txt).toContain("## Pages");
    expect(txt).toContain("http://127.0.0.1:3847/about.md");
    expect(txt).toContain("## Optional");
    expect(txt).toContain("http://127.0.0.1:3847/contact.md");
    expect(getLlmsTxtUrl(engawa.config)).toBe("http://127.0.0.1:3847/llms.txt");
  });
});

describe("MCP surface", () => {
  it("lists resources, reads content, and searches read-only", async () => {
    const server = await createEngawaMcpServer(exampleEngawa);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0.1.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const { resources } = await client.listResources();
    expect(resources.some((r) => r.uri.includes("about"))).toBe(true);

    const aboutUri = resources.find((r) => r.uri.endsWith("/about"))?.uri;
    expect(aboutUri).toBeDefined();
    const read = await client.readResource({ uri: aboutUri! });
    expect(read.contents[0]?.text).toContain("Example Studio");

    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name)).toEqual(["search_site"]);

    const search = await client.callTool({
      name: "search_site",
      arguments: { query: "services", limit: 5 },
    });
    expect(search.isError).not.toBe(true);
    const text = search.content?.[0]?.type === "text" ? search.content[0].text : "";
    expect(text).toContain("services");

    const rejected = await client.callTool({
      name: "search_site",
      arguments: { query: "", limit: 5 },
    });
    expect(rejected.isError).toBe(true);
  });
});

describe("Example wiring", () => {
  it("wires config, adapter, discovery, and MCP", async () => {
    const resources = await exampleEngawa.listResources();
    expect(resources.length).toBe(4);
    const txt = generateLlmsTxt(exampleEngawa.config, resources);
    expect(txt).toContain("Example Studio");
    const server = await createEngawaMcpServer(exampleEngawa);
    expect(server).toBeDefined();
  });
});

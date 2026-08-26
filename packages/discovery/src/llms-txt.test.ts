import type { EngawaConfig, EngawaResource } from "@thierry-gilgen-ict/engawa-core";
import { describe, expect, it } from "vitest";
import { buildLlmsTxt, generateLlmsTxt } from "./llms-txt.js";

const baseConfig: EngawaConfig = {
  site: {
    name: "Example Studio",
    canonicalUrl: "http://127.0.0.1:3847",
    description:
      "A fictional creative studio demonstrating Engawa agent-native website capabilities.",
    language: "en",
  },
  agentInterface: { enabled: true, public: true },
  content: {
    maxResourceBytes: 65536,
    maxSearchResults: 10,
    maxSearchQueryLength: 200,
  },
  security: { publicDefault: "read-only" },
  metadata: { version: "0.1.0" },
};

const exampleResources: EngawaResource[] = [
  {
    id: "about",
    uri: "engawa://127.0.0.1:3847/r/about",
    title: "About Example Studio",
    description: "Who we are and what we do",
    mimeType: "text/markdown",
    content: "x",
    canonicalUrl: "http://127.0.0.1:3847/about.md",
  },
  {
    id: "contact",
    uri: "engawa://127.0.0.1:3847/r/contact",
    title: "Contact",
    description: "How to reach us",
    mimeType: "text/markdown",
    content: "x",
    canonicalUrl: "http://127.0.0.1:3847/contact.md",
  },
  {
    id: "faq",
    uri: "engawa://127.0.0.1:3847/r/faq",
    title: "FAQ",
    description: "Common questions",
    mimeType: "text/markdown",
    content: "x",
    canonicalUrl: "http://127.0.0.1:3847/faq.md",
  },
  {
    id: "services",
    uri: "engawa://127.0.0.1:3847/r/services",
    title: "Services",
    description: "What Example Studio offers",
    mimeType: "text/markdown",
    content: "x",
    canonicalUrl: "http://127.0.0.1:3847/services.md",
  },
];

const LEGACY_DEFAULT_OUTPUT =
  "# Example Studio\n> A fictional creative studio demonstrating Engawa agent-native website capabilities.\n\nExample Studio provides machine-readable content for AI agents.\n\nAgents should read this file, follow links to detailed markdown pages, and use the MCP endpoint for structured search.\n\n- MCP endpoint: http://127.0.0.1:3847/mcp\n- Public agent interface is read-only in v0.1.\n\n## Pages\n- [About Example Studio](http://127.0.0.1:3847/about.md): Who we are and what we do\n- [Contact](http://127.0.0.1:3847/contact.md): How to reach us\n- [FAQ](http://127.0.0.1:3847/faq.md): Common questions\n- [Services](http://127.0.0.1:3847/services.md): What Example Studio offers\n";

const minimalConfig: EngawaConfig = {
  site: {
    name: "Site",
    canonicalUrl: "http://127.0.0.1:3847",
    description: "Short site description.",
    language: "en",
  },
  agentInterface: { enabled: true, public: true },
  content: {
    maxResourceBytes: 65536,
    maxSearchResults: 10,
    maxSearchQueryLength: 200,
  },
  security: { publicDefault: "read-only" },
  metadata: { version: "0.1.0" },
};

function resource(
  id: string,
  title: string,
  description?: string,
  canonicalUrl = `http://127.0.0.1:3847/${id}.md`,
): EngawaResource {
  return {
    id,
    uri: `engawa://127.0.0.1:3847/r/${id}`,
    title,
    description,
    mimeType: "text/markdown",
    content: "body",
    canonicalUrl,
  };
}

describe("buildLlmsTxt / generateLlmsTxt", () => {
  it("LEGACY_DEFAULT_OUTPUT_COMPATIBLE", () => {
    const text = generateLlmsTxt(baseConfig, exampleResources);
    expect(text).toBe(LEGACY_DEFAULT_OUTPUT);
    expect(typeof text).toBe("string");
  });

  it("CURATED_PREAMBLE_REPLACES_GENERIC_PROSE", () => {
    const preamble = "AI Private Coach helps Swiss SMEs adopt AI safely.";
    const result = buildLlmsTxt(baseConfig, exampleResources, { preamble });
    expect(result.text).toContain(preamble);
    expect(result.text).not.toContain("provides machine-readable content for AI agents");
    expect(result.text).not.toContain(
      "Agents should read this file, follow links to detailed markdown pages",
    );
  });

  it("PREAMBLE_CONTENT_PRESERVED", () => {
    const preamble = "Line one.\n\nLine two with  extra   spaces.";
    const result = buildLlmsTxt(baseConfig, [exampleResources[0]], { preamble });
    expect(result.text).toContain("Line one.\n\nLine two with  extra   spaces.");
  });

  it("MCP_DEFAULT_PATH_PRESENT", () => {
    const text = generateLlmsTxt(baseConfig, exampleResources);
    expect(text).toContain("- MCP endpoint: http://127.0.0.1:3847/mcp");
    expect(text).toContain("Public agent interface is read-only in v0.1.");
  });

  it("MCP_CUSTOM_PATH_PRESENT", () => {
    const text = generateLlmsTxt(baseConfig, exampleResources, { mcpPath: "/custom-mcp" });
    expect(text).toContain("- MCP endpoint: http://127.0.0.1:3847/custom-mcp");
  });

  it("MCP_DISABLED_OMITTED", () => {
    const text = generateLlmsTxt(baseConfig, exampleResources, { mcpPath: false });
    expect(text).not.toContain("MCP endpoint");
    expect(text).not.toContain("Public agent interface is read-only");
  });

  it("MISSING_DESCRIPTION_WARNING", () => {
    const resources = [resource("svc", "Services")];
    const result = buildLlmsTxt(baseConfig, resources);
    expect(result.warnings).toEqual([{ code: "MISSING_DESCRIPTION", resourceId: "svc" }]);
  });

  it("DESCRIPTION_EQUALS_TITLE_WARNING", () => {
    const resources = [resource("svc", "Services", "Services")];
    const result = buildLlmsTxt(baseConfig, resources);
    expect(result.warnings).toEqual([{ code: "DESCRIPTION_EQUALS_TITLE", resourceId: "svc" }]);
  });

  it("REQUIRE_DESCRIPTIONS_FAILS", () => {
    const resources = [resource("svc", "Services")];
    expect(() => buildLlmsTxt(baseConfig, resources, { requireDescriptions: true })).toThrow(
      /requires a description/i,
    );
  });

  it("MULTILINE_DESCRIPTION_NORMALIZED", () => {
    const resources = [resource("svc", "Services", "Swiss SME consulting\nwith AI governance")];
    const text = generateLlmsTxt(baseConfig, resources);
    expect(text).toContain(": Swiss SME consulting with AI governance");
    expect(text).not.toContain("\nwith AI governance");
  });

  it("OPTIONAL_SECTION", () => {
    const text = generateLlmsTxt(baseConfig, exampleResources, {
      optionalResourceIds: ["contact"],
    });
    expect(text).toContain("## Optional");
    expect(text).toContain("- [Contact]");
    expect(text).not.toMatch(/## Pages[\s\S]*Contact[\s\S]*## Optional/);
  });

  it("UNKNOWN_OPTIONAL_ID_FAILS", () => {
    expect(() =>
      generateLlmsTxt(baseConfig, exampleResources, { optionalResourceIds: ["servcies"] }),
    ).toThrow(/unknown optionalResourceId.*servcies/i);
  });

  it("DUPLICATE_OPTIONAL_ID_FAILS", () => {
    expect(() =>
      generateLlmsTxt(baseConfig, exampleResources, {
        optionalResourceIds: ["contact", "contact"],
      }),
    ).toThrow(/duplicate optionalResourceId.*contact/i);
  });

  it("MAX_BYTES_ERROR", () => {
    expect(() =>
      buildLlmsTxt(baseConfig, exampleResources, { maxBytes: 100, overflowPolicy: "error" }),
    ).toThrow(/exceeds maxBytes \(.*100\)/);
  });

  it("UTF8_BYTE_COUNT", () => {
    const resources = [resource("jp", "縁側", "Japanese title example")];
    const result = buildLlmsTxt(baseConfig, resources);
    expect(result.byteLength).toBe(Buffer.byteLength(result.text, "utf8"));
    expect(Buffer.byteLength("縁側", "utf8")).toBe(6);
    expect("縁側".length).toBe(2);
  });

  it("PRIMARY_OVER_BUDGET_FAILS", () => {
    const resources = [resource("big", "Big", "x".repeat(200))];
    expect(() =>
      buildLlmsTxt(baseConfig, resources, { maxBytes: 120, overflowPolicy: "trim-optional" }),
    ).toThrow(/exceeds maxBytes/i);
  });

  it("TRIM_OPTIONAL_FITS", () => {
    const resources = [
      resource("primary", "Primary", "Primary page"),
      resource("opt-a", "Optional A", "Optional A page"),
    ];
    const result = buildLlmsTxt(minimalConfig, resources, {
      optionalResourceIds: ["opt-a"],
      mcpPath: false,
      maxBytes: 400,
      overflowPolicy: "trim-optional",
    });
    expect(result.includedOptionalResourceIds).toEqual(["opt-a"]);
    expect(result.omittedOptionalResourceIds).toEqual([]);
  });

  it("TRIM_OPTIONAL_OMITS_TAIL", () => {
    const resources = [
      resource("primary", "Primary", "Primary page"),
      resource("opt-a", "Optional A", "First optional resource"),
      resource("opt-b", "Optional B", "Second optional with more text"),
    ];
    const result = buildLlmsTxt(minimalConfig, resources, {
      optionalResourceIds: ["opt-a", "opt-b"],
      mcpPath: false,
      maxBytes: 360,
      overflowPolicy: "trim-optional",
    });
    expect(result.includedOptionalResourceIds).toEqual(["opt-a"]);
    expect(result.omittedOptionalResourceIds).toEqual(["opt-b"]);
  });

  it("TRIM_OPTIONAL_NEVER_DROPS_PRIMARY", () => {
    const resources = [
      resource("primary", "Primary", "Primary page"),
      resource("opt-a", "Optional A", "Optional"),
    ];
    const result = buildLlmsTxt(baseConfig, resources, {
      optionalResourceIds: ["opt-a"],
      maxBytes: 500,
      overflowPolicy: "trim-optional",
    });
    expect(result.includedPrimaryResourceIds).toEqual(["primary"]);
    expect(result.text).toContain("Primary page");
  });

  it("OPTIONAL_HEADER_ABSENT_WHEN_NONE_FIT", () => {
    const resources = [
      resource("primary", "Primary", "Primary page"),
      resource("opt-a", "Optional A", "A long optional description for budget test"),
    ];
    const result = buildLlmsTxt(minimalConfig, resources, {
      optionalResourceIds: ["opt-a"],
      mcpPath: false,
      maxBytes: 250,
      overflowPolicy: "trim-optional",
    });
    expect(result.text).not.toContain("## Optional");
    expect(result.omittedOptionalResourceIds).toEqual(["opt-a"]);
  });

  it("DETERMINISTIC_BUILD_RESULT", () => {
    const options = { optionalResourceIds: ["contact"], preamble: "Curated intro." };
    const first = buildLlmsTxt(baseConfig, exampleResources, options);
    const second = buildLlmsTxt(baseConfig, exampleResources, options);
    expect(second).toEqual(first);
  });

  it("FINAL_NEWLINE_PRESENT", () => {
    const text = generateLlmsTxt(baseConfig, exampleResources);
    expect(text.endsWith("\n")).toBe(true);
    expect(text).not.toMatch(/\n\n$/);
  });

  it("rejects overflowPolicy without maxBytes", () => {
    expect(() => buildLlmsTxt(baseConfig, exampleResources, { overflowPolicy: "error" })).toThrow(
      /overflowPolicy requires maxBytes/i,
    );
  });

  it("rejects duplicate resource ids", () => {
    const dup = exampleResources[0];
    expect(() => buildLlmsTxt(baseConfig, [dup, dup])).toThrow(/duplicate resource id/i);
  });
});

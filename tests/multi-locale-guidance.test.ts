// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { buildLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";
import { createEngawa } from "@thierry-gilgen-ict/engawa-core";
import { createMultiLocaleAdapter } from "../examples/multi-locale-site/adapter.mjs";
import {
  SITE_ORIGIN,
  buildMarkdown,
  draftPages,
  publishedPages,
} from "../examples/multi-locale-site/content.mjs";

const root = process.cwd();
const docPath = join(root, "docs/multi-locale.md");
const exampleDir = join(root, "examples/multi-locale-site");

const config = {
  site: {
    name: "Example Multilocale",
    canonicalUrl: SITE_ORIGIN,
    description: "Bilingual example site for Engawa multi-locale guidance.",
    language: "de",
  },
  agentInterface: { enabled: true, public: true },
  content: {
    maxResourceBytes: 65536,
    maxSearchResults: 10,
    maxSearchQueryLength: 200,
  },
  security: { publicDefault: "read-only" as const },
  metadata: { version: "0.1.0" },
};

describe("multi-locale guidance", () => {
  it("canonical doc and example exist", () => {
    expect(existsSync(docPath)).toBe(true);
    expect(existsSync(join(exampleDir, "README.md"))).toBe(true);
    expect(existsSync(join(exampleDir, "build.mjs"))).toBe(true);
  });

  it("locks key invariants and acceptance contract in doc", () => {
    const doc = readFileSync(docPath, "utf8");
    expect(doc).toContain("HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE");
    expect(doc).toContain("AUTO_TRANSLATION = NO");
    expect(doc).toContain("NO_MODEL_LANGUAGE_DETECTION = YES");
    expect(doc).toContain("PUBLIC_IN_ONE_LOCALE_DOES_NOT_IMPLY_PUBLIC_IN_ALL_LOCALES = YES");
    expect(doc).toContain("MCP_LOCALE_FILTER_API = FUTURE_API_CANDIDATE");
    expect(doc).toContain("MCP_SEARCH_LOCALE_INPUT = NONE");
    expect(doc).toContain("MCP_SEARCH_RESULT_LOCALE_FIELD = NONE");
    expect(doc).toContain("RESOURCE_METADATA_LOCALE = AVAILABLE_IN_CORE");
    expect(doc).toContain("SITE_LANGUAGE_IS_LOCALE_LIST = NO");
    expect(doc).toContain("SITE_LANGUAGE_FILTERS_RESOURCES = NO");
    expect(doc).toContain("MULTI_LOCALE_REQUIRES_RUNTIME = NO");
    expect(doc).toContain("MACHINE_ROUTES_DETERMINISTIC = PASS");
    expect(doc).toContain("LOCAL_COMBINED_LLMS_PROOF = PASS");
    expect(doc).not.toMatch(/npm install.*engawa-i18n/i);
    expect(doc).not.toMatch(/filter search results in a site-specific wrapper/i);
    expect(doc).not.toMatch(/when integration knows locale context/i);
  });

  it("locale resource IDs are unique and stable", async () => {
    const engawa = createEngawa(config, createMultiLocaleAdapter());
    const resources = await engawa.listResources();
    const ids = resources.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("de-ankauf");
    expect(ids).toContain("en-selling");
  });

  it("metadata.locale and canonical URLs match human locale paths", async () => {
    const engawa = createEngawa(config, createMultiLocaleAdapter());
    const de = await engawa.getResource("de-ankauf");
    const en = await engawa.getResource("en-selling");
    expect(de?.metadata?.locale).toBe("de");
    expect(en?.metadata?.locale).toBe("en");
    expect(de?.canonicalUrl).toBe(`${SITE_ORIGIN}/de/ankauf`);
    expect(en?.canonicalUrl).toBe(`${SITE_ORIGIN}/en/selling`);
  });

  it("localized markdown derives from localized public source only", async () => {
    const engawa = createEngawa(config, createMultiLocaleAdapter());
    const de = await engawa.getResource("de-ankauf");
    const en = await engawa.getResource("en-selling");
    expect(de?.content).toBe(buildMarkdown(publishedPages.de.ankauf));
    expect(en?.content).toBe(buildMarkdown(publishedPages.en.selling));
    expect(de?.content).not.toContain("We purchase");
    expect(en?.content).not.toContain("Wir kaufen");
  });

  it("draft locale is not exposed in public corpus", async () => {
    const engawa = createEngawa(config, createMultiLocaleAdapter());
    const resources = await engawa.listResources();
    expect(resources.some((r) => r.id.includes("about"))).toBe(false);
    expect(draftPages.en.about.body).toContain("Draft");
  });

  it("buildLlmsTxt is deterministic for combined and filtered corpora", async () => {
    const engawa = createEngawa(config, createMultiLocaleAdapter());
    const resources = await engawa.listResources();
    const combined1 = buildLlmsTxt(config, resources);
    const combined2 = buildLlmsTxt(config, resources);
    expect(combined1.text).toBe(combined2.text);
    const deOnly = resources.filter((r) => r.metadata?.locale === "de");
    const deLlms = buildLlmsTxt(config, deOnly);
    expect(deLlms.text).toContain("/de/ankauf");
    expect(deLlms.text).not.toContain("/en/selling");
  });

  it("search spans locales without ID collision", async () => {
    const engawa = createEngawa(config, createMultiLocaleAdapter());
    const ankauf = await engawa.search("Ankauf");
    const selling = await engawa.search("Selling");
    expect(ankauf).toHaveLength(1);
    expect(selling).toHaveLength(1);
    expect(ankauf[0]?.metadata?.locale).toBe("de");
    expect(selling[0]?.metadata?.locale).toBe("en");
  });

  it("example sources have no network or translation API calls", () => {
    for (const file of readdirSync(exampleDir)) {
      if (!file.endsWith(".mjs")) continue;
      const source = readFileSync(join(exampleDir, file), "utf8");
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/openai|anthropic|translate/i);
    }
  });

  it("build.mjs proof exits cleanly with expected constants", () => {
    const out = execFileSync(process.execPath, [join(exampleDir, "build.mjs")], {
      encoding: "utf8",
      cwd: root,
    });
    expect(out).toContain("NETWORK_CALLS = NONE");
    expect(out).toContain("MODEL_CALLS = NONE");
    expect(out).toContain("DRAFT_LOCALE_EXPOSED = NO");
    expect(out).toContain("DE_LLMS_INCLUDES_DE_ONLY = YES");
    expect(out).toContain("EN_LLMS_INCLUDES_EN_ONLY = YES");
  });
});

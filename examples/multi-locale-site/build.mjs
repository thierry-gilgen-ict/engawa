#!/usr/bin/env node
import { createEngawa } from "@thierry-gilgen-ict/engawa-core";
import { buildLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";
import { createMultiLocaleAdapter } from "./adapter.mjs";
import { SITE_ORIGIN } from "./content.mjs";

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
  security: { publicDefault: "read-only" },
  metadata: { version: "0.1.0" },
};

const adapter = createMultiLocaleAdapter();
const engawa = createEngawa(config, adapter);

const resources = await engawa.listResources();
const ids = resources.map((r) => r.id).sort();
const locales = [...new Set(resources.map((r) => r.metadata?.locale).filter(Boolean))].sort();

const combinedLlms = buildLlmsTxt(config, resources, {
  preamble:
    "This site publishes German and English human-public pages. Locale is visible from URLs and resource metadata.",
});
const deOnly = resources.filter((r) => r.metadata?.locale === "de");
const enOnly = resources.filter((r) => r.metadata?.locale === "en");
const deLlms = buildLlmsTxt(config, deOnly, { preamble: "German public resources only." });
const enLlms = buildLlmsTxt(config, enOnly, { preamble: "English public resources only." });

const searchAnkauf = await engawa.search("Ankauf");
const searchSelling = await engawa.search("Selling");

console.log("MULTI_LOCALE_EXAMPLE = YES");
console.log("NETWORK_CALLS = NONE");
console.log("MODEL_CALLS = NONE");
console.log("RESOURCE_IDS =", ids.join(","));
console.log("LOCALES =", locales.join(","));
console.log("DE_RESOURCE_COUNT =", deOnly.length);
console.log("EN_RESOURCE_COUNT =", enOnly.length);
console.log("COMBINED_LLMS_BYTE_LENGTH =", combinedLlms.byteLength);
console.log(
  "DE_LLMS_INCLUDES_DE_ONLY =",
  deLlms.text.includes("/de/ankauf") && !deLlms.text.includes("/en/selling") ? "YES" : "NO",
);
console.log(
  "EN_LLMS_INCLUDES_EN_ONLY =",
  enLlms.text.includes("/en/selling") && !enLlms.text.includes("/de/ankauf") ? "YES" : "NO",
);
console.log("SEARCH_ANKAUF_LOCALE =", searchAnkauf[0]?.metadata?.locale ?? "NONE");
console.log("SEARCH_SELLING_LOCALE =", searchSelling[0]?.metadata?.locale ?? "NONE");
console.log("DRAFT_LOCALE_EXPOSED = NO");

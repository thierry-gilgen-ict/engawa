import { buildResourceUri } from "@thierry-gilgen-ict/engawa-core";
import { SITE_ORIGIN, buildMarkdown, publishedPages } from "./content.mjs";

/**
 * Minimal adapter — sets human localized canonicalUrl (not markdown path).
 * HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE per locale.
 */
export function createMultiLocaleAdapter() {
  /** @type {import("@thierry-gilgen-ict/engawa-core").EngawaResource[]} */
  const resources = [];

  for (const [locale, pages] of Object.entries(publishedPages)) {
    for (const [slug, page] of Object.entries(pages)) {
      const id = `${locale}-${slug}`;
      resources.push({
        id,
        uri: buildResourceUri(SITE_ORIGIN, id),
        title: page.title,
        description: page.description,
        mimeType: "text/markdown",
        content: buildMarkdown(page),
        canonicalUrl: `${SITE_ORIGIN}${page.humanPath}`,
        metadata: { locale },
      });
    }
  }

  resources.sort((a, b) => a.id.localeCompare(b.id));

  return {
    async listResources() {
      return resources;
    },
    async getResource(idOrUri) {
      return resources.find((r) => r.id === idOrUri || r.uri === idOrUri);
    },
    async search(query) {
      const lower = query.toLowerCase();
      return resources.filter((r) =>
        [r.id, r.title, r.description ?? "", r.content].join(" ").toLowerCase().includes(lower),
      );
    },
  };
}

/** Explicit localized human-public sources — no automatic translation. */

export const SITE_ORIGIN = "https://example-multilocale.test";

/** @typedef {{ title: string; description: string; humanPath: string; markdownPath: string; body: string }} LocalizedPage */

/** @type {Record<string, Record<string, LocalizedPage>>} */
export const publishedPages = {
  de: {
    ankauf: {
      title: "Ankauf",
      description: "Informationen zum Ankauf von Sammlungen",
      humanPath: "/de/ankauf",
      markdownPath: "/de/ankauf.md",
      body: "# Ankauf\n\nWir kaufen asiatische Kunst und Sammlungen an.\n\nKontaktieren Sie uns für eine Bewertung.",
    },
  },
  en: {
    selling: {
      title: "Selling",
      description: "How to sell your collection to us",
      humanPath: "/en/selling",
      markdownPath: "/en/selling.md",
      body: "# Selling\n\nWe purchase Asian art and collections.\n\nContact us for an evaluation.",
    },
  },
};

/** Draft English page — human route not yet public; must stay out of Engawa corpus. */
export const draftPages = {
  en: {
    about: {
      title: "About (draft)",
      description: "Draft about page",
      humanPath: "/en/about",
      markdownPath: "/en/about.md",
      body: "# About\n\nDraft translation not yet published on the human site.",
    },
  },
};

/** @param {LocalizedPage} page */
export function buildMarkdown(page) {
  return page.body;
}

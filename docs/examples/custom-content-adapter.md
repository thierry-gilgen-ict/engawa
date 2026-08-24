# Custom ContentAdapter example

Complete example for `@thierry-gilgen-ict/engawa-core@0.1.1`. Demonstrates how human HTML routes and Engawa read from the **same public source**.

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
SEARCH_CORPUS == LISTED_PUBLIC_CORPUS
```

Do not register drafts, admin pages, session data, or private CMS rows in this map.

---

## Shared public page source

Both anonymous HTML routes and Engawa use one in-application map. In production this might wrap your CMS loader, static files, or database query — the rule is the same: **one canonical function or map for human-public content**.

```typescript
/** Markdown body for agent surfaces; HTML routes render from the same record. */
interface PublicPageRecord {
  id: string;
  title: string;
  description?: string;
  markdown: string;
  path: string;
}

/**
 * Single human-public corpus. Keys are stable resource IDs.
 * No draft, admin, or private entries belong here.
 */
export const PUBLIC_PAGES = new Map<string, PublicPageRecord>([
  [
    "about",
    {
      id: "about",
      title: "About",
      description: "Who we are",
      path: "/about.md",
      markdown: "# About\n\nWe build agent-native websites.",
    },
  ],
  [
    "services",
    {
      id: "services",
      title: "Services",
      description: "What we offer",
      path: "/services.md",
      markdown: "# Services\n\nDesign, engineering, and agent interfaces.",
    },
  ],
]);
```

---

## Human HTML route (same source)

```typescript
/** Example Next.js or Express handler — reads the same map as Engawa. */
export function loadPublicPageHtml(slug: string): string | undefined {
  const page = PUBLIC_PAGES.get(slug);
  if (!page) return undefined;
  return `<article><h1>${page.title}</h1>${page.markdown.replace(/^# .+\n\n/, "")}</article>`;
}
```

If `loadPublicPageHtml("about")` and `engawa.getResource("about")` disagree, your integration violates [content publication](../content-publication.md).

---

## ContentAdapter implementation

```typescript
import {
  buildResourceUri,
  type ContentAdapter,
  type EngawaResource,
  normalizeCanonicalUrl,
  validateResourceId,
} from "@thierry-gilgen-ict/engawa-core";
import { PUBLIC_PAGES } from "./publicPages";

export class SiteContentAdapter implements ContentAdapter {
  private readonly canonicalBase: string;
  private readonly uriIndex: Map<string, string>;

  constructor(canonicalUrl: string) {
    this.canonicalBase = normalizeCanonicalUrl(canonicalUrl);
    this.uriIndex = new Map();
    for (const page of PUBLIC_PAGES.values()) {
      validateResourceId(page.id);
      const uri = buildResourceUri(this.canonicalBase, page.id);
      this.uriIndex.set(uri, page.id);
    }
  }

  async listResources(): Promise<EngawaResource[]> {
    const resources: EngawaResource[] = [];
    for (const page of PUBLIC_PAGES.values()) {
      resources.push(this.toResource(page));
    }
    return resources.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getResource(idOrUri: string): Promise<EngawaResource | undefined> {
    const byId = PUBLIC_PAGES.get(idOrUri);
    if (byId) return this.toResource(byId);
    const id = this.uriIndex.get(idOrUri);
    if (!id) return undefined;
    const page = PUBLIC_PAGES.get(id);
    return page ? this.toResource(page) : undefined;
  }

  async search(query: string): Promise<EngawaResource[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();
    const matches: EngawaResource[] = [];
    for (const page of PUBLIC_PAGES.values()) {
      const haystack = [page.id, page.title, page.description ?? "", page.markdown]
        .join(" ")
        .toLowerCase();
      if (haystack.includes(lower)) {
        matches.push(this.toResource(page));
      }
    }
    return matches.sort((a, b) => a.id.localeCompare(b.id));
  }

  private toResource(page: PublicPageRecord): EngawaResource {
    const path = page.path.startsWith("/") ? page.path : `/${page.path}`;
    return {
      id: page.id,
      uri: buildResourceUri(this.canonicalBase, page.id),
      title: page.title,
      description: page.description,
      mimeType: "text/markdown",
      content: page.markdown,
      canonicalUrl: `${this.canonicalBase}${path}`,
    };
  }
}
```

### Behavior notes

| Method                 | Contract                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `listResources()`      | Every entry in `PUBLIC_PAGES`; stable sorted IDs                                       |
| `getResource(idOrUri)` | Lookup by resource id or `engawa://` URI; `undefined` if unknown                       |
| `search(query)`        | Case-insensitive match over id, title, description, markdown; empty query returns `[]` |

Engawa applies `maxSearchQueryLength` and `maxSearchResults` at the MCP boundary. Keep the adapter focused on **public** content only.

---

## Wire into createEngawa

```typescript
import { createEngawa, validateEngawaConfig } from "@thierry-gilgen-ict/engawa-core";
import { SiteContentAdapter } from "./contentAdapter";

const config = validateEngawaConfig({
  site: {
    name: "My Site",
    canonicalUrl: "https://www.example.com",
    description: "Public site description.",
    language: "en",
  },
  agentInterface: { enabled: true, public: true },
  security: { publicDefault: "read-only" },
  metadata: { version: "0.1.1" },
});

export const engawa = createEngawa(config, new SiteContentAdapter(config.site.canonicalUrl));
```

---

## Related

- [Content publication rule](../content-publication.md)
- [Getting started](../getting-started.md)
- [Next.js MCP route example](nextjs-mcp-app-router.md)
- [Headless CMS integration](../integrations/headless-cms.md)

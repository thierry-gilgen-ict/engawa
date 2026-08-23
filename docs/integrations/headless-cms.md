# Headless CMS integration

This document describes the **integration pattern** for sites that use a **Node/TypeScript frontend** with a **headless CMS** (WordPress REST, Strapi, Sanity, Contentful, or similar). It is documentation only—there is **no** Engawa CMS package in v0.1.

## Governing rules

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
CMS_PUBLISHED != AUTOMATICALLY_ENGAWA_PUBLIC
SEARCH_CORPUS == ENGAWA_PUBLIC_CORPUS
```

Engawa must wrap the same content loaders, fetchers, queries, and publication decisions already used by the site's **anonymous human HTML routes**.

Do **not** build a separate CMS → Engawa ingestion pipeline.

Do **not** expose every CMS row that happens to have a `published` flag.

`search()` and MCP `search_site` must query only the same bounded public corpus as `listResources()`—never a broader CMS search endpoint.

## Overview

| Layer                   | Responsibility                                                              |
| ----------------------- | --------------------------------------------------------------------------- |
| Human HTML route        | Existing page/component + site loader                                       |
| Site loader / fetcher   | `lib/content/cms.ts` (or equivalent)—queries CMS for **public** routes only |
| Engawa `ContentAdapter` | Calls the **same** loaders; maps results to `EngawaResource`                |
| Engawa packages         | Config, `llms.txt`, markdown alternates, MCP, optional BYA                  |

```text
Human HTML route
    ↓
existing site loader / client / fetcher
    ↓
CMS API

Engawa ContentAdapter
    ↓
same existing site loader / client / fetcher
    ↓
same human-public CMS content
```

The adapter lives in **your application** (`lib/engawa/adapter.ts`), not in Engawa packages.

## When this pattern applies

- Next.js frontend + CMS API
- Astro frontend on Node + CMS API
- Custom Node/TypeScript frontend + CMS API
- Another frontend capable of running current Engawa npm packages

**Requirements:** Node.js **24+** (see [compatibility.md](../compatibility.md)). Pin exact package versions from the current tested set—do not invent versions.

## When this pattern does not apply

This recipe is **not** a direct integration pattern for:

| Stack                                | Notes                                                                 |
| ------------------------------------ | --------------------------------------------------------------------- |
| Classic PHP WordPress themes/plugins | Use headless WordPress recipe only when WP is backend + Node frontend |
| Classic TYPO3 PHP sites/extensions   | Same: backend-only + Node frontend may use this hub                   |
| Classic Drupal PHP themes/modules    | Same                                                                  |
| Wix                                  | Not a Node/TS Engawa host pattern                                     |
| Squarespace                          | Not a Node/TS Engawa host pattern                                     |
| Shopify-hosted storefront themes     | Not this pattern                                                      |

If one of those CMSs is used **purely as a backend** for a supported Node/TypeScript frontend, the headless recipe applies to the **frontend**, not the CMS runtime.

Do **not** suggest: PHP sidecars, Node sidecars, CMS plugins, extensions, Shopify apps, or unsupported bridges.

## Site-owned adapter pattern

Consumer application code (conceptual):

```typescript
// lib/engawa/adapter.ts — in your application, not in Engawa packages
import type { ContentAdapter, EngawaResource } from "@thierry-gilgen-ict/engawa-core";
import { getPublicPage, listPublicArticles } from "../content/cms";

export class CmsContentAdapter implements ContentAdapter {
  async listResources(): Promise<EngawaResource[]> {
    // Only content currently exposed by anonymous human routes
  }
  async getResource(idOrUri: string): Promise<EngawaResource | undefined> {
    // Resolve only within the same public corpus as HTML routes
  }
  async search(query: string): Promise<EngawaResource[]> {
    // Search only the same human-public corpus; never admin/draft/private rows
  }
}
```

- Reuse the site's existing public loaders (`getPublicArticle`, `listPublicArticles`, `getPublicPage`, etc.).
- Do not query a broader CMS source than human routes use.
- Do not copy production adapters from Engawa reference sites.
- Do not vendor Engawa internals.

## Headless CMS pitfalls

Engawa's public corpus is defined by what the **anonymous human site** exposes—not by the CMS publication model.

| Risk                                               | Mitigation                                  |
| -------------------------------------------------- | ------------------------------------------- |
| Draft content                                      | Exclude; use same filters as human routes   |
| Preview APIs, tokens, cookies                      | Never on public Engawa surfaces             |
| Scheduled / future content                         | Exclude unless human routes already show it |
| Unpublished locales / translations                 | Exclude locales not routed publicly         |
| CMS rows marked published but not routed           | Exclude—no human route = not Engawa-public  |
| Private / internal content types                   | Exclude                                     |
| Admin-only content                                 | Exclude                                     |
| Hidden CMS collections                             | Exclude                                     |
| Authenticated / account content                    | Exclude                                     |
| Customer data, orders, form submissions, PII       | Exclude                                     |
| CMS metadata not rendered on human pages           | Exclude                                     |
| Private assets                                     | Exclude                                     |
| CMS search APIs covering more than public frontend | Do not use for `search()`                   |
| Preview credentials in server env vars             | Never wire into public adapter              |

Cross-link: [content publication rule](../content-publication.md), [security model](../security-model.md).

## CMS-specific recipes

| CMS                  | Recipe                                         |
| -------------------- | ---------------------------------------------- |
| WordPress (headless) | [headless-wordpress.md](headless-wordpress.md) |
| Strapi               | [strapi.md](strapi.md)                         |
| Sanity               | [sanity.md](sanity.md)                         |
| Contentful           | [contentful.md](contentful.md)                 |

## Other headless CMSs

**Storyblok**, **Payload**, and similar headless CMSs follow the same pattern: wrap the client/loaders already used by anonymous human routes; do not create a broader CMS-to-Engawa content path.

No separate Engawa recipes unless repository conventions justify them later.

## Non-goals

Do **not** create or imply:

- `@thierry-gilgen-ict/engawa-wordpress`, `engawa-strapi`, `engawa-sanity`, `engawa-contentful`
- WordPress PHP plugin, TYPO3 extension, Drupal module, Shopify app
- PHP or Node sidecars
- CMS synchronization services or generic CMS → MCP helpers
- `engawa-nextjs` or framework adapter extraction

Public Engawa remains **read-only**. No authenticated MCP, OAuth, write tools, or mutation in v0.1.

## Related

- [Content publication rule](../content-publication.md)
- [Integrating an existing site](../integrating-an-existing-site.md)
- [Agent integration playbook](../agent-integration-playbook.md)
- [Security model](../security-model.md)
- [Integration acceptance contract](../integration-acceptance.md)
- [Next.js integration](nextjs.md)

# Next.js integration

This document describes the **proven integration pattern** used by Engawa's two production reference sites. It is documentation only—there is **no** `@thierry-gilgen-ict/engawa-nextjs` package in v0.1.

Phase 2A concluded `NEXTJS_ADAPTER_EXTRACTION_JUSTIFIED = NO`. Duplicated host glue (route handlers, guards, rate limits) remains in each application until a future phase justifies a shared adapter package.

## Overview

Typical App Router layout:

| Route                                   | Responsibility                                                |
| --------------------------------------- | ------------------------------------------------------------- |
| `app/llms.txt/route.ts`                 | `generateLlmsTxt` + `text/plain`                              |
| `app/mcp/route.ts`                      | `createEngawaPublicMcpHandler` + security guards + rate limit |
| `app/about.md/route.ts`                 | Markdown alternate for one page                               |
| `app/(public)/[locale]/agents/page.tsx` | Bring Your Agent page + `AskYourAgent`                        |
| `lib/engawa/*`                          | Config, adapter, instance, builders, guards                   |

Machine routes (`/llms.txt`, `/mcp`, paths ending in `.md`) should **skip locale middleware** that rewrites based on cookies or `Accept-Language`, so agents get deterministic resources.

## Engawa vs host application

| Topic                | Engawa packages                              | Host application                                        |
| -------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Config validation    | `validateEngawaConfig`, `createEngawa`       | Site URL, locale strategy, content sources              |
| Public corpus        | `ContentAdapter` contract                    | **Which** content is human-public; CMS/static/DB wiring |
| llms.txt body        | `generateLlmsTxt`                            | Route handler, caching, CDN                             |
| MCP protocol         | `createEngawaPublicMcpServer`, `search_site` | HTTP route, Streamable HTTP transport                   |
| Host / origin checks | Helpers in MCP server package patterns       | **Enforcement** in route handler (403 evil host)        |
| Rate limiting        | Not built-in                                 | App middleware or `rateLimitConsume`                    |
| Markdown routes      | Builders produce `text/markdown`             | Route files, `X-Robots-Tag: noindex`                    |
| Bring Your Agent UI  | `engawa-react` components                    | Labels, CSS skin, placement, `onEvent` bridge           |
| Analytics            | `onEvent` metadata events                    | Matomo/GA/etc.—never log prompt bodies                  |
| Auth / mutations     | **Not in v0.1**                              | Future separate surface                                 |
| Deployment           | Prebuilt npm packages                        | Docker, env secrets, `ENABLE_PRODUCTION_DEPLOY`         |

## Content adapter

Implement `ContentAdapter` in `lib/engawa/` (name varies):

- `listResources()` — full public corpus
- `getResource(idOrUri)` — single resource
- `search(query)` — bounded text search over public content only

Follow [content-publication.md](../content-publication.md): Engawa must use the same sources as human HTML routes.

Reference sites use site-specific adapters (`oldHandContentAdapter`, Gilgen field-notes builders)—**do not copy** those into Engawa core.

## Route handler — llms.txt

```typescript
import { getEngawa } from "@/lib/engawa/instance";
import { generateBilingualLlmsTxt } from "@/lib/engawa/llmsTxt"; // or generateLlmsTxt

export async function GET() {
  const engawa = getEngawa();
  const resources = await engawa.listResources();
  const body = generateLlmsTxt(engawa.config, resources);
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
```

Bilingual sites may partition resources by `metadata.locale` in a site-specific wrapper (not required in engawa-discovery core).

## Route handler — MCP

```typescript
import { createEngawaPublicMcpHandler } from "@thierry-gilgen-ict/engawa-mcp";
import { getEngawa } from "@/lib/engawa/instance";
import { mcpSecurityRejectedResponse } from "@/lib/engawa/mcpGuards";
import { mcpRateLimitConsume } from "@/lib/engawa/mcpRateLimit";

const handler = createEngawaPublicMcpHandler(getEngawa());

export async function POST(request: Request) {
  const rejected = mcpSecurityRejectedResponse(request, "yourdomain.ch");
  if (rejected) return rejected;
  if (!mcpRateLimitConsume(request)) {
    return new Response("Too Many Requests", { status: 429 });
  }
  return handler(request);
}

export async function GET(request: Request) {
  // Same guards; MCP Streamable HTTP may use GET for session setup
  ...
}
```

Use `@modelcontextprotocol/server` host/origin validation patterns appropriate to your deployment (production host vs localhost in dev).

## Markdown routes

Shared helper pattern:

```typescript
export function markdownResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-robots-tag": "noindex",
    },
  });
}
```

Each `app/foo.md/route.ts` calls your markdown builder for that page key.

## React — server/client boundaries

- `AskYourAgent` and dialog components: **client** components (`"use client"`).
- MCP URL and `AgentContext`: pass from server page via props; avoid importing DB/CMS modules into client bundles.
- Split constants (`PUBLIC_MCP_URL`) from server-only config when Next.js would pull server deps into client graphs.

## Locale handling

- HTML routes: your existing i18n (`next-intl`, cookie prefix, etc.).
- Machine routes: **exclude** from locale redirect middleware.
- Resource IDs: stable per locale (`de-ankauf`, `en-ankauf`) in a single Engawa corpus.

## Analytics bridge

Map `onEvent` to your tracker with **metadata only**:

```typescript
onEvent={(event) => {
  trackEvent("engawa", { label: `${event.name}:${event.provider}`, code: event.action });
}}
```

Never send prompt text, copied context, MCP query strings, or contact form content.

## Production deployment

- Pin Engawa package versions in `package.json`; `npm ci` in CI.
- Node **24+** in Docker and CI.
- Run site test suite after Engawa upgrades (see [upgrading.md](../upgrading.md)).
- Run [integration acceptance](../integration-acceptance.md) on staging before production.
- MCP and llms.txt are public—treat them as part of your attack surface (guards + rate limits).

## Related

- [Integrating an existing site](../integrating-an-existing-site.md)
- [Integration acceptance contract](../integration-acceptance.md)

See [production-references.md](../production-references.md) for live URLs.

## When to extract engawa-nextjs

Only if multiple sites share **identical** Next.js glue (guards, markdown route factory, handler wiring) and maintenance cost justifies a package. Two reference sites with different content models did not meet that threshold in Phase 2A.

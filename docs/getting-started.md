# Getting started

This guide starts from an **empty external TypeScript project**, not the Engawa monorepo. A competent TypeScript developer should reach a working basic Engawa integration in about 10–15 minutes.

**Already have a website?** Use [integrating an existing site](integrating-an-existing-site.md) instead.

## Prerequisites

- **Node.js 24+** (LTS)
- npm, pnpm, or yarn
- TypeScript (recommended)

Engawa packages ship prebuilt `dist/` output. You do not need to compile Engawa yourself.

## Install

```bash
npm install \
  @thierry-gilgen-ict/engawa-core@0.1.1 \
  @thierry-gilgen-ict/engawa-discovery@0.1.1 \
  @thierry-gilgen-ict/engawa-mcp@0.1.1
```

Optional React UI:

```bash
npm install @thierry-gilgen-ict/engawa-react@0.1.0 react react-dom
```

## Step 1 — EngawaConfig

**Why:** Engawa validates site identity, agent interface flags, content bounds, and security defaults before any resource is exposed.

```typescript
import { validateEngawaConfig } from "@thierry-gilgen-ict/engawa-core";

export const siteConfig = validateEngawaConfig({
  site: {
    name: "My Site",
    canonicalUrl: "https://www.example.com",
    description: "Short public description for agents and llms.txt.",
    language: "en",
  },
  agentInterface: {
    enabled: true,
    public: true,
  },
  security: {
    publicDefault: "read-only",
  },
  metadata: {
    version: "0.1.1",
  },
});
```

`canonicalUrl` must be absolute `https://` in production. Engawa normalizes trailing slashes and rejects credentials in URLs.

## Step 2 — ContentAdapter (2–3 resources)

**Why:** Engawa never reads your database or filesystem directly. You define what is **public** by implementing `ContentAdapter` (or using `StaticContentAdapter` for demos).

```typescript
import { StaticContentAdapter } from "@thierry-gilgen-ict/engawa-core";

export const adapter = new StaticContentAdapter(siteConfig.site.canonicalUrl, [
  {
    id: "about",
    title: "About",
    description: "Who we are",
    path: "/about.md",
    content: "# About\n\nPublic about content only.",
  },
  {
    id: "faq",
    title: "FAQ",
    path: "/faq.md",
    content: "# FAQ\n\nCommon questions.",
  },
]);
```

For production sites, implement a custom adapter that returns the same content your **human HTML routes** show. See [Content publication rule](content-publication.md).

## Step 3 — createEngawa()

**Why:** `createEngawa` binds config + adapter, validates every resource at the boundary, and enforces byte/search limits.

```typescript
import { createEngawa } from "@thierry-gilgen-ict/engawa-core";

export const engawa = createEngawa(siteConfig, adapter);
```

## Step 4 — Generate llms.txt

**Why:** Agents and crawlers use `llms.txt` as a stable discovery index pointing to markdown pages and MCP.

```typescript
import { generateLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";

export async function buildLlmsTxt(): Promise<string> {
  const resources = await engawa.listResources();
  return generateLlmsTxt(engawa.config, resources, {
    optionalResourceIds: ["contact"], // optional section in llms.txt
  });
}
```

Expose at `GET /llms.txt` with `content-type: text/plain; charset=utf-8`.

## Step 5 — Public MCP server

**Why:** MCP gives agents structured resource list/read and bounded search without scraping HTML.

```typescript
import { createEngawaPublicMcpServer } from "@thierry-gilgen-ict/engawa-mcp";

const server = await createEngawaPublicMcpServer(engawa);
// Connect server to your HTTP stack (Node, Next.js route handler, etc.)
```

Or use `createEngawaPublicMcpHandler(engawa)` when your framework provides a fetch-style handler.

Public MCP **requires** `agentInterface.enabled` and `agentInterface.public`. Otherwise Engawa throws `EngawaAgentInterfaceError`.

## Step 6 — search_site

**Why:** Agents need search across your registered corpus without a raw database query tool.

The MCP server registers one public tool: `search_site`. It uses your adapter's `search()` method, bounded by `maxSearchQueryLength` and `maxSearchResults` in config.

Test locally after wiring HTTP:

```bash
node scripts/smoke-mcp.mjs http://127.0.0.1:3000
```

(From the Engawa monorepo; adapt for your server.)

## Step 7 — Optional React Bring Your Agent UI

**Why:** Lets visitors connect ChatGPT, Claude, Grok, Cursor, or a generic MCP client without embedding a site-owned chatbot.

```tsx
import { AskYourAgent, DEFAULT_PROVIDERS } from "@thierry-gilgen-ict/engawa-react";

<AskYourAgent
  mcpUrl="https://www.example.com/mcp"
  context={{
    type: "page",
    title: "About",
    canonicalUrl: "https://www.example.com/about",
    siteName: "My Site",
    mcpUrl: "https://www.example.com/mcp",
  }}
  providers={DEFAULT_PROVIDERS}
  labels={yourLabels}
  onEvent={(event) => {
    /* metadata only — never log prompt bodies */
  }}
/>;
```

All user-facing strings come from your `labels` object. Engawa React does not ship analytics vendors.

## Step 8 — Production security checklist

Before exposing Engawa on the public internet:

- [ ] Corpus = **human-public** content only ([content-publication.md](content-publication.md))
- [ ] `agentInterface.public` only on intentionally public routes
- [ ] Host / origin validation on `/mcp` in production
- [ ] Rate limiting at edge or application layer
- [ ] No drafts, contact submissions, env vars, or admin paths in adapter
- [ ] No mutating MCP tools without auth (not in v0.1)
- [ ] Markdown routes: `X-Robots-Tag: noindex` if you don't want them indexed
- [ ] `onEvent` analytics: metadata only (provider, action, page path)—no prompt/context bodies

See [security-model.md](security-model.md) for the full threat model.

## Next steps

- [Integrating an existing site](integrating-an-existing-site.md) — if you already have a website
- [Next.js integration](integrations/nextjs.md) — route handlers and host responsibilities
- [Production references](production-references.md) — live sites
- [Upgrading](upgrading.md) — when new Engawa versions ship
- [Consuming from npm](integration-consuming-from-npm.md) — version pinning
- [minimal-site example](../examples/minimal-site) — runnable monorepo demo (workspace packages)

## Join the map (optional)

Engawa does **not** phone home or track your visitors. If you choose to appear on the public Engawa Distribution Map, you can voluntarily register the site **after** integration. This feature is separate from Engawa runtime and is off unless you explicitly join.

The `@thierry-gilgen-ict/engawa-map` CLI is published as `@thierry-gilgen-ict/engawa-map@0.1.0`. Install with `npm install --save-dev @thierry-gilgen-ict/engawa-map`, then `npx engawa-map register`. Defaults to production when `ENGAWA_MAP_ENDPOINT` is unset.

See [Distribution Map](distribution-map.md) and [DM3A production launch contract](distribution-map-production-launch.md).

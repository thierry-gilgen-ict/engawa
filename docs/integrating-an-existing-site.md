# Integrating Engawa into an existing website

This guide is for developers who **already have a website** and want to add Engawa agent surfaces without rebuilding the site from scratch.

For an empty TypeScript project, see [getting started](getting-started.md). For Next.js route patterns, see [Next.js integration](integrations/nextjs.md). If the site uses a **Node/TypeScript frontend with a headless CMS**, see [headless CMS integration](integrations/headless-cms.md).

## Before touching code

Inspect and record:

| Area                       | What to document                                              |
| -------------------------- | ------------------------------------------------------------- |
| Framework                  | Next.js, Astro, custom Node, etc.                             |
| Runtime                    | Node version (Engawa requires **24+**)                        |
| Package manager            | npm, pnpm, yarn                                               |
| Public routes              | Human HTML routes agents should mirror                        |
| Locales                    | Single or multi-locale routing                                |
| Content architecture       | CMS, DB, static files, hybrid                                 |
| Canonical source per route | **Loader, artifact, or build output feeding each human page** |
| Auth / session             | Middleware, cookies, admin areas                              |
| Host topology              | Reverse proxy, CDN, canonical domain                          |
| Rate limiting              | Existing limits on public routes                              |
| Analytics                  | Metadata-only vs content logging                              |
| Deployment                 | How production is built and released                          |

**Stop** if you cannot identify the canonical human-public source for each route class. See [content publication rule](content-publication.md) and [Do you need Engawa?](do-you-need-engawa.md).

Loader-driven sites: identify the **same canonical loader** the human HTML route uses.

Artifact-driven static sites: identify the **human-public HTML artifact** and a **build-time extraction** plan ([ADR-0008](adr/0008-artifact-driven-content-sources.md)). Runtime production HTML crawling is not the default Engawa corpus architecture.

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
```

## Decide what to add

Engawa surfaces are composable:

| Package                                | Required? | Purpose                         |
| -------------------------------------- | --------- | ------------------------------- |
| `@thierry-gilgen-ict/engawa-core`      | **Yes**   | Config, adapter, `createEngawa` |
| `@thierry-gilgen-ict/engawa-discovery` | Usually   | `llms.txt`, discovery metadata  |
| `@thierry-gilgen-ict/engawa-mcp`       | Usually   | Public MCP server               |
| `@thierry-gilgen-ict/engawa-react`     | Optional  | Bring Your Agent UI             |

| Surface             | What visitors get                                                    |
| ------------------- | -------------------------------------------------------------------- |
| Markdown alternates | Clean `text/markdown` at paths like `/about.md`                      |
| `llms.txt`          | Published machine-readable index / handoff (consumer support varies) |
| MCP                 | Streamable HTTP endpoint with resources + bounded `search_site`      |
| Bring Your Agent    | Provider-neutral connection UX on your site                          |

Add only what your product needs. MCP without BYA is valid.

## Inventory the human-public corpus

Create a table before coding:

| Human route | Public? | Canonical source         | Engawa resource ID | Markdown path | Locale |
| ----------- | ------- | ------------------------ | ------------------ | ------------- | ------ |
| `/about`    | YES     | `getPageContent().about` | `about`            | `/about.md`   | `en`   |
| `/admin`    | NO      | —                        | —                  | —             | —      |

Rules:

- **Public?** means an anonymous human visitor can see it today.
- **Canonical source** is the loader, artifact, or build output the human route already uses ([loader-driven vs artifact-driven](content-publication.md)).
- Do not register CMS rows, Git files, or DB tables that human routes do not use.

## Install

Current registry versions:

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

Pin exact versions in production. See [compatibility](compatibility.md).

## Implement the adapter

Implement a **custom `ContentAdapter`** over your site's human-public corpus. The pattern depends on how your site sources public content ([content publication rule](content-publication.md), [ADR-0008](adr/0008-artifact-driven-content-sources.md)):

**Loader-driven sites** — the `ContentAdapter` reads the **same canonical loader** used by human HTML routes (CMS query, application service, shared module).

**Artifact-driven sites** — deterministic **build-time extraction** from canonical human-public HTML artifacts produces bounded Engawa inputs/resources; the adapter consumes that extraction output.

- `StaticContentAdapter` is fine for demos and tests.
- Production sites with CMS, DB, locale-aware content, or static HTML trees need a site-specific adapter aligned to one of the paths above.

Engawa v0.1 does **not** ship a runtime production HTML crawler/scraper. Build-time extraction from allowlisted human-public HTML artifacts is permitted by ADR-0008; that is not the same as request-time crawling of live production HTML.

Reference pattern (conceptual):

```typescript
// lib/engawa/adapter.ts — in your application, not in Engawa packages
import type { ContentAdapter, EngawaResource } from "@thierry-gilgen-ict/engawa-core";

export class SiteContentAdapter implements ContentAdapter {
  async listResources(): Promise<EngawaResource[]> {
    // Return only resources whose human routes are public
  }
  async getResource(idOrUri: string): Promise<EngawaResource | undefined> {
    // Loader-driven: same loader as human route + markdown builder
    // Artifact-driven: bounded output from build-time extraction
  }
  async search(query: string): Promise<EngawaResource[]> {
    // Search only the same human-public corpus; never return admin/draft/private content
  }
}
```

`search()` backs MCP `search_site` and must query the same bounded public corpus as `listResources()`.

## Add discovery

1. Route handler for `/llms.txt` using `generateLlmsTxt`.
2. Markdown alternate routes (e.g. `/about.md`) using the same markdown builder as MCP resources.
3. Discovery link metadata if your site lists agent endpoints elsewhere.

Machine routes should skip locale middleware that rewrites based on cookies when deterministic agent access is required.

## Add MCP

1. Route handler for `/mcp` (or your chosen path).
2. Use `createEngawaPublicMcpHandler(engawa)` and call **`handler.fetch(request)`** in your route.
3. Add host validation, origin validation, and rate limiting in the route layer.
4. Export GET, POST, DELETE, and OPTIONS on the MCP path (Streamable HTTP).
5. Verify `resources/list`, `resources/read`, and `search_site` in development.

**Complete Next.js example:** [Next.js App Router MCP route](examples/nextjs-mcp-app-router.md).

Public v0.x ships one tool: `search_site` (read-only, bounded).

## Add host security

Engawa packages do not replace host enforcement. Your application must:

- Validate `Host` (and `Origin` where browser clients call MCP)
- Apply rate limits on `/mcp` and search
- Enforce query and result bounds via Engawa config
- Never register private corpus in the adapter
- Never expose mutation without a future authenticated phase

See [security model](security-model.md) launch checklist.

## Add Bring Your Agent (optional)

Install `engawa-react@0.1.0`. Use provider-neutral actions from the [capability matrix](providers/provider-capability-matrix.md).

- Generic MCP remains the canonical fallback.
- Provider plan and workspace availability varies—do not promise universal ChatGPT custom MCP.

## Local acceptance test

Run the [integration acceptance contract](integration-acceptance.md) against your local or staging URL.

Minimum manual checks:

```bash
curl -sS -o /dev/null -w "%{http_code}" https://localhost:3000/llms.txt
curl -sS https://localhost:3000/about.md | head
# MCP: use your MCP client or site smoke script
```

## Deployment

- Deploy with the same Node 24+ runtime used in CI.
- Ensure machine routes are reachable on the canonical production domain.
- Cache `llms.txt` and markdown appropriately; do not cache error responses as success.

## Production smoke

After deploy:

- Re-run the [integration acceptance contract](integration-acceptance.md).
- Compare public resource count and representative content to pre-deploy baseline.
- Verify BYA if installed.

## Rollback

Engawa integration is additive. To roll back without disturbing human-facing content:

1. Revert or disable Engawa route handlers (`/llms.txt`, `/mcp`, `*.md`, BYA page).
2. Remove Engawa dependencies from `package.json` if fully removing.
3. Redeploy the previous known-good site commit.

Human HTML routes and CMS content are unaffected when adapters only read existing public loaders.

## Join the map (optional)

Successful Engawa integration does **not** require joining the [Distribution Map](distribution-map.md). Registration is a separate, voluntary operator action after production acceptance passes.

## Related

- [Agent integration playbook](agent-integration-playbook.md) — for coding agents
- [Upgrading Engawa](upgrading.md) — when new versions ship
- [Production references](production-references.md) — live integration patterns

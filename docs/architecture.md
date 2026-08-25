# Architecture

Engawa is a library-first TypeScript monorepo with clear package boundaries.

## Packages

### `engawa-core`

Framework-independent foundation:

- `EngawaConfig` — validated site and agent-interface configuration
- `EngawaResource` — normalized content model with deterministic URIs
- `ContentAdapter` — pluggable content source (`list`, `get`, `search`)
- `createEngawa()` — factory applying bounds and metadata

No MCP, HTTP, or UI dependencies.

### `engawa-discovery`

- `generateLlmsTxt()` — deterministic llms.txt v2 output
- `getDiscoveryLinks()` — structural link metadata for HTML or HTTP `Link` headers

### `engawa-mcp`

- `createEngawaPublicMcpServer()` / `createEngawaPublicMcpHandler()` — fail-closed public MCP (requires enabled + public agent interface)
- `assertPublicAgentInterface()` — explicit gate for public v0.1 surface
- Registers resources and bounded `search_site` using config-derived limits

Uses `createMcpHandler` with a **per-request factory** (MCP 2026-07-28 stateless core).

## Content source architectures

Engawa preserves:

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
```

Two valid patterns ([content-publication.md](content-publication.md), [ADR-0008](adr/0008-artifact-driven-content-sources.md)):

| Pattern             | Canonical source                                 | Engawa derivation                                        |
| ------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| **Loader-driven**   | Shared runtime loader (CMS, service, module)     | Adapter calls same loader as human HTML routes           |
| **Artifact-driven** | Human-public HTML artifact (static/build output) | Deterministic **build-time** extraction → adapter inputs |

**Not** the default corpus architecture: request-time crawling or scraping of arbitrary production HTML.

## Complementary formats (Engawa does not replace)

| Format               | Role                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------ |
| HTML                 | Human/browser representation; agents can read it                                     |
| JSON-LD / schema.org | Entity and attribute semantics                                                       |
| sitemap.xml          | URL discovery / crawl inventory                                                      |
| OpenAPI              | Callable application API contracts                                                   |
| llms.txt             | Compact published map/handoff for agent-oriented content                             |
| Markdown alternates  | Clean document representation of public prose                                        |
| MCP                  | Bounded interactive retrieval (`resources/*`, `search_site`)                         |
| Engawa               | Toolkit tying agent surfaces to the same human-public source with read-only defaults |

See [Do you need Engawa?](do-you-need-engawa.md) for when each is enough alone.

## Agent surfaces and discovery

| Surface                 | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| Markdown                | Clean `text/markdown` document representation (additive to HTML)         |
| llms.txt                | Published index / handoff artifact ([llms.txt v2](https://llmstxt.org/)) |
| MCP                     | Interactive read-only retrieval for explicitly connected agents          |
| Discovery link metadata | `rel="alternate"`, `rel="describedby"`, HTTP `Link` headers              |

**Discovery note:** Publishing a surface does not guarantee automatic provider discovery or use. `SURFACE EXISTS ≠ SURFACE FETCHED ≠ SURFACE USED`.

Markdown's value is primarily clean representation, lower presentation overhead, portable document form, and predictable parsing—not assumed automatic alternate fetching by all crawlers.

MCP provides **interactive retrieval** (`resources/list`, `resources/read`, bounded `search_site`) distinct from static documents. Visitor-agent MCP usage at scale is not assumed; it is a capability for agents explicitly configured to use the endpoint.

## Data flow (loader-driven reference)

1. Site registers content through an adapter backed by canonical human-public loaders (or build-time extraction output for artifact-driven sites).
2. `createEngawa` wraps the adapter with validation and bounds.
3. Discovery package generates `llms.txt` from config + resources.
4. MCP package exposes the same resources and a bounded search tool.

## Version identity

Agent endpoints can report:

- Engawa package version
- Implementation profile version (`0.1`)
- MCP protocol baseline (`2026-07-28`)

Via the `engawa://meta/interface` resource and health endpoints—not invented protocol fields.

## Planned boundaries (not in v0.1)

- `@thierry-gilgen-ict/engawa-react` — Ask Your Agent UI
- Framework adapters (Next.js, etc.)
- Build-time HTML extraction tooling (pattern proof deferred; see roadmap)
- CLI analytics packages

See [roadmap](roadmap.md).

## llms.txt generator (future authoring improvements — not implemented)

Current `engawa-discovery` exposes `EngawaResource.description` and `LlmsTxtOptions.optionalResourceIds`. A future phase may evaluate curated preamble, description quality warnings, optional-resource policy, size budgets, and locale grouping—without changing v0.1 generator behavior in this documentation phase.

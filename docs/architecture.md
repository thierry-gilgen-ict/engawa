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

## Data flow

1. Site registers content through an adapter.
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
- CLI and analytics packages

See [roadmap](roadmap.md).

# Implementation profile v0.1

Engawa is **not** claiming to invent a new web or agent protocol. This profile describes what Engawa considers an agent-native website implementation at v0.1.

Profile version: **0.1**

## Standards implemented

- [Model Context Protocol](https://modelcontextprotocol.io/specification/2026-07-28) revision **2026-07-28**
- Official MCP TypeScript SDK v2 (`@modelcontextprotocol/server` 2.0.0)

## Conventions supported

- [llms.txt v2](https://llmstxt.org/) — `/llms.txt` at site root or subpaths
- HTML / HTTP link relations: `rel="alternate" type="text/markdown"`, `rel="describedby"`
- Markdown alternate URLs (`.md` suffix pattern)

## Engawa-specific choices

- Deterministic resource URIs: `engawa://{host}/{id}`
- `ContentAdapter` interface for content registration
- Public read-only default for unauthenticated agent access
- Implementation profile versioning independent of package semver

## REQUIRED for Engawa v0.1

- Human-readable website remains available
- Canonical site identity (`canonicalUrl`)
- Agent onboarding surface defined (llms.txt + MCP)
- `/llms.txt` (root or path-scoped)
- Machine-readable content (markdown pages or MCP resources)
- MCP endpoint exposing resources
- Safe read-only public tools where appropriate (`search_site`)
- Public/private capability separation (public = read-only only in v0.1)
- Deterministic resource identity
- Documented security policy
- Provider-neutral access (no vendor-specific handoffs in core)
- Versioned agent interface metadata

## RECOMMENDED

- Markdown alternates for key pages
- Discovery link relations in HTML or `Link` headers
- Structured content metadata (titles, descriptions)
- Health/version endpoint
- Caching guidance for static agent content
- Rate limiting at the edge
- Clear agent-access documentation for site operators

## OPTIONAL / FUTURE

- Authenticated tools and user-scoped resources
- Mutating operations
- OAuth for agent access
- Provider-specific deep links (ChatGPT, Claude, etc.)
- React UI components and connection wizards
- Observability and analytics integrations
- Filesystem or CMS adapters with strict sandboxing

## Not standards

The following are **not** required or defined by Engawa v0.1:

- `/.well-known/*` agent discovery URIs
- `agents.txt` or other speculative discovery files

# Engawa — public announcement

**The open toolkit for agent-native websites. Bring your agent.**

Engawa v0.1 is on npm. A website gets two first-class interfaces: HTML for humans, and structured agent surfaces (`llms.txt`, markdown alternates, read-only MCP) for the AI tools visitors already use.

## npm packages

| Package                                | Version                 |
| -------------------------------------- | ----------------------- |
| `@thierry-gilgen-ict/engawa-core`      | 0.1.1                   |
| `@thierry-gilgen-ict/engawa-discovery` | 0.2.0                   |
| `@thierry-gilgen-ict/engawa-mcp`       | 0.1.1                   |
| `@thierry-gilgen-ict/engawa-react`     | 0.1.0 (optional BYA UI) |
| `@thierry-gilgen-ict/engawa-cli`       | 0.1.0                   |

Requires **Node.js 24+**.

## Production references

Two live Next.js sites consume Engawa from npm (no Engawa core forks):

- [Thierry Gilgen ICT](https://www.thierry-gilgen-ict.ch/agents)
- [The Old Hand of Asia](https://theoldhandofasia.ch/agents)

Framework portability beyond Next.js is not claimed in v0.1 — integration patterns are documented for App Router route handlers.

## What v0.1 includes

- Public read-only MCP (`search_site` only)
- Deterministic `llms.txt` discovery
- Optional Bring Your Agent React UI

## What v0.1 does not include

- Authenticated or mutating MCP
- `engawa-nextjs` package (documented patterns instead)
- Runtime phone-home — Engawa does not call external registries from your website
- Distribution Map — **discontinued** (registry offline; historical notes in [distribution-map.md](docs/distribution-map.md))

## Stability

Early **v0.x**. API may change before **1.0**.

## Get started

- [README](README.md)
- [Getting started](docs/getting-started.md)
- [Integrating an existing site](docs/integrating-an-existing-site.md)
- [Complete Next.js MCP example](docs/examples/nextjs-mcp-app-router.md)

Security reports: [SECURITY.md](SECURITY.md) (private: info@thierry-gilgen-ict.ch).

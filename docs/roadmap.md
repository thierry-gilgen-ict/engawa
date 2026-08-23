# Roadmap

## Phase 0 (current) — Foundation + vertical slice

- Core, discovery, MCP packages
- Minimal example site
- CI and documentation

## Phase 1 — Integration and UX

- Production site integration (first consumer)
- Ask Your Agent React UI — **in progress (engawa-react v0.1.0)**
- Framework adapters (e.g. Next.js)
- Markdown alternate helpers for HTML pages
- Optional filesystem adapter with strict sandboxing

## Phase 2 — Authenticated capabilities

- OAuth and authenticated MCP tools
- User-scoped resources
- Mutating operations with explicit policy

## Phase 3 — Ecosystem

- Provider handoff UX where technically supported
- Analytics for agent interactions
- CLI for local development
- npm publication of packages — **done for v0.1.0**

## Patch v0.1.1 (planned)

- Add `"engines": { "node": ">=24" }` to each publishable package manifest (`engawa-core`, `engawa-discovery`, `engawa-mcp`). v0.1.0 tarballs omit package-level `engines` metadata.

## Package boundaries (planned)

| Package            | Status  |
| ------------------ | ------- |
| `engawa-core`      | v0.1    |
| `engawa-discovery` | v0.1    |
| `engawa-mcp`       | v0.1    |
| `engawa-react`     | v0.1 (in progress) |
| `engawa-nextjs`    | Planned |
| `engawa-cli`       | Planned |
| `engawa-analytics` | Planned |

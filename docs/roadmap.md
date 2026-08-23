# Roadmap

## Completed — Foundation (Phase 0)

- `engawa-core`, `engawa-discovery`, `engawa-mcp` packages
- Minimal example site (`examples/minimal-site`)
- CI, security model, implementation profile v0.1
- npm publication v0.1.0

## Completed — First production integration (Phase 1)

- [thierry-gilgen-ict.ch](https://www.thierry-gilgen-ict.ch) — first npm consumer
- `@thierry-gilgen-ict/engawa-react@0.1.0` — Bring Your Agent UI
- Provider capability matrix and open provider-neutral UX (ADR-0006)

## Completed — Second reference integration (Phase 2A)

- [theoldhandofasia.ch](https://theoldhandofasia.ch) — bilingual DE/EN, mixed CMS/static human-public sources
- Content publication parity rule documented (`HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE`)
- No Engawa core changes; no `engawa-nextjs` extraction

## In progress — Open-source launch & DX (Phase 2B)

- README and getting-started for external developers
- Next.js integration guide (documentation only)
- Production references doc, CHANGELOG, releasing guide
- External npm consumer smoke in CI
- Package metadata `engines.node >=24` (v0.1.1 patch for core/discovery/mcp)

## Future — Authenticated capabilities (not started)

- OAuth and authenticated MCP tools
- User-scoped resources
- Mutating operations with explicit policy
- **Do not** implement in v0.1.x without a dedicated security phase

## Future — Ecosystem (deferred)

- Optional provider handoff UX where vendors document support
- Analytics helpers (metadata-only patterns exist in reference sites)
- CLI for local Engawa development
- `engawa-nextjs` — only if duplication across consumers justifies extraction

## Package status

| Package            | npm status         | Notes                     |
| ------------------ | ------------------ | ------------------------- |
| `engawa-core`      | 0.1.0 → 0.1.1 prep | engines metadata in 0.1.1 |
| `engawa-discovery` | 0.1.0 → 0.1.1 prep | depends on core           |
| `engawa-mcp`       | 0.1.0 → 0.1.1 prep | depends on core           |
| `engawa-react`     | 0.1.0              | engines already present   |
| `engawa-nextjs`    | Not shipped        | Document pattern only     |
| `engawa-cli`       | Planned            |                           |
| `engawa-analytics` | Planned            |                           |

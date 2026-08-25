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

## Completed — Open-source launch & DX (Phase 2B)

- README and getting-started for external developers
- Next.js integration guide (documentation only)
- Production references doc, CHANGELOG, releasing guide
- External npm consumer smoke in CI
- Package metadata `engines.node >=24` published as `@thierry-gilgen-ict/engawa-core@0.1.1`, `@thierry-gilgen-ict/engawa-discovery@0.1.1`, `@thierry-gilgen-ict/engawa-mcp@0.1.1`
- `@thierry-gilgen-ict/engawa-react` remains at **0.1.0**

## Completed — Distribution Map staging (DM2B)

- `@thierry-gilgen-ict/engawa-map` CLI in monorepo (register / status / unregister)
- Dedicated registry service ([engawa-map-registry](https://github.com/thierry-gilgen-ict/engawa-map-registry))
- Live staging at `https://staging-engawa-map.thierry-gilgen-ict.ch` — DM2B acceptance PASS
- Canonical URL hostname validation hotfix (PR #18)

## Completed — Distribution Map production release (DM3)

- [DM3A](distribution-map-production-launch.md) — production launch contract
- DM3B — public showcase, production deploy artifacts, CLI default endpoint
- DM3C — production deploy and live acceptance PASS
- DM3D — `@thierry-gilgen-ict/engawa-map@0.1.0` on npm; production showcase live

## Future — Authenticated capabilities (not started)

- OAuth and authenticated MCP tools
- User-scoped resources
- Mutating operations with explicit policy
- **Do not** implement in v0.1.x without a dedicated security phase

## Future — Ecosystem (deferred)

- Optional provider handoff UX where vendors document support
- Analytics helpers (metadata-only patterns exist in reference sites)
- CLI for local Engawa development — **in progress:** `engawa inspect` + `engawa init` in `@thierry-gilgen-ict/engawa-cli` (source, not published); `doctor` planned
- `engawa-nextjs` — only if duplication across consumers justifies extraction

## Package status

| Package            | npm status                     | Notes                                                                                            |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `engawa-core`      | 0.1.1                          | engines metadata in 0.1.1                                                                        |
| `engawa-discovery` | 0.1.1                          | depends on core 0.1.1                                                                            |
| `engawa-mcp`       | 0.1.1                          | depends on core 0.1.1                                                                            |
| `engawa-react`     | 0.1.0                          | engines already present                                                                          |
| `engawa-nextjs`    | Not shipped                    | Document pattern only                                                                            |
| `engawa-cli`       | In development (not published) | CLI-1 `inspect` + CLI-2 `init` implemented in source; `doctor` planned                           |
| `engawa-map`       | 0.1.0                          | Production registry live; voluntary PENDING→LISTED flow; [Distribution Map](distribution-map.md) |
| `engawa-analytics` | Planned                        | Separate from Distribution Map                                                                   |

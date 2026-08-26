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

## Post-CLI adopter feedback track

External review after `@thierry-gilgen-ict/engawa-cli@0.1.0` converged on four themes: HTML is already readable; llms.txt/Markdown autodiscovery must not be assumed; Engawa must differentiate clearly from schema.org/sitemaps/OpenAPI; static artifact-driven sites need an allowed build-time path ([ADR-0008](adr/0008-artifact-driven-content-sources.md)).

Planned bounded phases (order matters):

1. **Static/build-time pattern proof** — closed on main ([`examples/static-build-time-site`](../../examples/static-build-time-site), [static-build-time-integration.md](static-build-time-integration.md)); production reference still pending
2. **Authorable/high-quality llms.txt** — implemented by PR #33; published as `@thierry-gilgen-ict/engawa-discovery@0.2.0` (see [publish-npm-discovery-v0.2.0.md](publish-npm-discovery-v0.2.0.md))
3. **Observability recipe** — implemented: [observability.md](observability.md) + [`examples/observability/`](../../examples/observability/); operator-local server/CDN or app logs (`/llms.txt`, markdown, `/mcp`, `Accept`, User-Agent); **no runtime phone-home**; User-Agent ≠ proof of model consumption
4. **Content-negotiation experiment** — implemented: [content-negotiation-experiment.md](content-negotiation-experiment.md) + [`examples/content-negotiation/`](../../examples/content-negotiation/); evaluates `Accept: text/markdown` on canonical human URLs vs dedicated `.md` routes; **no runtime package changes**
5. **Multi-locale guidance / reference**
6. **Candidate third production reference** — static SME site

Do not invent package names (`engawa-html`, `engawa-static`, `engawa-analytics`) until a pattern is proven.

## Future — Authenticated capabilities (not started)

- OAuth and authenticated MCP tools
- User-scoped resources
- Mutating operations with explicit policy
- **Do not** implement in v0.1.x without a dedicated security phase

## Future — Ecosystem (deferred)

- Optional provider handoff UX where vendors document support
- Analytics helpers (metadata-only patterns exist in reference sites)
- CLI for local Engawa development — `engawa inspect` + `engawa init` + `engawa doctor` in `@thierry-gilgen-ict/engawa-cli` (**0.1.0** published on npm)
- `engawa-nextjs` — only if duplication across consumers justifies extraction

## Package status

| Package            | npm status  | Notes                                                                                            |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------ |
| `engawa-core`      | 0.1.1       | engines metadata in 0.1.1                                                                        |
| `engawa-discovery` | 0.2.0       | depends on core 0.1.1; [publish record](publish-npm-discovery-v0.2.0.md)                         |
| `engawa-mcp`       | 0.1.1       | depends on core 0.1.1                                                                            |
| `engawa-react`     | 0.1.0       | engines already present                                                                          |
| `engawa-nextjs`    | Not shipped | Document pattern only                                                                            |
| `engawa-cli`       | 0.1.0       | `inspect` + `init` + `doctor`; [publish record](publish-npm-cli-v0.1.0.md)                       |
| `engawa-map`       | 0.1.0       | Production registry live; voluntary PENDING→LISTED flow; [Distribution Map](distribution-map.md) |

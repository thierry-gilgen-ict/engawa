# Changelog

All notable changes to Engawa are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## Unreleased (source only)

### `@thierry-gilgen-ict/engawa-cli@0.1.0` (not published)

First public CLI release candidate (`inspect` → `init` → `doctor`):

- Add `engawa inspect` — bounded same-origin website inspector producing `engawa.inspect.v1` Agent Readiness Reports (route discovery, surface inventory, deterministic readiness score).
- Add `engawa init` — repository-aware integration planner producing `engawa.plan.v1` and `engawa.init.bundle.v1` from an inspect report + read-only repo scan.
- Bounded repository inspection with secret/symlink/cache exclusions; Next.js App/Pages router route and source-candidate discovery.
- Generates `ENGAWA_INTEGRATION_PLAN.md` and provider-neutral `AGENT_PROMPT.md` without modifying application source.
- Add `engawa doctor` — live verifier for deployed Engawa agent surfaces (`engawa.doctor.v1`).
- Verifies llms.txt (exact canonical site-root URL), Markdown samples, real MCP Streamable HTTP connect, resources/list + bounded resources/read, tools/list (`search_site` only), and live `search_site` probes.
- Bounded security observations (invalid Host, untrusted Origin, opt-in rate-limit probe); optional `--plan` comparison; synthetic `--deny-term` sentinels.
- Read-only across all commands: no credentials, no telemetry, no Distribution Map calls, no LLM calls; doctor does not scan or modify the repository.

## [0.1.1] — 2026-08-23

### Packages published to npm

- `@thierry-gilgen-ict/engawa-core@0.1.1`
- `@thierry-gilgen-ict/engawa-discovery@0.1.1`
- `@thierry-gilgen-ict/engawa-mcp@0.1.1`

`@thierry-gilgen-ict/engawa-react` remains at **0.1.0** (not republished).

### engawa-core, engawa-discovery, engawa-mcp

- Add `"engines": { "node": ">=24" }` to package manifests (v0.1.0 npm tarballs omitted package-level engines metadata).
- Release packaging housekeeping (staged tarball publish path for discovery/mcp).

No runtime API changes in this patch.

### UPGRADE_IMPACT

```text
BREAKING_CHANGE = NO
MIGRATION_REQUIRED = NO
MIN_NODE = 24
PACKAGE_SET = core@0.1.1, discovery@0.1.1, mcp@0.1.1, react@0.1.0
MIGRATION_GUIDE = NONE
```

### Source baseline (package-specific tags)

Release source SHA: `cec86afd56e446b6d84fb124edaf08fa1185a0c8`

| Tag                       | Points to |
| ------------------------- | --------- |
| `engawa-core-v0.1.1`      | `cec86af` |
| `engawa-discovery-v0.1.1` | `cec86af` |
| `engawa-mcp-v0.1.1`       | `cec86af` |

## [0.1.0] — 2026-08

### Packages published to npm

- `@thierry-gilgen-ict/engawa-core@0.1.0`
- `@thierry-gilgen-ict/engawa-discovery@0.1.0`
- `@thierry-gilgen-ict/engawa-mcp@0.1.0`
- `@thierry-gilgen-ict/engawa-react@0.1.0`

### Foundation

- Config validation, `ContentAdapter`, `createEngawa`, resource URI model
- `StaticContentAdapter` for examples and tests
- llms.txt v2 generation and discovery link helpers
- Public MCP server with `search_site` (read-only)
- Implementation profile v0.1, security model
- `examples/minimal-site` vertical slice

### engawa-react

- Bring Your Agent React components (`AskYourAgent`, provider picker, dialog)
- Provider-neutral UX per capability matrix (ADR-0006)

### Production integrations

- First reference: thierry-gilgen-ict.ch (Field Notes content model)
- Second reference: theoldhandofasia.ch (bilingual DE/EN, mixed human-public sources, Phase 2A portability proof)

### Source baselines (immutable tags)

| Artifact                                          | Git commit                                 |
| ------------------------------------------------- | ------------------------------------------ |
| Global tag `v0.1.0` (core, discovery, mcp source) | `9e18343470837810c3da3bd47c0913b096844b17` |
| engawa-react@0.1.0 (squash merge PR #9)           | `7555a0f90f1213631b8f1e8278a6d0a10b51b023` |

Do **not** move tag `v0.1.0`. Future releases use new semver tags (see [docs/releasing.md](docs/releasing.md)).

[0.1.1]: https://github.com/thierry-gilgen-ict/engawa/compare/v0.1.0...engawa-core-v0.1.1

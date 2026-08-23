# Changelog

All notable changes to Engawa are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.1.1] — unreleased (source prepared)

### engawa-core, engawa-discovery, engawa-mcp

- Add `"engines": { "node": ">=24" }` to package manifests (v0.1.0 npm tarballs omitted package-level engines metadata).

No runtime API changes intended for this patch.

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

[0.1.1]: https://github.com/thierry-gilgen-ict/engawa/compare/v0.1.0...main

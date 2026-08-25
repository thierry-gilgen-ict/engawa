# AGENTS.md

Orientation for coding agents working in or with the Engawa repository.

## What Engawa is

Open toolkit for **agent-native websites**: human HTML plus structured agent surfaces (`llms.txt`, markdown alternates, read-only MCP, optional Bring Your Agent UI).

## Current published packages (npm)

| Package                                | Version |
| -------------------------------------- | ------- |
| `@thierry-gilgen-ict/engawa-core`      | 0.1.1   |
| `@thierry-gilgen-ict/engawa-discovery` | 0.1.1   |
| `@thierry-gilgen-ict/engawa-mcp`       | 0.1.1   |
| `@thierry-gilgen-ict/engawa-react`     | 0.1.0   |
| `@thierry-gilgen-ict/engawa-map`       | 0.1.0   |
| `@thierry-gilgen-ict/engawa-cli`       | 0.1.0   |

**Node.js 24+** required (`engines` in package manifests).

Package versions may diverge by design. See [docs/compatibility.md](docs/compatibility.md).

## Defaults and invariants

- Public Engawa is **read-only** by default (v0.1: `search_site` only on public MCP).
- **Generic MCP** is the canonical fallback for provider UX—not fake one-click connects.
- **Content parity:** `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE` ([content publication rule](docs/content-publication.md)).
- No `engawa-nextjs` package in v0.1—document patterns in `docs/integrations/` (including [headless CMS](docs/integrations/headless-cms.md)).
- Do not expose secrets, sessions, drafts, or admin-only corpus on public surfaces.
- Do not register a site on the [Distribution Map](docs/distribution-map.md) without explicit user request (`DO_NOT_REGISTER_MAP_WITHOUT_EXPLICIT_USER_REQUEST`).
- Distribution Map CLI is published (`@thierry-gilgen-ict/engawa-map@0.1.0`); production registry is live. Staging remains available via `ENGAWA_MAP_ENDPOINT`. Respect `ENGAWA_CI_REGISTRY_NETWORK` in tests. See [distribution-map-api.md](docs/distribution-map-api.md).
- Do not execute application config or import app modules for map registration (`DO_NOT_EXECUTE_APPLICATION_CONFIG_FOR_MAP`; `ENGAWA_MAP_EXECUTES_APPLICATION_CODE = NO`).
- Do not place map tokens in website runtime, MCP, or React (`DO_NOT_USE_MAP_TOKEN_IN_WEBSITE_RUNTIME`).

## Integrating Engawa into another website

Start here (external consumer repos):

1. [Agent integration playbook](docs/agent-integration-playbook.md)
2. [Integrating an existing site](docs/integrating-an-existing-site.md)
3. [Ready-to-copy integrate prompt](docs/prompts/integrate-engawa.md)
4. [Integration acceptance contract](docs/integration-acceptance.md)

## Upgrading an existing Engawa integration

- [Upgrading guide](docs/upgrading.md)
- [Compatibility matrix](docs/compatibility.md)
- [Upgrade prompt](docs/prompts/upgrade-engawa.md)

## Working in this monorepo

- [CONTRIBUTING.md](CONTRIBUTING.md) — setup, tests, PR expectations
- [docs/security-model.md](docs/security-model.md)
- [docs/releasing.md](docs/releasing.md) — maintainer npm publish (not consumer upgrades)
- [docs/release-and-operations.md](docs/release-and-operations.md) — post-launch release and ops runbook

Do not duplicate full guides in this file—follow the links above.

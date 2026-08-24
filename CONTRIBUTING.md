# Contributing to Engawa

Thank you for your interest in Engawa.

## Requirements

- **Node.js 24 LTS**
- **pnpm 9** (`packageManager` in root `package.json`)

## Setup

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm lint
pnpm format          # check
pnpm format:write    # fix
```

## Repository layout

```text
packages/
  core/       — config, adapters, createEngawa
  discovery/  — llms.txt, discovery links
  mcp/        — public MCP server
  react/      — Bring Your Agent UI
examples/
  minimal-site/ — runnable vertical slice (workspace packages)
docs/           — guides, ADRs, security model
tests/          — cross-package tests
```

## Making changes

- Keep changes focused; explain **why** in the PR description.
- Respect package boundaries: core must not depend on MCP, React, or HTTP frameworks.
- Match existing TypeScript style; run format and lint before pushing.
- Add or update tests when behavior changes.
- Update `CHANGELOG.md` for user-visible package changes.

## Security expectations

- Public v0.1 surface is **read-only**. Do not add unauthenticated mutating MCP tools without a dedicated security design.
- Adapters define the public corpus—see [docs/content-publication.md](docs/content-publication.md).
- Do not commit secrets, `.env`, or npm tokens.

## Framework adapters

Do **not** add `engawa-nextjs` or similar framework packages prematurely. Document integration patterns in `docs/integrations/` until multiple consumers share identical glue.

Reference sites (Next.js) keep host-specific route handlers, guards, and rate limits in their applications.

## Versioning

- Follow semver for published packages.
- Do not republish existing npm versions.
- See [docs/releasing.md](docs/releasing.md) for maintainer publish flow and [docs/release-and-operations.md](docs/release-and-operations.md) for post-launch operations.

### CHANGELOG UPGRADE_IMPACT

User-facing releases should include an `UPGRADE_IMPACT` block (see [docs/upgrading.md](docs/upgrading.md)):

```text
BREAKING_CHANGE = YES / NO
MIGRATION_REQUIRED = YES / NO
MIN_NODE = <version>
PACKAGE_SET = <tested together>
MIGRATION_GUIDE = <path or NONE>
```

When `MIGRATION_REQUIRED = YES`, add `docs/migrations/<from>-to-<to>.md` per [docs/migrations/README.md](docs/migrations/README.md).

## Pull requests

- Open PRs against `main`.
- CI must pass: build, typecheck, test, lint, format, external registry consumer smoke.
- Link related issues when applicable.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security reports

See [SECURITY.md](SECURITY.md)—report privately to info@thierry-gilgen-ict.ch.

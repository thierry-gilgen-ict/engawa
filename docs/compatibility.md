# Engawa compatibility matrix

Answers: **Which Engawa package versions are tested together?**

Engawa is a monorepo with **independently versioned packages**. Production sites may pin different package versions when documented—do not assume all `@thierry-gilgen-ict/engawa-*` versions must match.

## Current tested release set

```text
ENGAWA_RELEASE_SET = 2026-08-v0.1.1
```

| Package | Version | Notes |
| ------- | ------- | ----- |
| `@thierry-gilgen-ict/engawa-core` | 0.1.1 | `engines.node >= 24` |
| `@thierry-gilgen-ict/engawa-discovery` | 0.1.1 | depends on core `0.1.1` |
| `@thierry-gilgen-ict/engawa-mcp` | 0.1.1 | depends on core `0.1.1` |
| `@thierry-gilgen-ict/engawa-react` | 0.1.0 | optional BYA UI; not republished in 0.1.1 |
| Node.js | >= 24 | LTS |

```text
TESTED_TOGETHER = YES
```

Verified by:

- Engawa monorepo CI (build, test, release-candidate smoke, external registry consumer smoke)
- [Production reference integrations](production-references.md)

## Runtime API migration notes

| Transition | Migration |
| ---------- | --------- |
| core/discovery/mcp `0.1.0` → `0.1.1` | **None** — engines metadata and release packaging |
| react `0.1.0` | Unchanged in this release set |

See [CHANGELOG.md](../CHANGELOG.md) and [upgrading.md](upgrading.md).

## Package divergence policy

- Bump only packages that changed for your integration needs.
- When upgrading core, upgrade discovery/mcp to versions that declare a matching core dependency in npm metadata.
- `engawa-react` may remain on an older semver until a new react release ships.

## Adding future release sets

When Engawa publishes a new tested set:

1. Add a row block to this document with a new `ENGAWA_RELEASE_SET` identifier (date + version summary).
2. Update [compatibility.md](compatibility.md) current set pointer in README / AGENTS.md if needed.
3. Document `UPGRADE_IMPACT` in CHANGELOG.
4. Add migration doc when `MIGRATION_REQUIRED = YES`.

## Related

- [Upgrading](upgrading.md)
- [publish-npm-v0.1.1.md](publish-npm-v0.1.1.md) — publication record
- [Integration acceptance](integration-acceptance.md)

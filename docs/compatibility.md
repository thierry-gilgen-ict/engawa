# Engawa compatibility matrix

Answers: **Which Engawa package versions are tested together?**

Engawa is a monorepo with **independently versioned packages**. Production sites may pin different package versions when documented—do not assume all `@thierry-gilgen-ict/engawa-*` versions must match.

## Current tested release set

```text
ENGAWA_RELEASE_SET = 2026-08-discovery-v0.2.0
```

| Package                                | Version | Notes                                                   |
| -------------------------------------- | ------- | ------------------------------------------------------- |
| `@thierry-gilgen-ict/engawa-core`      | 0.1.1   | `engines.node >= 24`                                    |
| `@thierry-gilgen-ict/engawa-discovery` | 0.2.0   | depends on core `0.1.1`; adds authorable `buildLlmsTxt` |
| `@thierry-gilgen-ict/engawa-mcp`       | 0.1.1   | depends on core `0.1.1`                                 |
| `@thierry-gilgen-ict/engawa-react`     | 0.1.0   | optional BYA UI                                         |
| Node.js                                | >= 24   | LTS                                                     |

```text
TESTED_TOGETHER = YES
```

Verified by:

- Engawa monorepo CI (build, test, discovery release-candidate smoke, registry consumer verification)
- Published `@thierry-gilgen-ict/engawa-discovery@0.2.0` on the public npm registry

Production reference sites may still run older pins; see [production-references.md](production-references.md). This release set does **not** claim those sites were upgraded to discovery `0.2.0`.

## Previous tested release set (historical)

```text
ENGAWA_RELEASE_SET = 2026-08-v0.1.1
```

| Package                                | Version | Notes                                     |
| -------------------------------------- | ------- | ----------------------------------------- |
| `@thierry-gilgen-ict/engawa-core`      | 0.1.1   | `engines.node >= 24`                      |
| `@thierry-gilgen-ict/engawa-discovery` | 0.1.1   | depends on core `0.1.1`                   |
| `@thierry-gilgen-ict/engawa-mcp`       | 0.1.1   | depends on core `0.1.1`                   |
| `@thierry-gilgen-ict/engawa-react`     | 0.1.0   | optional BYA UI; not republished in 0.1.1 |
| Node.js                                | >= 24   | LTS                                       |

See [publish-npm-v0.1.1.md](publish-npm-v0.1.1.md).

## Runtime API migration notes

| Transition                           | Migration                                               |
| ------------------------------------ | ------------------------------------------------------- |
| core/discovery/mcp `0.1.0` → `0.1.1` | **None** — engines metadata and release packaging       |
| discovery `0.1.1` → `0.2.0`          | **None** — see flags below; `generateLlmsTxt` preserved |
| react `0.1.0`                        | Unchanged across these release sets                     |

```text
discovery 0.1.1 → 0.2.0
BREAKING_CHANGE = NO
MIGRATION_REQUIRED = NO
LEGACY_GENERATE_API = PRESERVED
buildLlmsTxt = NEWLY_AVAILABLE
```

See [CHANGELOG.md](../CHANGELOG.md), [upgrading.md](upgrading.md), and [llms-txt-authoring.md](llms-txt-authoring.md).

## Package divergence policy

- Bump only packages that changed for your integration needs.
- When upgrading core, upgrade discovery/mcp to versions that declare a matching core dependency in npm metadata.
- `engawa-react` may remain on an older semver until a new react release ships.
- Discovery may advance independently (e.g. `0.2.0` with core still at `0.1.1`).

## Adding future release sets

When Engawa publishes a new tested set:

1. Move the prior current block under a historical heading; keep its `ENGAWA_RELEASE_SET` identifier.
2. Add a new current block with a new `ENGAWA_RELEASE_SET` identifier (date + version summary).
3. Update README / AGENTS.md / playbook current pointers if needed.
4. Document `UPGRADE_IMPACT` in CHANGELOG.
5. Add migration doc when `MIGRATION_REQUIRED = YES`.

## Related

- [Upgrading](upgrading.md)
- [publish-npm-discovery-v0.2.0.md](publish-npm-discovery-v0.2.0.md) — discovery 0.2.0 publication record
- [publish-npm-v0.1.1.md](publish-npm-v0.1.1.md) — core/discovery/mcp 0.1.1 publication record
- [Integration acceptance](integration-acceptance.md)

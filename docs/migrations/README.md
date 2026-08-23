# Engawa migration guides

Migration documents describe **consumer code changes** when upgrading Engawa packages across releases that require migration.

## When no migration doc is needed

If a release's CHANGELOG `UPGRADE_IMPACT` states:

```text
MIGRATION_REQUIRED = NO
```

then **no file in this directory is required** for that upgrade. Follow [upgrading.md](../upgrading.md) and the [integration acceptance contract](../integration-acceptance.md).

Example: upgrading core/discovery/mcp from `0.1.0` to `0.1.1` (engines metadata only).

## When a migration doc is required

If:

```text
BREAKING_CHANGE = YES
MIGRATION_REQUIRED = YES
```

then add:

```text
docs/migrations/<from-version>-to-<to-version>.md
```

Each migration guide must include:

1. **Affected packages** — which `@thierry-gilgen-ict/engawa-*` packages change
2. **Before** — behavior or API consumers relied on
3. **After** — new behavior or API
4. **Code changes** — adapter, routes, config, types
5. **Config changes** — `EngawaConfig` fields, env, host settings
6. **Deployment implications** — Node version, build, cache, CDN
7. **Acceptance tests** — link to [integration acceptance](../integration-acceptance.md)
8. **Rollback** — how to revert package pins and redeploy

Link the migration file from CHANGELOG `MIGRATION_GUIDE`.

## Agent stop condition

Coding agents must **STOP** if:

```text
BREAKING_CHANGE = YES
AND MIGRATION_GUIDE is missing or NONE
```

See [upgrade prompt](../prompts/upgrade-engawa.md).

# Upgrading Engawa in an existing website

This guide is for **websites that already consume Engawa from npm**. Maintainers publishing new Engawa versions should read [releasing.md](releasing.md) instead.

## How do I safely upgrade?

Follow this sequence. Do not skip acceptance checks on production-style deployments.

### 1. Detect currently installed versions

```bash
npm ls @thierry-gilgen-ict/engawa-core
npm ls @thierry-gilgen-ict/engawa-discovery
npm ls @thierry-gilgen-ict/engawa-mcp
npm ls @thierry-gilgen-ict/engawa-react
```

Or inspect `package.json` / lockfile pins directly.

### 2. Identify the target tested package set

See [compatibility.md](compatibility.md) for the current `ENGAWA_RELEASE_SET` and which versions are tested together.

Engawa packages **may diverge** in version (e.g. react `0.1.0` while core is `0.1.1`). Do not force all packages to identical semver for aesthetics.

### 3. Read CHANGELOG

Check [CHANGELOG.md](../CHANGELOG.md) for the target versions. Look for the **UPGRADE_IMPACT** block on each release.

### 4. Read migration guide if required

If `MIGRATION_REQUIRED = YES`, read the linked document in [migrations/](migrations/README.md). **Stop** if breaking change is documented but no migration guide exists.

### 5. Check Node / runtime requirements

Verify `MIN_NODE` in UPGRADE_IMPACT (currently **24+** for v0.1.x). Upgrade host runtime before package upgrade if needed.

### 6. Create an upgrade branch

```bash
git switch -c chore/upgrade-engawa-<target-set>
```

### 7. Update exact package pins

Update only the Engawa packages that changed in the target set. Use exact versions in `package.json` (not floating ranges) for production reference-style deployments.

### 8. Install and update lockfile

```bash
npm install
# or pnpm install / yarn — match your project
```

### 9. Run site tests

```bash
# your project's commands, e.g.
npm run lint && npm run typecheck && npm test && npm run build
```

### 10. Run Engawa acceptance checks

Use [integration acceptance contract](integration-acceptance.md):

- `llms.txt`
- Markdown alternates
- MCP `resources/list`, `resources/read`, `tools/list`, `search_site`
- Private-content sentinels (admin, drafts, contact data)
- BYA if installed

### 11. Compare public corpus before/after

Record `PUBLIC_RESOURCE_COUNT` and spot-check representative routes. Count should match expectations; content should remain human-public parity.

### 12. Deploy

Deploy through your normal pipeline. Re-run acceptance on production URLs.

### 13. Production smoke

Verify live endpoints after deploy. Compare to staging results.

### 14. Rollback path

If upgrade fails in production:

1. Restore previous Engawa version pins in `package.json`.
2. Restore lockfile from the known-good commit (`git checkout <sha> -- package-lock.json` or equivalent).
3. Reinstall dependencies.
4. Redeploy the previous known-good site commit.

Human-facing content and CMS data are unaffected when adapters only read existing public loaders.

---

## UPGRADE_IMPACT standard

Every future Engawa CHANGELOG release entry should include:

```text
UPGRADE_IMPACT
BREAKING_CHANGE = YES / NO
MIGRATION_REQUIRED = YES / NO
MIN_NODE = <version>
PACKAGE_SET = <list tested together>
MIGRATION_GUIDE = <path or NONE>
```

When `MIGRATION_REQUIRED = YES`, add `docs/migrations/<from>-to-<to>.md` per [migrations/README.md](migrations/README.md).

### Example: 0.1.1 (core / discovery / mcp)

```text
UPGRADE_IMPACT
BREAKING_CHANGE = NO
MIGRATION_REQUIRED = NO
MIN_NODE = 24
PACKAGE_SET = core@0.1.1, discovery@0.1.1, mcp@0.1.1, react@0.1.0
MIGRATION_GUIDE = NONE
```

Runtime API migration from `0.1.0` → `0.1.1` for core/discovery/mcp: **none** (engines metadata and packaging only).

---

## Related

- [Compatibility matrix](compatibility.md)
- [Consuming from npm](integration-consuming-from-npm.md)
- [Agent upgrade prompt](prompts/upgrade-engawa.md)
- [Integration acceptance](integration-acceptance.md)

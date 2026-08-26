# Releasing Engawa packages

This document describes how maintainers publish `@thierry-gilgen-ict/engawa-*` to the public npm registry.

**Requirements:** Node.js 24+, pnpm 9, npm account with publish access to `@thierry-gilgen-ict`.

## Publication state

| Phase                                                                                   | `NPM_PUBLICATION_STATE`       |
| --------------------------------------------------------------------------------------- | ----------------------------- |
| Before reviewed release PR is merged to `main`                                          | `BLOCKED_ON_REVIEW_AND_MERGE` |
| After merge, artifacts prepared from clean `main`, before maintainer runs `npm publish` | `WAITING_FOR_USER`            |

Agents must not publish without explicit user authorization.

## Before you release

1. Changes are merged to `main` (not from an unreviewed feature branch).
2. `CHANGELOG.md` updated for the target version.
3. Worktree clean; on latest `main`.
4. Record release source SHA: `git rev-parse HEAD`.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm lint
pnpm format
```

## Version policy

- **Immutable versions** — never republish or overwrite an existing npm version.
- **Do not move global tag `v0.1.0`** — it points to commit `9e18343` (core/discovery/mcp original release source).
- **engawa-react@0.1.0** source: commit `7555a0f` (PR #9 squash).
- When packages diverge, use **package-specific tags**:

  ```text
  engawa-core-v0.1.1
  engawa-discovery-v0.1.1
  engawa-mcp-v0.1.1
  engawa-react-v0.1.0
  ```

- Do not synchronize all package versions for aesthetics. Bump only packages that changed.
- CLI package tag `engawa-cli-v0.1.0` published 2026-08-25 — see [publish-npm-cli-v0.1.0.md](publish-npm-cli-v0.1.0.md).

## Monorepo dependency note

`packages/discovery` and `packages/mcp` use `workspace:*` for `@thierry-gilgen-ict/engawa-core` in source. That is correct for monorepo development. **Published** discovery/mcp tarballs must declare an exact semver core dependency — never `workspace:*`. Use `scripts/stage-npm-tarballs.mjs` to produce publishable artifacts.

## Preflight

Verify target versions are **not** already on npm:

```bash
npm view @thierry-gilgen-ict/engawa-core@0.1.1 version
npm view @thierry-gilgen-ict/engawa-discovery@0.1.1 version
npm view @thierry-gilgen-ict/engawa-mcp@0.1.1 version
# Expect E404 before first publish
```

Dry-run core pack:

```bash
cd packages/core
npm pack --dry-run
```

## Stage publish artifacts

From repo root after `pnpm build`:

```bash
node scripts/stage-npm-tarballs.mjs
```

This produces exact tarball filenames (staging cleans prior `*.tgz` and `.npm-staging` artifacts first):

| Artifact                          | Exact path                                                             |
| --------------------------------- | ---------------------------------------------------------------------- |
| `engawa-core` tarball             | `packages/core/thierry-gilgen-ict-engawa-core-0.1.1.tgz`               |
| `engawa-discovery` staged tarball | `.npm-staging/discovery/thierry-gilgen-ict-engawa-discovery-0.1.1.tgz` |
| `engawa-mcp` staged tarball       | `.npm-staging/mcp/thierry-gilgen-ict-engawa-mcp-0.1.1.tgz`             |

**Inspect staged metadata** before publishing:

```bash
# discovery staged package.json (source of tarball metadata)
cat .npm-staging/discovery/package.json
# mcp staged package.json
cat .npm-staging/mcp/package.json
```

Required values:

| Package   | Field                                          | Expected                                          |
| --------- | ---------------------------------------------- | ------------------------------------------------- |
| CORE      | `name`                                         | `@thierry-gilgen-ict/engawa-core`                 |
| CORE      | `version`                                      | target (e.g. `0.1.1`)                             |
| CORE      | `engines.node`                                 | `>=24`                                            |
| DISCOVERY | `name`                                         | `@thierry-gilgen-ict/engawa-discovery`            |
| DISCOVERY | `version`                                      | target (e.g. `0.1.1`)                             |
| DISCOVERY | `engines.node`                                 | `>=24`                                            |
| DISCOVERY | `dependencies.@thierry-gilgen-ict/engawa-core` | exact semver (e.g. `0.1.1`), **no `workspace:*`** |
| MCP       | `name`                                         | `@thierry-gilgen-ict/engawa-mcp`                  |
| MCP       | `version`                                      | target (e.g. `0.1.1`)                             |
| MCP       | `engines.node`                                 | `>=24`                                            |
| MCP       | `dependencies.@thierry-gilgen-ict/engawa-core` | exact semver (e.g. `0.1.1`), **no `workspace:*`** |

Also run the release-candidate smoke locally:

```bash
node scripts/v011-release-candidate-smoke.mjs
```

Expect `ENGAWA_V011_RELEASE_CANDIDATE_SMOKE = PASS`.

## engawa-discovery (discovery-only minor release)

`@thierry-gilgen-ict/engawa-discovery` may version independently when only discovery changes (e.g. `0.2.0` while core/mcp remain `0.1.1`). Do not synchronize all package versions for aesthetics.

**Release model (discovery-only)**

```text
clean reviewed main (runtime already merged)
↓
bump packages/discovery/package.json only
↓
CHANGELOG pending entry
↓
pnpm build
↓
node scripts/stage-npm-tarballs.mjs --discovery-only
↓
inspect discovery tarball (allowlist + secret/path scan)
↓
pnpm smoke:discovery-rc   # persistent packed-artifact smoke; safe before and after publish
↓
WAIT_FOR_USER
↓
pnpm smoke:discovery-publish-preflight   # immediately before npm publish only
↓
maintainer explicitly authorizes npm publish (discovery tarball only)
↓
npm publish <exact-discovery-tarball> --access public
↓
verify registry
↓
git tag engawa-discovery-v<version>   # after successful publish, not before
```

Staged discovery tarball depends on published `@thierry-gilgen-ict/engawa-core` at the exact semver from `packages/core/package.json` (never `workspace:*` in the tarball). Consumers install core from the registry; the packed-artifact smoke installs registry core plus the packed discovery artifact.

**Discovery-only staging**

```bash
node scripts/stage-npm-tarballs.mjs --discovery-only
```

Produces only `.npm-staging/discovery/thierry-gilgen-ict-engawa-discovery-<version>.tgz` (clears prior discovery staging, does not pack core or mcp). Default `stage-npm-tarballs.mjs` (no flag) unchanged: core + discovery + mcp.

**Packed-artifact smoke (CI + post-publish safe)**

```bash
pnpm smoke:discovery-rc
```

Stages the discovery tarball, inspects allowlist/secret/path artifacts, installs registry core plus the packed discovery artifact, and exercises `generateLlmsTxt` / `buildLlmsTxt`. Does **not** assert that the source discovery version is absent from npm — safe to run in normal CI before and after publication.

Expect `ENGAWA_DISCOVERY_RELEASE_CANDIDATE_SMOKE = PASS`.

**Pre-publication registry gate (maintainer only — not CI)**

Run **immediately before** `npm publish`. Versions are read from `packages/discovery/package.json` and `packages/core/package.json`:

```bash
pnpm smoke:discovery-publish-preflight
```

Expect `ENGAWA_DISCOVERY_PUBLISH_PREFLIGHT = PASS` (target discovery version E404 on npm; required core version present). Fails if the target discovery version is already published.

Manual equivalent:

```bash
npm view @thierry-gilgen-ict/engawa-discovery@<discovery-version> version   # expect E404
npm view @thierry-gilgen-ict/engawa-core@<core-version> version             # expect <core-version>
```

Published 2026-08-26 — see [publish-npm-discovery-v0.2.0.md](publish-npm-discovery-v0.2.0.md). Tag `engawa-discovery-v0.2.0` points at release source `c1c4cce`.

## engawa-cli (standalone pack)

`@thierry-gilgen-ict/engawa-cli` does **not** declare workspace Engawa packages as runtime dependencies. Published CLI tarballs need no `stage-npm-tarballs.mjs` rewrite — pack the built package directory directly.

**Release model**

```text
clean reviewed main
↓
pnpm build
↓
npm pack (exact CLI artifact)
↓
inspect tarball (allowlist + secret/path scan)
↓
pnpm smoke:cli-rc   # packed external consumer: bin + inspect/init/doctor
↓
WAIT_FOR_USER
↓
maintainer explicitly authorizes npm publish
↓
npm publish <exact-cli-tarball> --access public
↓
verify registry
↓
git tag engawa-cli-v0.1.0   # points at reviewed release source SHA
```

Published 2026-08-25 — see [publish-npm-cli-v0.1.0.md](publish-npm-cli-v0.1.0.md).

Preflight (expect E404 before first publish):

```bash
npm view @thierry-gilgen-ict/engawa-cli@0.1.0 version
```

Pack and smoke locally after `pnpm build`:

```bash
cd packages/cli
npm pack --dry-run --json
# create a disposable tarball for smoke (do not commit *.tgz)
pnpm smoke:cli-rc
```

Expect `ENGAWA_CLI_RELEASE_CANDIDATE_SMOKE = PASS`.

**Future publish** (maintainer only — do not run without explicit authorization):

```bash
npm publish thierry-gilgen-ict-engawa-cli-0.1.0.tgz --access public
git tag engawa-cli-v0.1.0
git push origin engawa-cli-v0.1.0
```

Do not move `v0.1.0`, `engawa-core-v0.1.1`, `engawa-discovery-v0.1.1`, `engawa-mcp-v0.1.1`, `engawa-react-v0.1.0`, or `engawa-map-v0.1.0`.

## Publish (interactive — maintainer only)

**STOP:** Publication requires interactive npm login / WebAuthn. Agents must not publish without explicit user authorization.

Publish the **exact inspected tarballs** in order. Do not publish from package directories after inspection—the tarball is the release artifact.

```bash
npm publish packages/core/thierry-gilgen-ict-engawa-core-0.1.1.tgz --access public
npm publish .npm-staging/discovery/thierry-gilgen-ict-engawa-discovery-0.1.1.tgz --access public
npm publish .npm-staging/mcp/thierry-gilgen-ict-engawa-mcp-0.1.1.tgz --access public
```

**react** — **do not republish `0.1.0`** unless a new react version is explicitly released.

Tag after publish (tags must point to the reviewed release source SHA):

```bash
git tag engawa-core-v0.1.1
git tag engawa-discovery-v0.1.1
git tag engawa-mcp-v0.1.1
git push origin engawa-core-v0.1.1 engawa-discovery-v0.1.1 engawa-mcp-v0.1.1
```

Do not move `v0.1.0` or `engawa-react-v0.1.0`.

## Post-publish verification

1. Confirm registry versions:

   ```bash
   npm view @thierry-gilgen-ict/engawa-core@0.1.1 version
   npm view @thierry-gilgen-ict/engawa-discovery@0.1.1 version
   npm view @thierry-gilgen-ict/engawa-mcp@0.1.1 version
   npm view @thierry-gilgen-ict/engawa-react@0.1.0 version
   ```

2. **External consumer smoke** against published versions:

   ```bash
   node scripts/external-consumer-smoke.mjs 0.1.1
   ```

   Expect `ENGAWA_EXTERNAL_CONSUMER_SMOKE = PASS`.

3. Verify react remains at `0.1.0` (do not republish).

4. Clean staging artifacts after publish: `.npm-staging/` and `*.tgz` in package directories.

## Post-publish closeout (v0.1.1)

After maintainer publishes interactively, **Phase 2B is not CLOSED** until a separate post-publish documentation PR/commit is merged:

1. Date/finalize `CHANGELOG.md` for `0.1.1`.
2. Add `docs/publish-npm-v0.1.1.md` (publication record).
3. Update README and `docs/getting-started.md` pins to `0.1.1` for core/discovery/mcp; keep `engawa-react` at `0.1.0`.
4. Update README status line to reflect published `0.1.1`.
5. Update CI external consumer smoke to `node scripts/external-consumer-smoke.mjs 0.1.1`.

Until that closeout merge, public documentation correctly targets the **currently published** registry versions.

## CI policy

- PR CI does **not** publish to npm.
- PR CI runs external consumer smoke against **currently published** registry versions (`0.1.1` for core/discovery/mcp; react pinned to `0.1.0` in smoke script).
- PR CI runs v0.1.1 release-candidate smoke against local staged tarballs (`scripts/v011-release-candidate-smoke.mjs`).
- PR CI runs engawa-cli release-candidate pack smoke (`scripts/cli-release-candidate-smoke.mjs`).
- PR CI runs engawa-map release-candidate pack smoke (`scripts/map-release-candidate-smoke.mjs`).

## Related

- [integration-consuming-from-npm.md](integration-consuming-from-npm.md)
- [publish-npm-v0.1.0.md](publish-npm-v0.1.0.md) — v0.1.0 publication record
- [publish-npm-v0.1.1.md](publish-npm-v0.1.1.md) — v0.1.1 publication record

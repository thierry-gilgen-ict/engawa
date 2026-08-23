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

This produces:

| Artifact                          | Location                       |
| --------------------------------- | ------------------------------ |
| `engawa-core` tarball             | `packages/core/*.tgz`          |
| `engawa-discovery` staged tarball | `.npm-staging/discovery/*.tgz` |
| `engawa-mcp` staged tarball       | `.npm-staging/mcp/*.tgz`       |

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

## Publish (interactive — maintainer only)

**STOP:** Publication requires interactive npm login / WebAuthn. Agents must not publish without explicit user authorization.

Publish the **inspected tarballs** in order. Prefer publishing the exact tarball you inspected rather than regenerating a different artifact at publish time.

1. **core** — from `packages/core`:

   ```bash
   cd packages/core
   npm publish --access public
   ```

   Or publish the packed tarball: `npm publish engawa-core-0.1.1.tgz --access public`

2. **discovery** — publish staged tarball:

   ```bash
   npm publish .npm-staging/discovery/thierry-gilgen-ict-engawa-discovery-0.1.1.tgz --access public
   ```

3. **mcp** — publish staged tarball:

   ```bash
   npm publish .npm-staging/mcp/thierry-gilgen-ict-engawa-mcp-0.1.1.tgz --access public
   ```

4. **react** — **do not republish `0.1.0`** unless a new react version is explicitly released.

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

Until that closeout merge, public documentation correctly targets the **currently published** registry versions (`0.1.0` until `0.1.1` is live and docs are updated).

## CI policy

- PR CI does **not** publish to npm.
- PR CI runs external consumer smoke against **currently published** registry versions (`0.1.0` until post-publish closeout).
- PR CI runs v0.1.1 release-candidate smoke against local staged tarballs (`scripts/v011-release-candidate-smoke.mjs`).

## Related

- [integration-consuming-from-npm.md](integration-consuming-from-npm.md)
- [publish-npm-v0.1.0.md](publish-npm-v0.1.0.md) — v0.1.0 publication record

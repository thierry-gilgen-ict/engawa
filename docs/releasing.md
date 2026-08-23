# Releasing Engawa packages

This document describes how maintainers publish `@thierry-gilgen-ict/engawa-*` to the public npm registry.

**Requirements:** Node.js 24+, pnpm 9, npm account with publish access to `@thierry-gilgen-ict`.

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

## Preflight (per package)

From each package directory (`packages/core`, etc.):

```bash
npm pack --dry-run
npm pack
```

Inspect tarball contents: `dist/`, `README.md`, `LICENSE`, no `src/` required in publish if `files` lists `dist`.

Verify target version is **not** already on npm:

```bash
npm view @thierry-gilgen-ict/engawa-core@0.1.1 version
# Expect E404 before first publish
```

## Publish (interactive — maintainer only)

**STOP:** Publication requires interactive npm login / WebAuthn. Agents must not publish without explicit user authorization.

From package directory, on clean `main`:

```bash
npm publish --access public
```

Publish order when core version changes:

1. `@thierry-gilgen-ict/engawa-core`
2. `@thierry-gilgen-ict/engawa-discovery` (update dependency to published core version)
3. `@thierry-gilgen-ict/engawa-mcp`
4. `@thierry-gilgen-ict/engawa-react` (only if changed)

Tag after publish:

```bash
git tag engawa-core-v0.1.1
git push origin engawa-core-v0.1.1
```

## Post-publish verification

1. **External consumer smoke** (from repo root):

   ```bash
   node scripts/external-consumer-smoke.mjs
   ```

   Expect `ENGAWA_EXTERNAL_CONSUMER_SMOKE = PASS` against registry versions you published.

2. **Clean install** in a temp directory:

   ```bash
   npm install @thierry-gilgen-ict/engawa-core@<version>
   node -e "import('@thierry-gilgen-ict/engawa-core').then(m => console.log(Object.keys(m).slice(0,5)))"
   ```

3. Record published versions in `CHANGELOG.md` and `docs/publish-npm-v0.1.0.md` (or successor doc).

## CI policy

- PR CI does **not** publish to npm.
- PR CI runs external consumer smoke against **currently published** registry versions (see `scripts/external-consumer-smoke.mjs`).

## Related

- [integration-consuming-from-npm.md](integration-consuming-from-npm.md)
- [publish-npm-v0.1.0.md](publish-npm-v0.1.0.md) — v0.1.0 publication record

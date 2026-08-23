# Engawa v0.1.0 on npm (published)

**Status:** Published to the public npm registry.

| Package                                | Version |
| -------------------------------------- | ------- |
| `@thierry-gilgen-ict/engawa-core`      | 0.1.0   |
| `@thierry-gilgen-ict/engawa-discovery` | 0.1.0   |
| `@thierry-gilgen-ict/engawa-mcp`       | 0.1.0   |
| `@thierry-gilgen-ict/engawa-react`     | 0.1.0   |

**Source baselines:**

| Package                                         | Engawa commit                                                 |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `engawa-core`, `engawa-discovery`, `engawa-mcp` | `9e18343` (MIT LICENSE in each package tarball)               |
| `engawa-react`                                  | `7555a0f` (squash merge of PR #9 — Bring Your Agent React UX) |

**Do not republish `0.1.0`.** Future changes ship as a new semver release.

## Consumption (downstream sites)

```json
{
  "dependencies": {
    "@thierry-gilgen-ict/engawa-core": "0.1.0",
    "@thierry-gilgen-ict/engawa-discovery": "0.1.0",
    "@thierry-gilgen-ict/engawa-mcp": "0.1.0"
  }
}
```

```bash
npm ci
```

See [integration-consuming-from-npm.md](./integration-consuming-from-npm.md).

## Verify clean registry install

```bash
rm -rf /tmp/engawa-smoke && mkdir /tmp/engawa-smoke && cd /tmp/engawa-smoke
npm init -y
npm install @thierry-gilgen-ict/engawa-core@0.1.0 @thierry-gilgen-ict/engawa-discovery@0.1.0 @thierry-gilgen-ict/engawa-mcp@0.1.0
node -e "import('@thierry-gilgen-ict/engawa-mcp').then(m => console.log(Object.keys(m)))"
```

## Releasing a future version (maintainers)

1. Bump versions in package manifests (not `0.1.0` again).
2. `pnpm install && pnpm build && pnpm test`
3. `node scripts/stage-npm-tarballs.mjs` (discovery/mcp need semver deps in tarballs).
4. Publish in order: core → discovery → mcp (interactive WebAuthn 2FA on npm; no `--otp` for security-key accounts).
5. Clean `.npm-staging/` and `*.tgz` after publish.

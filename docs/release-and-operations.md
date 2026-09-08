# Release and operations

Post-launch maintainer runbook for the Engawa monorepo. This document is the umbrella guide; package-specific publish steps remain in [releasing.md](releasing.md).

## npm immutable release policy

- **Package versions are immutable.** Never republish, overwrite, or unpublish a successful npm release.
- **Never retry a successful publish.** If a version such as `@thierry-gilgen-ict/engawa-core@0.1.1` is already on the public registry, treat it as final.
- **Verify registry state before publishing:**

  ```bash
  npm view @thierry-gilgen-ict/<package>@<version> version
  ```

  Expect `E404` only when the version is genuinely absent.

- **Publish only the exact tested tarball.** Build and inspect the tarball that will be published; record:
  - release source SHA (`git rev-parse HEAD` on the approved branch)
  - tarball SHA-256 (`Get-FileHash` / `shasum -a 256`)
- **Interactive npm authentication is maintainer-only.** WebAuthn/YubiKey login is allowed. Never commit, log, or expose npm auth tokens.
- **Do not publish from an unreviewed feature branch** or from a merge commit if the tarball was built from an earlier approved PR head.

See also: [releasing.md](releasing.md), [publish-npm-v0.1.0.md](publish-npm-v0.1.0.md), [publish-npm-v0.1.1.md](publish-npm-v0.1.1.md).

## Engawa package release flow

Generic checklist for any `@thierry-gilgen-ict/engawa-*` release:

1. **Branch** — create a focused release or docs branch from current `main`.
2. **PR** — open against `main`; keep scope minimal.
3. **CI** — require green (`validate` job: format, lint, build, typecheck, test, release-candidate smokes).
4. **Build** — `pnpm install --frozen-lockfile && pnpm build`.
5. **Pack** — produce the exact publish tarball (`pnpm pack`, `scripts/stage-npm-tarballs.mjs`, or package-specific smoke scripts).
6. **Tarball inspection** — verify `package.json`, `engines`, dependencies, and file list. For core/discovery/mcp: `node scripts/v011-release-candidate-smoke.mjs`. For CLI: `node scripts/cli-release-candidate-smoke.mjs`.
7. **External install smoke** — `node scripts/external-consumer-smoke.mjs <version>` against published or candidate tarballs as appropriate.
8. **Stranger path smoke** — `node scripts/stranger-path-smoke.mjs` (npm-only external fixture; not in default CI). Run before public announcement and before package-set releases.
9. **Live reference acceptance** — `node scripts/live-reference-acceptance.mjs` against production reference sites.
10. **npm publish once** — maintainer runs `npm publish <exact-tarball> --access public` interactively.
11. **npm registry verification** — `npm view`, integrity/dist fields, external consumer smoke against live registry.
12. **Merge release docs/state** — update README, CHANGELOG, publication records; merge PR.
13. **Post-merge CI** — confirm `main` CI SUCCESS after merge.

**Important:** If the tarball was built from an approved PR head, do **not** republish from the merge commit. The published artifact is tied to the approved source SHA.

## Distribution Map (discontinued)

```text
DISTRIBUTION_MAP_STATUS = DISCONTINUED
PRODUCTION_REGISTRY = OFFLINE
ENGAWA_MAP_NPM = DEPRECATED
```

- `@thierry-gilgen-ict/engawa-map` is **removed from this monorepo** and **deprecated on npm**. Do not publish new map versions.
- The registry service ([engawa-map-registry](https://github.com/thierry-gilgen-ict/engawa-map-registry)) is archived; hosts are offline.
- Website runtime, MCP, and React must never call a map registry or embed map tokens.

Historical policy: [distribution-map.md](distribution-map.md).

## Repository workflow (post-hardening)

- Changes land on `main` via **pull request** with green CI.
- Direct pushes to `main`, force pushes, and branch deletion are blocked.
- Solo maintainer: **0 required approvals** — PR + CI is the gate, not a second human reviewer.
- Emergency bypass of branch protection is exceptional only (GitHub repository settings); not the normal release or deploy path.

## Related

- [announce-readiness](announce-readiness/README.md) — announce phase ops (maintainers)
- [releasing.md](releasing.md) — detailed v0.1.1 publish flow
- [distribution-map-production-launch.md](distribution-map-production-launch.md) — launch contract
- [security-model.md](security-model.md) — Engawa security boundaries

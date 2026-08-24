# Release and operations

Post-launch maintainer runbook for the Engawa monorepo. This document is the umbrella guide; package-specific publish steps remain in [releasing.md](releasing.md).

## npm immutable release policy

- **Package versions are immutable.** Never republish, overwrite, or unpublish a successful npm release.
- **Never retry a successful publish.** If `@thierry-gilgen-ict/engawa-map@0.1.0` (or any other version) is already on the public registry, treat it as final.
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
6. **Tarball inspection** — verify `package.json`, `engines`, dependencies, and file list. For map: `node scripts/map-release-candidate-smoke.mjs`. For core/discovery/mcp: `node scripts/v011-release-candidate-smoke.mjs`.
7. **External install smoke** — `node scripts/external-consumer-smoke.mjs <version>` against published or candidate tarballs as appropriate.
8. **Stranger path smoke** — `node scripts/stranger-path-smoke.mjs` (npm-only external fixture; not in default CI). Run before public announcement and before package-set releases.
9. **Live reference acceptance** — `node scripts/live-reference-acceptance.mjs` against production reference sites.
10. **Live smoke** (where applicable) — for `@thierry-gilgen-ict/engawa-map`: fresh install from npm/tarball, `ENGAWA_MAP_ENDPOINT` unset, register → `PENDING` → status → unregister → old token `401`.
11. **npm publish once** — maintainer runs `npm publish <exact-tarball> --access public` interactively.
12. **npm registry verification** — `npm view`, integrity/dist fields, external consumer smoke against live registry.
13. **Merge release docs/state** — update README, CHANGELOG, publication records; merge PR.
14. **Post-merge CI** — confirm `main` CI SUCCESS after merge.

**Important:** If the tarball was built from an approved PR head, do **not** republish from the merge commit. The published artifact is tied to the approved source SHA.

## `@thierry-gilgen-ict/engawa-map` dependency expectations

`engawa-map` is **registry-client tooling only**. It does not run in website runtime, MCP, or React.

When a consumer runs `engawa-map register`, version detection reads the **consumer project's** `package.json` and `node_modules`:

| Package                                | Requirement                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@thierry-gilgen-ict/engawa-core`      | **Required** — must be declared in `dependencies` or `devDependencies` and installed in `node_modules` |
| `@thierry-gilgen-ict/engawa-discovery` | Optional — included in registration payload only if declared and installed                             |
| `@thierry-gilgen-ict/engawa-mcp`       | Optional — included only if declared and installed                                                     |
| `@thierry-gilgen-ict/engawa-react`     | Optional — included only if declared and installed                                                     |

The map package itself has **no npm dependency** on `engawa-core`. Missing declarations or missing installs produce a clear CLI error before any network call.

External install smoke for map therefore requires `@thierry-gilgen-ict/engawa-core` (and optionally other packages) in the test consumer project — not just `engawa-map` alone.

Implementation reference: `packages/map/src/constants.ts`, `packages/map/src/packages.ts`.

## Production registry relationship

```text
Engawa repo          !=  registry production service
engawa-map-registry  =   separate repository and security boundary
```

- **Engawa** (`thierry-gilgen-ict/engawa`) — open-source toolkit, npm packages, CLI source for `engawa-map`.
- **Registry** ([engawa-map-registry](https://github.com/thierry-gilgen-ict/engawa-map-registry)) — dedicated PostgreSQL-backed service deployed at `https://engawa-map.thierry-gilgen-ict.ch`.

A registry outage must **not** break normal Engawa website runtime, MCP, `llms.txt`, or Bring Your Agent. Map registration is voluntary and operator-initiated; there is no runtime phone-home from consumer packages.

Production registry operations: [production-operations.md](https://github.com/thierry-gilgen-ict/engawa-map-registry/blob/main/docs/production-operations.md).

Distribution Map policy: [distribution-map.md](distribution-map.md).

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

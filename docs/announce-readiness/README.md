# Engawa announce readiness (ENGAWA_ANNOUNCE_READINESS)

Operational record for the final stranger-experience and public-announcement readiness pass.

## Baseline

```text
PHASE = ENGAWA_ANNOUNCE_READINESS
START_MAIN = ece0fe4a740dff53c02c97dee9087ef8a3815dda
BRANCH = docs/announce-readiness
```

## Scope

- Complete MCP HTTP wiring documentation (Next.js App Router canonical example)
- Complete custom `ContentAdapter` example
- npm-only stranger path smoke (external temp fixture)
- Live production reference acceptance script
- Version truth and announce status polish
- **No** npm publish, version bumps, registry/staging/production runtime changes, or product features

## Maintainer acceptance commands

Run from the Engawa monorepo root **before public announcement** and **before package-set releases**:

```bash
node scripts/stranger-path-smoke.mjs
node scripts/live-reference-acceptance.mjs
```

`live-reference-acceptance` requires sibling consumer repos for rate-limit evidence (default paths):

- `../thierry-gilgen-ict.ch` — override with `THIERRY_CONSUMER_REPO`
- `../theoldhandofasia.ch` — override with `OLD_HAND_CONSUMER_REPO`

Or via package scripts:

```bash
pnpm smoke:stranger-path
pnpm smoke:live-references
```

These are **not** part of default CI (external npm registry dependency).

Also run full CI on the PR: `pnpm build`, `pnpm test`, `pnpm lint`, and the existing registry consumer smoke in GitHub Actions.

## Final report

Fill the structured report block in the PR description at closeout. Key fields:

```text
MCP_COPY_PASTE_HTTP =
STRANGER_SMOKE =
THIERRY_LIVE_ACCEPTANCE =
OLD_HAND_LIVE_ACCEPTANCE =
VERSION_DRIFT_BUGS_FOUND =
VERDICT =
```

See the phase specification in the PR for the full field list.

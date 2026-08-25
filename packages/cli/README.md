# Engawa CLI (`@thierry-gilgen-ict/engawa-cli`)

Deterministic Engawa CLI for inspecting public websites, planning integrations, and verifying deployed agent surfaces.

**Not published on npm yet** — source-only `0.1.0` in this monorepo.

## Commands

### `engawa inspect <url>`

Crawls a **bounded same-origin** slice of a public site and produces an **Engawa Agent Readiness Report** (`engawa.inspect.v1`):

- Public route discovery (HTML links, sitemap, robots.txt, llms.txt)
- Existing agent surfaces (llms.txt, Markdown alternates, MCP advertisements, agent onboarding hints)
- Framework and locale hints (evidence-based, not LLM guesses)
- Candidate public corpus inventory — **always `HUMAN_REVIEW_REQUIRED`**
- Deterministic Agent Readiness Score (0–100) for machine-readable surfaces

`--max-pages` controls the **primary page crawl budget** (HTML pages fetched from the discovered queue). A small bounded set of well-known discovery probes (`robots.txt`, `sitemap.xml`, `llms.txt`, limited Markdown samples) may run separately; all requests remain globally bounded.

### `engawa init`

Combines an inspection report with **read-only** local repository analysis to produce an integration planning bundle (`engawa.plan.v1`):

```bash
engawa init --url https://example.com --repo .
engawa init --inspect-report ./engawa-inspect.json --repo .
```

**Creates only** a planning bundle (default `.engawa/`):

- `manifest.json` (`engawa.init.bundle.v1`)
- `engawa-plan.json`
- `ENGAWA_INTEGRATION_PLAN.md`
- `AGENT_PROMPT.md`

**Does not modify** application source code, `package.json`, lockfiles, routes, middleware, or deployment config.

Repository scanning is bounded, read-only, and excludes secrets, symlinks, build caches, and `.git`. Source candidates are **evidence only** — `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE` must be confirmed per route before implementation.

Options: `--repo`, `--output-dir`, `--dry-run`, `--json`, `--force`, and (for `--url` mode) `--max-pages`, `--timeout-ms`, `--allow-local`.

### `engawa doctor <url>`

Verifies that a **deployed** Engawa public agent interface actually works (`engawa.doctor.v1`):

```bash
engawa doctor https://example.com
engawa doctor https://example.com --plan .engawa/engawa-plan.json
engawa doctor https://example.com --query services
engawa doctor https://example.com --strict
engawa doctor https://example.com --profile full
engawa doctor https://example.com --profile discovery
```

**Profiles**

- `full` (default) — requires llms.txt, Markdown, MCP handshake, `resources/list` + sampled `resources/read`, `tools/list` with **`search_site` only**, and live `search_site` probes
- `discovery` — llms.txt + Markdown; MCP is `NOT_REQUIRED` unless advertised (advertised MCP is still verified)

**Also supports**

- Optional `--plan` expectation comparison (origin must match)
- `--deny-term` synthetic sentinels (never echo raw values; do not use real secrets)
- Bounded security observations: invalid Host, untrusted Origin, opt-in `--rate-limit-probe`
- `--json` / `--output` (`.json` or `.md`; fails if the output file already exists)

**Doctor does not**

- Prove `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE` (always `NOT_PROVABLE_FROM_LIVE_INTERFACE`)
- Send cookies, Authorization headers, or API keys
- Call Distribution Map / registry
- Scan or modify the source repository
- Invoke any MCP tool other than `search_site`
- Actively stress rate limits unless `--rate-limit-probe` is set
- Follow MCP HTTP redirects (v0.1 rejects redirects; endpoint must be direct same-origin)

`--query` is sent to the target site’s public `search_site` tool. Use a known public term only.

Doctor MCP transport uses a guarded custom `fetch`: same-origin lock, private/reserved address policy, `redirect: "manual"`, no credentials.

## What inspect does NOT do

- Does not execute JavaScript on inspected pages
- Does not verify MCP protocol (use `engawa doctor`)
- Does not assess security (`SECURITY_ASSESSMENT = NOT_PERFORMED`)
- Does not auto-approve routes for Engawa publication
- Does not scrape HTML as the production Engawa corpus (`HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE` still applies)
- No telemetry, no Distribution Map calls, no LLM calls

## CLI flow

```text
inspect → integrate → verify
```

- **CLI-1:** `engawa inspect` — implemented
- **CLI-2:** `engawa init` — implemented in source
- **CLI-3:** `engawa doctor` — implemented in source

## Development (monorepo)

```bash
pnpm install
pnpm --filter @thierry-gilgen-ict/engawa-cli build
pnpm exec engawa inspect https://example.com --max-pages 10
pnpm exec engawa init --url https://example.com --repo . --dry-run
pnpm exec engawa doctor https://example.com
```

Local fixtures in tests use `--allow-local`.

## Future public usage (not yet available)

```bash
npx @thierry-gilgen-ict/engawa-cli inspect https://example.com
npx @thierry-gilgen-ict/engawa-cli init --url https://example.com --repo .
npx @thierry-gilgen-ict/engawa-cli doctor https://example.com
```

## Agent Readiness Score (v0.1 rubric)

| Category                              | Points |
| ------------------------------------- | ------ |
| PUBLIC_SITE_REACHABLE                 | 10     |
| CANONICAL_METADATA_PRESENT            | 10     |
| SITEMAP_OR_STRUCTURED_ROUTE_DISCOVERY | 10     |
| LLMS_TXT                              | 20     |
| MARKDOWN_ALTERNATES_OR_RESOURCES      | 20     |
| MCP_ADVERTISED                        | 20     |
| AGENT_ONBOARDING_PAGE                 | 10     |

Score reflects **machine-readable surfaces**, not website quality or security.

## Privacy

Inspection, planning, and doctor data go only to the target URL you specify (plus optional local plan/report files). No Engawa phone-home.

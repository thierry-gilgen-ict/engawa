# Engawa CLI (`@thierry-gilgen-ict/engawa-cli`)

Deterministic **Engawa Inspector** for existing public websites.

**Not published on npm yet** — source-only `0.1.0` in this monorepo.

## What it does

`engawa inspect <url>` crawls a **bounded same-origin** slice of a public site and produces an **Engawa Agent Readiness Report**:

- Public route discovery (HTML links, sitemap, robots.txt, llms.txt)
- Existing agent surfaces (llms.txt, Markdown alternates, MCP advertisements, agent onboarding hints)
- Framework and locale hints (evidence-based, not LLM guesses)
- Candidate public corpus inventory — **always `HUMAN_REVIEW_REQUIRED`**
- Deterministic Agent Readiness Score (0–100) for machine-readable surfaces

`--max-pages` controls the **primary page crawl budget** (HTML pages fetched from the discovered queue). A small bounded set of well-known discovery probes (`robots.txt`, `sitemap.xml`, `llms.txt`, limited Markdown samples) may run separately; all requests remain globally bounded.

## What it does NOT do

- Does not execute JavaScript on inspected pages
- Does not verify MCP protocol (use future `engawa doctor`)
- Does not assess security (`SECURITY_ASSESSMENT = NOT_PERFORMED`)
- Does not auto-approve routes for Engawa publication
- Does not scrape HTML as the production Engawa corpus (`HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE` still applies)
- No telemetry, no Distribution Map calls, no LLM calls

## Planned flow

```text
inspect → integrate → verify
```

- **CLI-1 (this package):** `engawa inspect`
- **CLI-2 (planned):** `engawa init`
- **CLI-3 (planned):** `engawa doctor`

## Development (monorepo)

```bash
pnpm install
pnpm --filter @thierry-gilgen-ict/engawa-cli build
pnpm exec engawa inspect https://example.com --max-pages 10
pnpm exec engawa inspect https://example.com --json
pnpm exec engawa inspect https://example.com --output report.md
```

Local fixtures in tests use `--allow-local`.

## Future public usage (not yet available)

```bash
npx @thierry-gilgen-ict/engawa-cli inspect https://example.com
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

Inspection data goes only to the target URL you specify. No Engawa phone-home.

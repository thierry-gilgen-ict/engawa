# Static build-time site (example)

Framework-free static HTML proving Engawa **artifact-driven** integration per [ADR-0008](../../docs/adr/0008-artifact-driven-content-sources.md).

## What this proves

```text
canonical HTML artifacts (allowlisted)
        ↓
deterministic build-time extraction
        ↓
generated manifest + Markdown + llms.txt
        ↓
real engawa-core + engawa-discovery
```

No CMS. No hand-written `.md` source files. No runtime crawler.

## Where human content lives

| Path                        | Role                                    |
| --------------------------- | --------------------------------------- |
| `html/public/*.html`        | Canonical authored public HTML          |
| `html/public/unlisted.html` | Exists but **not** on allowlist (proof) |
| `html/private/admin.html`   | Private — **never** allowlisted         |

Public prose exists only in HTML. Generated Markdown is disposable build output.

## What gets generated

| Output                              | Description                                 |
| ----------------------------------- | ------------------------------------------- |
| `generated/engawa/resources.json`   | Corpus manifest with traceability hashes    |
| `dist/index.md`, `dist/about.md`, … | Markdown alternates                         |
| `dist/llms.txt`                     | From `generateLlmsTxt()` — not hand-written |

Outputs are gitignored; tests and `pnpm run extract` recreate them.

**Tooling vs public output:** TypeScript compiles to `.build/` (extractor implementation). `dist/` and `generated/` hold only generated Engawa public artifacts — never compiled JS.

## Commands

From repository root (Node **24+** required for tooling):

```bash
pnpm install
pnpm --filter static-build-time-site build
pnpm --filter static-build-time-site extract
```

Or from this directory after monorepo build:

```bash
pnpm run build
pnpm run extract
```

Deployed static HTML and Markdown files do **not** require Node at runtime.

## Route manifest

[`engawa.manifest.json`](engawa.manifest.json) is the explicit public allowlist. The build does **not** crawl `html/public/` for routes.

Each entry defines `id`, `source`, `canonicalPath`, `markdownPath`, and `contentSelector` (usually `main`).

Re-running extraction removes stale Markdown files that are no longer on the allowlist. Relative links resolve against each resource's human `canonicalPath` URL (e.g. `next.html` on `/guides/start.html` → `/guides/next.html`).

## Private routes stay excluded

`html/private/admin.html` contains `ENGAWA_PRIVATE_SENTINEL_DO_NOT_PUBLISH`. It is not listed in the manifest, so it never enters generated Engawa output.

## How Engawa consumes the result

Extraction loads generated resources into `StaticContentAdapter`, validates via `createEngawa()`, and generates `llms.txt` with `generateLlmsTxt()` from the same corpus.

See [`src/extract.ts`](src/extract.ts) and [`src/build.ts`](src/build.ts).

## Pipeline diagram

```text
┌─────────────────────┐
│ html/public/*.html  │  canonical human-public source
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ engawa.manifest.json│  explicit allowlist (no directory crawl)
└──────────┬──────────┘
           │  pnpm run build → .build/
           │  pnpm run extract
┌──────────▼──────────────────────────┐
│ generated/engawa/resources.json     │
│ dist/*.md  dist/llms.txt            │  public generated artifacts
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│ StaticContentAdapter + createEngawa │
│ generateLlmsTxt (engawa-discovery)  │
└─────────────────────────────────────┘
```

## Further reading

- [docs/static-build-time-integration.md](../../docs/static-build-time-integration.md)
- [minimal-site](../minimal-site/README.md) — loader-driven / in-memory adapter example

# Static build-time Engawa integration

This document describes the **artifact-driven** integration path authorized by [ADR-0008](adr/0008-artifact-driven-content-sources.md): deterministic build-time extraction from canonical human-public HTML artifacts.

## What problem this solves

Many sites have **no CMS, no database, and no application content loader**. Their canonical public content lives in hand-authored or statically generated HTML files. Engawa still requires `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE` ([content publication rule](content-publication.md)).

This pattern proves that parity holds when:

1. HTML artifacts are the canonical human-public source
2. A **bounded build-time extractor** reads only **allowlisted** HTML files
3. Generated Markdown, resource manifest, and `llms.txt` are disposable build outputs
4. Real `@thierry-gilgen-ict/engawa-core` and `@thierry-gilgen-ict/engawa-discovery` consume the same generated corpus

## What this does not solve

- **Not** a runtime production HTML crawler or live-site spider
- **Not** automatic recursive URL discovery or directory crawling
- **Not** a new published npm package (example code lives in the monorepo)
- **Not** a production deployment or MCP hosting topology
- **Not** `engawa inspect` as a production corpus source
- **Not** a full HTML-to-Markdown library for arbitrary web pages

Build-time extraction is **not** runtime crawling.

## Loader-driven vs artifact-driven

| Pattern         | Canonical source                      | Engawa input                               |
| --------------- | ------------------------------------- | ------------------------------------------ |
| Loader-driven   | CMS query, app service, shared module | Same loader as human HTML routes           |
| Artifact-driven | Human-public HTML artifact            | Deterministic build-time extraction output |

See [integrating an existing site](integrating-an-existing-site.md) for both paths.

## Monorepo example

Reference implementation: [`examples/static-build-time-site`](../../examples/static-build-time-site).

```text
html/public/*.html          ← canonical authored HTML (no hand-written .md sources)
engawa.manifest.json        ← explicit public route allowlist
        ↓
pnpm run extract            ← build-time extraction (Node 24+)
        ↓
generated/engawa/resources.json
dist/*.md
dist/llms.txt
        ↓
StaticContentAdapter + createEngawa() + generateLlmsTxt()
```

**Node 24+** is required for the Engawa build tooling in this example. The deployed human HTML and generated Markdown static files themselves do **not** require a Node runtime.

## Route allowlisting

The build **does not** crawl directories or infer public routes from filesystem layout.

`engawa.manifest.json` lists each public resource explicitly:

- `source` — relative path under `sourceRoot`
- `canonicalPath` — human HTML route
- `markdownPath` — generated Markdown alternate path
- `contentSelector` — extraction boundary (e.g. `main`)

Files not on the allowlist (including `admin.html` with private content) never enter the Engawa corpus.

## Content selector boundary

Extraction reads only the configured selector (`main`, `article`, or a CSS selector). Presentation chrome outside that boundary (navigation, headers, footers) is ignored.

If the selector matches nothing, the **build fails** — no empty resource is emitted.

Inside the boundary, `script`, `style`, `noscript`, and `template` nodes are stripped before conversion.

## Determinism

Same HTML inputs and manifest → byte-identical generated manifest, Markdown files, and `llms.txt`. No timestamps, random IDs, or environment-dependent paths in outputs.

## Private exclusion

Private/admin HTML must remain **off the allowlist**. The example uses `html/private/admin.html` with a sentinel string that must never appear in generated output.

## Source hashes

Each extracted resource records `sourceSha256` (SHA-256 of source HTML bytes) in example-local manifest metadata for traceability. This is not a new Engawa core schema requirement.

## Generated artifacts

| Artifact                          | Purpose                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `generated/engawa/resources.json` | Machine-readable corpus for adapters and tests              |
| `dist/*.md`                       | Public Markdown alternates                                  |
| `dist/llms.txt`                   | Published index / handoff artifact from `generateLlmsTxt()` |

## Adapting to Hugo, Eleventy, Astro, or plain static HTML

These are **adaptation patterns**, not tested framework integrations in this phase:

1. Keep human-public HTML as the canonical artifact (or static generator output)
2. Run Engawa extraction **after** HTML is produced in your build pipeline
3. Maintain an explicit allowlist of public routes — do not crawl the output tree
4. Deploy human HTML + generated `*.md` + `llms.txt` together

## Related

- [ADR-0008](adr/0008-artifact-driven-content-sources.md)
- [Content publication rule](content-publication.md)
- [Architecture](architecture.md)
- [Roadmap](roadmap.md) — production reference for static sites still pending

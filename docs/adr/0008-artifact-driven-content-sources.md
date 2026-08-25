# ADR 0008: Artifact-driven content sources

## Status

Accepted

## Context

Engawa's content publication rule requires:

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
```

Most Engawa documentation and reference integrations assume **loader-driven** sites: a canonical content loader (CMS query, application service, or shared module) feeds both human HTML routes and Engawa representations.

Many real sites are **artifact-driven**: hand-authored HTML, Hugo, Eleventy, Astro static output, exported Webflow/static output, or legacy static trees where the human-public artifact **is** the HTML file committed or generated at build time. There is no separate runtime loader—only the published HTML artifact.

External adopter feedback identified that artifact-driven sites currently "fall through" the documented contract unless operators manually duplicate content into Markdown or maintain parallel loaders.

Engawa must clarify that parity can still hold when HTML is the canonical human-public artifact and Engawa content is derived **deterministically at build time** from that artifact—not by crawling arbitrary production HTML at request time.

**Important:** Engawa packages do **not** ship HTML extraction tooling in v0.1. This ADR authorizes the architectural path only.

## Decision

Engawa preserves `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE`.

A canonical human-public HTML artifact **may** serve as Engawa's source for artifact-driven/static sites when Engawa content is derived through **deterministic build-time extraction** linked to the same build or source identity as the human-public HTML.

Arbitrary **runtime crawling or scraping of production HTML** is **not** accepted as the normal Engawa corpus architecture.

## Allowed patterns

### Loader-driven (existing)

```text
canonical content loader
    ├── human HTML route
    └── Engawa representation (Markdown, MCP resources, llms.txt inputs)
```

The human route and Engawa adapter call the **same loader** (function, CMS query, service).

### Artifact-driven (new, build-time only)

```text
canonical human-public HTML artifact (build output or source tree)
    └── deterministic build-time extraction (allowlisted public routes)
            └── Engawa representation (adapter inputs, Markdown files, resource manifest)
```

Requirements for artifact-driven extraction:

- The HTML artifact **is** the canonical human-public source for those routes
- Extraction runs at **build time** (or in a bounded CI step), not on each visitor request
- A **route allowlist** or explicit public classification exists before publication
- Private, admin, draft, and authenticated routes are excluded **before** extraction
- Output is **deterministic** (same inputs → same Engawa corpus)
- Build or source identity is **traceable** (same commit, build ID, or artifact version)
- No hidden CMS, database, or environment content is injected into the Engawa corpus

## Disallowed patterns

- **Production runtime crawler** that discovers whatever HTML is reachable on the live site and treats that as the Engawa corpus
- **Hand-maintained Markdown** that can silently drift from human HTML without a parity check
- Extracting **authenticated or admin** HTML as public Engawa resources
- Extracting a **broader route set** than the human-public site exposes to anonymous visitors
- Using `engawa inspect` or similar **readiness probes** as the production corpus source

A future separately reviewed architecture could change runtime crawling policy; v0.1 does not implement or endorse it.

## Security implications

- Build-time extraction must respect the same **human-public boundary** as loader-driven adapters. Extraction code is site-operator responsibility and must not broaden scope at runtime.
- Artifact-driven sites still require host validation, rate limits, and read-only MCP defaults on the deployed surface.
- Extraction pipelines must not read secrets, `.env`, admin paths, or local-only source trees into published artifacts.

## Drift implications

- Loader-driven sites drift when human routes and adapters call different functions—already documented in [content-publication.md](../content-publication.md).
- Artifact-driven sites drift when human HTML changes but build-time extraction is not re-run, or when Markdown is edited separately from the HTML artifact.
- Mitigation: same-build linking, deterministic extraction, reviewable diffs, and acceptance checks that compare representative HTML and Engawa outputs.

## Consequences

- Documentation and integration guides must describe **both** loader-driven and artifact-driven paths without weakening `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE`.
- Reference sites remain loader-driven today; a future static SME reference may prove the artifact-driven pattern.
- No new Engawa package is required for this decision; implementation may live in site build scripts or a future bounded toolkit after pattern proof.

## Future implementation work (not started)

- Documented build-time extraction pattern for static/Hugo/Eleventy/Astro sites
- Route allowlist and public-classification helpers
- Acceptance tests comparing extracted corpus to human-public HTML samples
- Optional monorepo tooling only after a reference integration proves the pattern—no pre-named packages required

# Content publication rule

Engawa integration principle:

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
```

**Public** in Engawa means what an anonymous human visitor can see on the live website—not what exists in a database, CMS, Git repo, or operator workflow.

## What SOURCE means

**SOURCE** is the canonical human-public content identity for a route or resource—not merely "a loader function name."

For a given public page, Engawa resources and Markdown alternates must derive from the **same** human-public content that the anonymous human route shows. That source may be:

- a **runtime loader** (CMS query, application service, shared module), or
- a **canonical human-public HTML artifact** (static file or build output) when using build-time extraction ([ADR-0008](adr/0008-artifact-driven-content-sources.md))

## Two valid architectures

### Loader-driven sites

Human route and Engawa adapter call the **same canonical loader**:

```text
canonical content loader
    ├── human HTML route
    └── Engawa representation
```

Example:

```text
Human GET /about     → getPageContent("en").about
Engawa resource      → getPageContent("en").about  → markdown
GET /about.md        → same markdown builder
```

Homepage exception (mixed architectures): if humans use `getPublishedHome()` and Engawa home markdown uses `getPublishedHome()`, that is still parity—both sides use the same function.

### Artifact-driven sites

The human-public **HTML artifact** is canonical; Engawa content is derived at **build time**:

```text
canonical human-public HTML artifact
    └── deterministic build-time extraction (allowlisted routes)
            └── Engawa representation
```

Artifact-driven extraction is allowed only when **all** of the following hold:

- The HTML (or static output) **is** the canonical human-public artifact for those routes
- Extraction runs at **build time** (or bounded CI), not on each production request
- A **route allowlist** or explicit public classification exists
- Private, admin, draft, and authenticated routes are excluded **before** publication
- Output is **deterministic** and reviewable
- Build or source identity can be traced (same commit, build ID, or artifact version)
- No hidden CMS, database, or environment content is injected into the Engawa corpus

Engawa packages do **not** ship HTML extraction in v0.1. Sites implement build-time extraction in their own pipeline until a future documented pattern exists.

## What does not automatically become public

| Situation                                                          | Public for Engawa?                               |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| CMS row marked "published" but human route still shows static copy | **No** — unless human route uses that CMS output |
| File exists in Git (`content/`, `source-material/`)                | **No** — unless the human route reads it         |
| CMS preview / draft / review workflow                              | **No**                                           |
| Source archive, knowledge base, working notes                      | **No**                                           |
| Contact form submissions                                           | **No**                                           |
| Admin-only media or internal antiques workflows                    | **No**                                           |
| Environment variables, session data, API keys                      | **No**                                           |

## Good patterns

- Loader-driven: human route and Engawa share one loader (see above).
- Artifact-driven: extraction from allowlisted public HTML in the same build that ships the human site.
- Markdown `*.md` routes use the same builder as MCP resources—they are published representations, not a second secret channel.

## Bad patterns

```text
Human GET /ankauf    → getPageContent("de").ankauf   (static dictionary)
Engawa /ankauf       → getPublishedPage("ankauf")    (CMS overlay)
```

Agents could see CMS text before humans do. Phase 2A on [theoldhandofasia.ch](https://theoldhandofasia.ch) corrected this class of bug.

Additional bad patterns:

- **Production runtime crawler** discovers whatever HTML it can reach and treats that as the Engawa corpus
- **Hand-maintained Markdown** that can silently drift from human HTML without parity checks
- Extracting **authenticated or admin** HTML into public Engawa resources
- Extracting a **broader directory or route set** than the human-public site exposes

## Adapter responsibility

Your `ContentAdapter` is the gate. Engawa core does not know your CMS, database, filesystem layout, or static tree layout.

- Implement `listResources`, `getResource`, and `search` over **only** human-public content.
- Test with sentinels: CMS-only strings must not appear in Engawa if humans don't see them.
- Search must not return admin paths, drafts, or private IDs.

For artifact-driven sites, the adapter (or build step feeding it) must reflect **only** what build-time extraction produced from allowlisted human-public HTML—not live crawling.

## Markdown routes

`*.md` routes should use the same builder as MCP resources. They are **clean document representations** and discovery aids—not a second publication channel with different rules. HTML remains first-class; Markdown is additive.

Publishing Markdown does **not** mean all AI crawlers automatically fetch alternates. See [Do you need Engawa?](do-you-need-engawa.md) (discovery note).

Same-URL `Accept` negotiation was evaluated separately ([content negotiation experiment](content-negotiation-experiment.md)). A hybrid BOTH model would still require negotiated Markdown to use the **same builder** as dedicated `*.md` routes.

## Related docs

- [ADR-0008: Artifact-driven content sources](adr/0008-artifact-driven-content-sources.md)
- [Do you need Engawa?](do-you-need-engawa.md)
- [Security model](security-model.md) — launch checklist
- [Getting started](getting-started.md) — adapter step
- [Production references](production-references.md) — how reference sites apply this rule

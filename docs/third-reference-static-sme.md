# Third production reference — static SME qualification

**Phase:** `ENGAWA_THIRD_REFERENCE_STATIC_SME_QUALIFICATION`

This document qualifies whether Engawa has a suitable **third production reference**: a real static / artifact-driven SME website that is materially different from the two existing Next.js references.

This phase is **qualification + future integration plan only**.

```text
PRODUCTION_INTEGRATION_STARTED = NO
DEPLOYMENT = NONE
NPM_PUBLICATION = NONE
NEW_ENGAWA_PACKAGE = NO
```

## Why this phase exists

Engawa currently has two production references ([production-references.md](production-references.md)). Both are Next.js based.

```text
FRAMEWORK_PORTABILITY_PROVEN = NO
```

The third reference should prove:

```text
STATIC_OR_ARTIFACT_DRIVEN_SITE = YES
SME_SITE = YES
NON_NEXTJS_PORTABILITY_EVIDENCE = TARGET
```

Monorepo pattern proof already exists ([static-build-time-integration.md](static-build-time-integration.md), [`examples/static-build-time-site/`](../examples/static-build-time-site/), [ADR-0008](adr/0008-artifact-driven-content-sources.md)). That proves the **build-time extraction path**, not a production SME reference.

## Acceptance criteria

### Required

| Characteristic                     | Requirement                                                         |
| ---------------------------------- | ------------------------------------------------------------------- |
| `SME_OR_SMALL_ORGANIZATION`        | YES                                                                 |
| `PUBLIC_PRODUCTION_SITE`           | YES                                                                 |
| `STATIC_OR_ARTIFACT_DRIVEN`        | YES                                                                 |
| `NEXTJS_REQUIRED`                  | NO                                                                  |
| `PUBLIC_CONTENT_CORPUS`            | CLEAR                                                               |
| `HUMAN_PUBLIC_SOURCE_IDENTIFIABLE` | YES                                                                 |
| `PRIVATE_ADMIN_CONTENT_EXCLUDABLE` | YES                                                                 |
| `CONTROL_OR_PERMISSION`            | Operator can intentionally adopt Engawa; implementation inspectable |

### Preferred signals

- Static HTML output or simple SSG (Hugo, Eleventy, Astro static, hand-authored HTML)
- Build-time generated pages
- No runtime CMS dependency for public delivery
- Hosting stack materially different from References 1 and 2
- Normal SME content (services / about / contact / articles / products)
- At least a few public pages with stable canonical URLs
- Ability to add `/llms.txt` and explicit `*.md` representations
- Ability to expose read-only MCP without contaminating static-source truth (or an explicit MCP trade-off)
- Simple enough to serve as a copyable reference

## Non-negotiable principles

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
CANONICAL_HUMAN_PUBLIC_ARTIFACT = SOURCE
RUNTIME_CRAWLING = NO
BUILD_TIME_EXTRACTION = YES
ROUTE_ALLOWLIST = YES
PRIVATE_ROUTE_EXCLUSION = BEFORE_PUBLICATION
```

For a static / artifact-driven site, Engawa representations must derive from the **same build artifact** or the **exact content inputs** that produce that artifact.

Do **not**:

- Crawl production HTML on each runtime request
- Expose source directories wholesale
- Expose unpublished markdown/source merely because files exist
- Expose admin / draft / internal content
- Add a runtime CMS solely for Engawa
- Require content negotiation or automatic translation
- Create a new Engawa package (`engawa-static`, `engawa-html`, `engawa-site`, `engawa-reference`, `engawa-sme`)

## Evidence inspected

| Source                                                                                                                                                                                                           | Finding                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [roadmap.md](roadmap.md) item #6                                                                                                                                                                                 | Candidate third production reference — static SME site (open)                                |
| [production-references.md](production-references.md)                                                                                                                                                             | Refs 1–2 live; both Next.js; `FRAMEWORK_PORTABILITY_PROVEN = NO`                             |
| [static-build-time-integration.md](static-build-time-integration.md) + example                                                                                                                                   | Pattern proof in monorepo; not a production site                                             |
| [ADR-0008](adr/0008-artifact-driven-content-sources.md)                                                                                                                                                          | Artifact-driven path authorized; future static SME reference called out                      |
| [content-publication.md](content-publication.md), [integrating-an-existing-site.md](integrating-an-existing-site.md), [integration-acceptance.md](integration-acceptance.md), [multi-locale.md](multi-locale.md) | Parity, allowlist, and security contracts for any future integration                         |
| GitHub issues / PRs in `engawa`                                                                                                                                                                                  | No open issue naming a confirmed static SME production candidate                             |
| Org repos under `thierry-gilgen-ict` (names/descriptions)                                                                                                                                                        | No repo metadata identifying a controlled static SME production site eligible as Reference 3 |

## Qualification matrix

Scores: `PASS` | `PARTIAL` | `FAIL` | `UNKNOWN`

Do not fabricate architecture facts. Private repos without verified static/artifact-driven evidence stay `UNKNOWN` or `FAIL` for Reference-3 goals.

### A. Monorepo `examples/static-build-time-site`

| Criterion                                              | Score    | Notes                                    |
| ------------------------------------------------------ | -------- | ---------------------------------------- |
| Real production SME                                    | FAIL     | Example only                             |
| Static / artifact-driven                               | PASS     | Allowlisted HTML → build-time extraction |
| Public content clarity                                 | PASS     | Manifest + public HTML                   |
| Privacy / security boundary                            | PASS     | Private/unlisted exclusion demonstrated  |
| Suitability for llms.txt / Markdown / MCP corpus shape | PASS     | Generated artifacts + adapter            |
| Non-Next.js portability value                          | PARTIAL  | Proves pattern, not production stack     |
| Operator control                                       | PASS     | In Engawa monorepo                       |
| Educational / reference value                          | PASS     | Copyable pattern                         |
| **Production Reference 3 eligibility**                 | **FAIL** | Not a public production site             |

### B. Reference 1 — thierry-gilgen-ict.ch

| Criterion                              | Score    | Notes                                    |
| -------------------------------------- | -------- | ---------------------------------------- |
| Real production SME                    | PASS     | Live production                          |
| Static / artifact-driven               | FAIL     | Loader-driven Next.js                    |
| Non-Next.js portability                | FAIL     | Next.js                                  |
| **Production Reference 3 eligibility** | **FAIL** | Wrong architecture for this roadmap item |

### C. Reference 2 — theoldhandofasia.ch

| Criterion                              | Score    | Notes                                                                     |
| -------------------------------------- | -------- | ------------------------------------------------------------------------- |
| Real production SME                    | PASS     | Live production                                                           |
| Static / artifact-driven               | FAIL     | Next.js; mixed CMS/static **loaders**, not artifact-driven static hosting |
| Non-Next.js portability                | FAIL     | Next.js                                                                   |
| **Production Reference 3 eligibility** | **FAIL** | Wrong architecture for this roadmap item                                  |

### D. Other org-adjacent websites (metadata only)

Evaluated from public org repo names/descriptions only (no private source inspection in this phase):

| Candidate (metadata)                             | Production SME          | Static / artifact-driven | Control                     | Reference 3                             |
| ------------------------------------------------ | ----------------------- | ------------------------ | --------------------------- | --------------------------------------- |
| `beastly-investments`                            | UNKNOWN                 | UNKNOWN                  | Operator-adjacent (private) | UNKNOWN — not confirmed static SME      |
| `BrickPlanPro`                                   | FAIL (platform/product) | UNKNOWN                  | Private                     | FAIL for SME static reference goal      |
| `deliciously-unreasonable`                       | UNKNOWN                 | UNKNOWN                  | Private                     | UNKNOWN — media platform, not confirmed |
| `actarium`, `tatami-rooms`, infrastructure repos | FAIL                    | N/A                      | Private                     | FAIL — not public SME marketing sites   |

```text
REFERENCE_3_CANDIDATE = NONE_CONFIRMED
CANDIDATES_EVALUATED = monorepo-static-example, reference-1-nextjs, reference-2-nextjs, org-metadata-scan
```

## Preferred future integration architecture

When a real candidate is selected in a later phase:

```text
source / public content
        ↓
static site build
        ↓
canonical human HTML artifacts
        ↓
allowlisted deterministic extraction
        ↓
Engawa resources
        ├── llms.txt
        ├── explicit Markdown
        └── read-only MCP corpus (if MCP path chosen)
```

```text
RUNTIME_CRAWLING = NO
BUILD_TIME_EXTRACTION = YES
ROUTE_ALLOWLIST = YES
PRIVATE_ROUTE_EXCLUSION = BEFORE_PUBLICATION
```

Runtime MCP may serve a **prebuilt** corpus/artifact. It must **not** live-crawl the production website.

## MCP on a static site

A plain static host cannot itself run MCP unless there is some server / edge / service component.

```text
STATIC_PUBLIC_SITE = YES
MCP_RUNTIME_COMPONENT = OPTIONAL_SEPARATE_SERVICE
```

| Option | Pattern                                         | Notes                                          |
| ------ | ----------------------------------------------- | ---------------------------------------------- |
| **A**  | Static site + tiny serverless/edge MCP endpoint | Full surfaces; adds minimal runtime            |
| **B**  | Static site + existing small backend            | Reuse host if already present                  |
| **C**  | Static site with no MCP initially               | Still proves llms.txt + Markdown + BYA handoff |

Do **not** force runtime infrastructure merely to satisfy Reference 3.

**Full production reference trade-off (explicit):**

Existing References 1 and 2 expose llms.txt, Markdown, MCP `search_site`, and Bring Your Agent. A static SME reference that ships only llms.txt + Markdown (+ optional BYA guidance) has **high educational value** for artifact-driven portability but is a **PARTIAL** match for “full” production reference parity unless MCP (option A or B) is also present.

This qualification does **not** silently weaken the full-reference bar. The next integration phase must state which bar it targets.

## Proposed surfaces (PROPOSED only — no implementation)

When a candidate exists:

```text
PROPOSED: /llms.txt
PROPOSED: explicit *.md paths
PROPOSED: /mcp   (only if MCP path chosen)
PROPOSED: /agents or equivalent BYA guidance if appropriate
```

No production site is modified in this phase.

## Decision

```text
THIRD_REFERENCE_QUALIFICATION = COMPLETE

REFERENCE_3_CANDIDATE = NONE_CONFIRMED
REFERENCE_3_REPOSITORY = NONE
REFERENCE_3_ARCHITECTURE = NONE
REFERENCE_3_HOSTING = NONE

STATIC_OR_ARTIFACT_DRIVEN = UNKNOWN (no confirmed production candidate)
SME_SITE = UNKNOWN (no confirmed production candidate)
CONTROL_OR_PERMISSION = N/A
NON_NEXTJS_PORTABILITY_VALUE = TARGET_UNMET
HUMAN_PUBLIC_SOURCE_IDENTIFIABLE = N/A
BUILD_TIME_ENGAWA_PATH = PROVEN_IN_MONOREPO_EXAMPLE
MCP_PATH_FEASIBLE = CONDITIONAL (requires separate service/edge; trade-off documented)

DECISION = NEEDS_CANDIDATE

RATIONALE =
  Pattern proof exists in-repo. Production References 1–2 are Next.js and do not satisfy
  the static SME / non-Next.js goal. Org repository metadata does not identify a controlled
  static SME production site that can be verified as artifact-driven without fabricating facts.
  Selecting an uncontrolled third-party site is disallowed.

NEXT_ACTION =
  Identify or stand up a controlled static / artifact-driven SME production site (or confirm
  an existing owned site’s architecture with explicit operator permission), then start a
  separate phase ENGAWA_THIRD_REFERENCE_STATIC_SME_INTEGRATION.
  Do not start that integration from this qualification PR.
```

## Related

- [Production references](production-references.md)
- [Static build-time integration](static-build-time-integration.md)
- [ADR-0008: Artifact-driven content sources](adr/0008-artifact-driven-content-sources.md)
- [Content publication rule](content-publication.md)
- [Integration acceptance](integration-acceptance.md)
- [Roadmap](roadmap.md)

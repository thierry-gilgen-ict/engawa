# Content negotiation experiment

**Roadmap question (#4):** Does `Accept: text/markdown` on canonical human URLs justify same-URL content negotiation?

This document records a **bounded experiment** — not a production Engawa feature. Engawa v0.1 uses **additive dedicated Markdown URLs** (`/about.md`) alongside human HTML (`/about`). Same-URL negotiation is **not assumed better**.

Local proof: [`examples/content-negotiation/`](../examples/content-negotiation/).

## Central question

Should Engawa recommend or eventually support:

```http
GET /about
Accept: text/markdown
```

returning:

```http
200 OK
Content-Type: text/markdown; charset=utf-8
Vary: Accept
```

while the same URL normally returns HTML for `Accept: text/html`?

**Answer requires evidence.** Dedicated `.md` routes remain the proven Engawa pattern today.

## Standards baseline (sources reviewed)

| Source                                                                         | Relevance                                                                                                                                |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)            | Proactive content negotiation (§12.3), `Accept` (§12.5.1), quality values, specificity, `406 Not Acceptable` (§15.5.6), `Vary` (§12.5.5) |
| [RFC 7763 — `text/markdown`](https://www.rfc-editor.org/rfc/rfc7763)           | Registered Markdown media type; charset parameter                                                                                        |
| [IANA media types](https://www.iana.org/assignments/media-types/text/markdown) | `text/markdown` registration                                                                                                             |

### Key standards realities

Content negotiation is **not** equivalent to `accept.includes("text/markdown")`. Correct handling considers media ranges, specificity, `q` values, `q=0`, wildcards, missing `Accept`, and multiple acceptable representations.

RFC 9110 does **not** require `406` in every unsupported case. An origin may honor preferences with `406` or, in some cases, disregard the field. This experiment documents an **experimental policy** (see below) — not a universal Engawa rule.

If representation selection depends on `Accept`, cache correctness normally requires:

```http
Vary: Accept
```

See local proof: `node examples/content-negotiation/cache-demo.mjs` → `CACHE_VARIANT_KEY_REQUIRED = YES`.

## Two models

### Model A — Dedicated representation URL

```text
/about      → human HTML (canonical human route)
/about.md   → Markdown representation
```

Current Engawa production pattern ([content-publication.md](content-publication.md), [production-references.md](production-references.md)).

### Model B — Same canonical URL, negotiated representation

```text
/about + Accept: text/html      → HTML
/about + Accept: text/markdown  → Markdown
```

Requires runtime or edge/proxy logic on the human URL.

### Hybrid BOTH (evaluated)

```text
/about.md                       → explicit Markdown (Model A)
/about + Accept: text/markdown  → same Markdown bytes (Model B)
/about                            → HTML default
```

Both Markdown paths must use the **same builder** (`HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE`). Dedicated `.md` is **not** deprecated by this experiment.

## Comparison

| Dimension                 | Dedicated `.md`                                                                                     | Same-URL negotiation                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| HTTP correctness          | Straightforward: URL identifies representation; no `Vary: Accept` required for representation split | Requires correct proactive negotiation, consistent `Vary: Accept`, q-value logic |
| Implementation complexity | Low — path suffix or separate route file                                                            | Medium — Accept parser, negotiation branch on human route, header discipline     |
| Cache/CDN complexity      | Low — distinct cache keys per URL                                                                   | Higher — `Vary: Accept` required; cache fragmentation on human URL               |
| Static-host compatibility | Excellent — `about.html` + `about.md` artifacts                                                     | Poor without edge/proxy/runtime — not build-time portable alone                  |
| Agent ergonomics          | Explicit URL in `llms.txt`, links, MCP URIs; no custom headers                                      | Fewer URLs; requires `Accept: text/markdown` support                             |
| Explicit discoverability  | High — `.md` in sitemaps, `rel="alternate"`, llms.txt                                               | Lower — negotiation invisible unless documented                                  |
| URI stability             | Stable dedicated machine URL                                                                        | Same human URL; representation varies by header                                  |
| Human-browser safety      | Browsers hit HTML URL; `.md` optional                                                               | Default-without-Accept must stay HTML; cache bugs risk wrong representation      |
| SEO/search-crawler risk   | Low — distinct URLs, clear types                                                                    | Medium — same URL different bodies; cache/`Vary` mishandling; debugging harder   |
| Observability             | Surface = `MARKDOWN` vs `CANONICAL_HTML` by path                                                    | Requires logging `Accept` on human URL ([observability.md](observability.md))    |
| Framework portability     | Documented across Next.js route files, static adapters                                              | Next.js middleware/route complexity; locale middleware interactions              |
| Production debugging      | Easy — `curl /about.md`                                                                             | Harder — must reproduce client `Accept`                                          |
| Content parity risk       | Low if same builder                                                                                 | Medium — two code paths on one URL if implemented carelessly                     |
| CDN/proxy requirements    | Minimal                                                                                             | Often requires `Vary` awareness or edge negotiation                              |

**Neither column wins every row.** The experiment does not rig the table.

## Experimental selection policy

Implemented in [`examples/content-negotiation/accept-parser.mjs`](../examples/content-negotiation/accept-parser.mjs):

```text
EXPERIMENT_ONLY = YES
PRODUCTION_READY_ACCEPT_PARSER = NO
```

Effective quality for each available representation follows RFC 9110 Accept precedence: among matching media ranges, the **most specific** range wins (`type/subtype` > `type/*` > `*/*`), and that range's `q` is used. Do **not** multiply `q` by a specificity weight.

| Input                                    | Result                                                       |
| ---------------------------------------- | ------------------------------------------------------------ |
| No `Accept`                              | HTML                                                         |
| `Accept: text/markdown, text/html;q=0.8` | Markdown                                                     |
| `Accept: text/html, text/markdown;q=0.8` | HTML                                                         |
| Equal preference (`q=1` for both)        | HTML                                                         |
| `Accept: */*`                            | HTML — wildcard ≠ specific Markdown request                  |
| `Accept: text/*;q=1, text/html;q=0`      | Markdown — exact `text/html;q=0` overrides `text/*` for HTML |
| `Accept: text/markdown;q=0`              | `406 Not Acceptable` (no acceptable representation)          |
| `Accept: text/markdown;q=0, text/html`   | HTML                                                         |
| `Accept: text/markdown` only             | Markdown                                                     |
| Both representations effective `q=0`     | `406 Not Acceptable` (experimental policy)                   |

**406 policy (experimental):** when an `Accept` header is present and both HTML and Markdown have effective quality `0`, this experiment returns `406 Not Acceptable`. RFC 9110 permits an origin to send `406` or, in some cases, disregard `Accept` — this is **not** a universal Engawa rule.

Negotiated responses:

```http
Content-Type: text/markdown; charset=utf-8   # or text/html
Vary: Accept
```

Both HTML and Markdown branches emit `Vary: Accept` (tested).

`HEAD` uses the same selection as `GET`.

## Accept test vectors

See [`fixtures/accept-vectors.json`](../examples/content-negotiation/fixtures/accept-vectors.json) — focused cases including specificity/q interactions and mixed case / whitespace.

## Cache experiment

[`cache-demo.mjs`](../examples/content-negotiation/cache-demo.mjs) demonstrates:

1. Markdown client caches `/about` keyed by URL only
2. Browser later receives cached Markdown at `/about` (**failure**)
3. Cache keyed by URL + Accept variant separates representations (**correct**)

Trade-off: Accept negotiation on the human URL **reduces cache reuse** compared with one HTML URL plus a separately cacheable `/about.md`.

Dedicated `.md` URLs avoid Accept-variant fragmentation entirely.

## Static hosting implications

Artifact-driven Engawa sites ([static-build-time-integration.md](static-build-time-integration.md)) emit:

```text
/about.html  → HTML
/about.md    → Markdown
```

Same-URL negotiation typically requires CDN rules, reverse proxy, edge function, or server runtime on the human path. **This experiment does not add runtime requirements to static sites.**

## Framework notes

### Next.js (documented pattern only)

```text
EXPERIMENTAL_PATTERN
NOT_ENGAWA_RUNTIME_API
NEXTJS_PAGE_ROUTE_COLOCATION = INVALID
NEXTJS_NEGOTIATION_PATTERN = EXPERIMENTAL_ONLY
```

Next.js App Router does **not** allow `page.tsx` and `route.ts` to coexist at the same route segment. Do not sketch `app/about/page.tsx` together with `app/about/route.ts`.

Dedicated `.md` remains the **current proven** Next.js Engawa pattern (`app/about.md/route.ts` + human HTML page).

Conceptual approaches only (not shipped):

**OPTION A — request-routing layer**

- `app/about/page.tsx` → normal HTML
- `app/about.md/route.ts` → dedicated Markdown
- An experimental Next.js request-routing layer / Proxy / Middleware / edge rewrite (depending on Next.js version and hosting) could inspect `Accept` and route a Markdown-preferring request internally to the Markdown representation

**OPTION B — Route Handler owns `/about` entirely**

- If `app/about/route.ts` owns `/about`, it could negotiate representations itself
- Then `app/about/page.tsx` **cannot** also own that same route
- This is **not** the preferred Engawa architecture

Locale middleware must not break machine routes ([integrations/nextjs.md](integrations/nextjs.md)). Same-URL negotiation on localized human routes adds further complexity — out of scope for this experiment.

### Other hosts

| Host                   | Model A              | Model B                         |
| ---------------------- | -------------------- | ------------------------------- |
| Generic Node HTTP      | Trivial              | Feasible (this experiment)      |
| Static + reverse proxy | Native files         | Requires proxy `Accept` routing |
| CDN/edge               | Separate object keys | Needs `Vary: Accept` support    |
| Plain static hosting   | Native               | Not feasible without edge layer |

No `engawa-nextjs` package. No framework packages created.

## SEO and crawler analysis

Same-URL negotiation based on `Accept` is **not automatically cloaking** when representations are semantically equivalent public content. Risks remain:

- Shared caches ignoring `Vary: Accept`
- Crawlers sending unusual `Accept` values
- Operational confusion debugging “which representation was indexed?”
- Accidental content drift between HTML and Markdown builders

Preserve:

```text
CONTENT_SEMANTICS_EQUIVALENT = YES
```

Never use negotiation to expose agent-only claims, private CMS fields, or content unavailable in human-public HTML.

## Ecosystem evidence

| Category                          | Status                                                                                                                                                                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STANDARD_SUPPORT`                | YES — RFC 7763 registers `text/markdown`; RFC 9110 defines negotiation mechanics                                                                                                                                                                                                                         |
| `VENDOR_SUPPORT`                  | `ESTABLISHED_EXAMPLE` — Cloudflare [Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) documents same-URL `Accept: text/markdown` → `text/markdown` with `Vary: Accept`, HTML as normal/default, and explicit Markdown URL access in the docs ecosystem |
| `BROAD_CLIENT_ADOPTION`           | `NOT_ESTABLISHED` — one vendor deployable pattern ≠ proven agent-wide header usage                                                                                                                                                                                                                       |
| `OBSERVED_REFERENCE_SITE_TRAFFIC` | Not measured in this repository                                                                                                                                                                                                                                                                          |

```text
STANDARD_SUPPORT = YES
VENDOR_SUPPORT = ESTABLISHED_EXAMPLE
BROAD_CLIENT_ADOPTION = NOT_ESTABLISHED
REFERENCE_SITE_ACCEPT_EVIDENCE = NOT_YET_MEASURED
```

Cloudflare strengthens the case that same-URL negotiation is **real and deployable**. It does **not** by itself prove Engawa should recommend the pattern, and it does **not** populate reference-site Accept evidence.

Operators can measure `Accept` on canonical HTML using [observability.md](observability.md). **Do not invent traffic evidence.**

## Decision criteria (before conclusion)

### ADOPT if

- Protocol behavior is clear and testable
- Cache safety is manageable at scale
- Framework implementation stays small
- Static sites are not forced into runtime complexity
- Dedicated `.md` remains available
- Credible client adoption exists
- Content parity is easy to preserve
- Operational cost is proportionate to benefit

### DEFER if

- Technically sound but client demand is undemonstrated
- Cache/edge complexity outweighs current evidence
- Observability should gather production `Accept` data first

### REJECT if

- Interoperability benefit is weak
- Hazards materially outweigh value
- Dedicated `.md` solves the real need more simply

## Experiment results

Local proof: Accept vectors pass; `Vary: Accept` on both branches; Markdown parity between `/about` (negotiated) and `/about.md` (dedicated); cache demo confirms variant-key requirement.

Gaps:

- No production `Accept: text/markdown` traffic measured on Engawa reference sites
- Static/build-time Engawa path does not benefit without new runtime/edge layer
- Production references use Model A only
- Vendor example (Cloudflare) shows deployability, not Engawa reference demand or broad client adoption
- BOTH hybrid adds complexity without demonstrated Engawa-site demand

## Decision

Applying the criteria above (re-evaluated after RFC Accept precedence fix and Cloudflare primary-source citation):

```text
CONTENT_NEGOTIATION_EXPERIMENT = COMPLETE

SAME_URL_NEGOTIATION_PROTOCOL_VALID = YES
VARY_ACCEPT_REQUIRED = YES
DEDICATED_MD_STILL_SUPPORTED = YES
STATIC_SITE_RUNTIME_REQUIRED = YES_FOR_MODEL_B
STANDARD_SUPPORT = YES
VENDOR_SUPPORT = ESTABLISHED_EXAMPLE
BROAD_CLIENT_ADOPTION = NOT_ESTABLISHED
REFERENCE_SITE_ACCEPT_EVIDENCE = NOT_YET_MEASURED

DECISION = DEFER
RATIONALE = Same-URL negotiation is protocol-valid, locally testable, and exemplified by at least one major CDN vendor (Cloudflare Markdown for Agents). Engawa evidence still favors dedicated .md URLs as the default: production references use Model A, static/build-time sites need no runtime, cache semantics are simpler, and REFERENCE_SITE_ACCEPT_EVIDENCE remains NOT_YET_MEASURED. Vendor deployability alone does not prove broad agent adoption or Engawa-site demand.
NEXT_ACTION = Reference-site operators may log Accept on canonical HTML (observability recipe). Revisit if REFERENCE_SITE_ACCEPT_EVIDENCE shows sustained Accept: text/markdown on human URLs without path-based .md fetches. Any future ADOPT phase would document BOTH hybrid (keep /about.md), require Vary: Accept, and remain optional — not a replacement for dedicated machine URLs.
```

If ADOPT were chosen later: **do not** implement in core/discovery/MCP in the same PR — define a separate implementation phase with framework docs only.

If REJECT were chosen: document that dedicated `.md` remains the Engawa default indefinitely.

## Related

- [Content publication rule](content-publication.md)
- [Observability (operator-local)](observability.md)
- [Roadmap](roadmap.md)
- [Example: local experiment](../examples/content-negotiation/README.md)

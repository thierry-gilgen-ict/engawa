# Multi-locale Engawa guidance

Canonical guidance for multilingual / multi-locale Engawa integrations.

This phase is **guidance + reference proof** — not a new runtime package, not automatic translation, and not an i18n framework.

Local proof: [`examples/multi-locale-site/`](../examples/multi-locale-site/).

Reference evidence: [The Old Hand of Asia](production-references.md) (bilingual DE/EN) — principles extracted, not copied as universal law.

## Core invariants

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
AUTO_TRANSLATION = NO
MODEL_CALLS = NONE
NO_MODEL_LANGUAGE_DETECTION = YES
MULTI_LOCALE_REQUIRES_RUNTIME = NO
PUBLIC_IN_ONE_LOCALE_DOES_NOT_IMPLY_PUBLIC_IN_ALL_LOCALES = YES
```

Same-URL `Accept` negotiation remains **DEFER** ([content-negotiation-experiment.md](content-negotiation-experiment.md)). Dedicated localized `.md` URLs remain the proven default.

## A. Resource identity

Locale variants are **separate Engawa resources** when they represent separate human-public localized pages.

Recommended stable ID pattern:

```text
{locale}-{slug}
```

Examples:

```text
de-ankauf
en-selling
```

Translated slugs need not match (`ankauf` vs `selling`). Do not reuse one locale-blind ID for `/de/about` and `/en/about` unless the host explicitly models one resource with deterministic locale identity.

```text
RESOURCE_ID_STABLE_WITHIN_LOCALE = YES
MULTI_LOCALE_RESOURCE_IDS_UNIQUE = PASS
```

## B. metadata.locale

Set explicit locale on each resource when available:

```json
{ "locale": "de" }
```

Valid values: `de`, `en`, `fr`, `it`, or BCP 47 tags such as `de-CH`, `en-GB`.

Do not silently infer locale from body text. Path-based inference may help **host integration**, but stored/returned locale identity should be explicit where practical.

```text
METADATA_LOCALE_EXPLICIT = PASS
```

## C. Canonical human URL

Each localized resource should point at the corresponding **human-public localized URL**, not merely the markdown alternate path.

```text
German resource canonicalUrl → https://example.ch/de/ankauf
English resource canonicalUrl → https://example.ch/en/selling
```

```text
RESOURCE_CANONICAL_URL_MATCHES_HUMAN_LOCALE = PASS
```

Do not point multiple localized resources at one shared wrong canonical URL to reduce URL count.

## D. Markdown routes

Deterministic localized Markdown URLs:

```text
/de/ankauf.md
/en/selling.md
```

Each Markdown representation derives from the **same localized human-public source** as its HTML route:

```text
GET /de/ankauf
    ↓
getPublishedPage("de", "ankauf")
    ├── HTML
    └── /de/ankauf.md
```

Never:

```text
German HTML → German source
German Markdown → English fallback
```

unless the human German route itself visibly uses that fallback.

```text
FALLBACK_MUST_MATCH_HUMAN_BEHAVIOR = YES
NO_AGENT_ONLY_TRANSLATION_FALLBACK = YES
```

## E. Locale middleware

Machine routes must be **deterministic**.

Locale redirect middleware based on cookies, `Accept-Language`, browser session, or inferred geography must **not** unpredictably rewrite:

- `/llms.txt`
- dedicated `*.md` resources
- `/mcp`

If locale-prefixed machine URLs exist, they must be explicit (e.g. `/de/about.md`) — not silently redirected by cookie to another locale.

```text
MACHINE_ROUTES_DETERMINISTIC = PASS
MACHINE_ROUTE_LOCALE_REDIRECTS = NO
```

See [Next.js integration](integrations/nextjs.md).

## F. hreflang / canonical (HTML SEO)

HTML hosts may use `rel=canonical` and `hreflang` per normal web/SEO practice.

Engawa does **not** replace or redefine those standards. Locale-specific Engawa resources correspond to localized human pages; Engawa does not invent an hreflang replacement.

## llms.txt multi-locale strategy

| Model                    | Pattern                               | Notes                                                          |
| ------------------------ | ------------------------------------- | -------------------------------------------------------------- |
| **A — Combined root**    | `/llms.txt` lists all locales         | Proven by Reference 2; locale visible via URL, title, preamble |
| **B — Per-locale files** | `/de/llms.txt`, `/en/llms.txt`        | Explicit handoff only — **not autodiscovered**                 |
| **C — Hybrid**           | Root overview + optional locale files | Large sites; locale files are host-generated handoffs          |

### Recommendation

**Default: Model A (combined root `/llms.txt`)** when byte budget and maintainability allow.

- Use current `buildLlmsTxt(config, resources)` with the full public corpus
- Locale visible from resource URLs, titles/descriptions, optional host preamble mentioning locales
- Deterministic ordering from adapter

**Optional: Model B** for large multilingual sites — host filters resources by `metadata.locale` before calling `buildLlmsTxt`, serves result at an explicit URL (e.g. `/de/llms.txt`). Agents must be **told** that URL; do not assume autodiscovery.

**No discovery runtime changes** in this phase.

```text
LLMS_TXT_STRATEGY = COMBINED_ROOT_DEFAULT
PER_LOCALE_LLMS_OPTIONAL = YES
PER_LOCALE_LLMS_AUTODISCOVERY = NO
```

## MCP multi-locale behavior

**Current behavior (documented, not changed):**

- One public MCP corpus may contain all locale resources
- `listResources` returns all public resources across locales
- `getResource` uses stable locale-aware IDs
- `search_site` has **no locale filter parameter** — search spans the corpus unless the host adapter implements filtering

```text
MCP_CORPUS_STRATEGY = SINGLE_PUBLIC_CORPUS
MCP_LOCALE_FILTER_API = FUTURE_API_CANDIDATE
NO_MODEL_LANGUAGE_DETECTION = YES
```

Recommended host adapter strategy:

- Include only human-public locale variants in the corpus
- Set `metadata.locale` explicitly on each resource
- Optionally filter search results in a site-specific wrapper when integration knows locale context
- Do not assume Engawa core detects query language

## Fallback policy

**Good:** Human German route falls back to default-language content and visibly shows that behavior → Engawa may mirror it.

**Bad:** Human German route says "not translated" but Engawa silently serves full English content.

**Bad:** Engawa exposes unpublished translation before the human route does.

```text
FALLBACK_MUST_MATCH_HUMAN_BEHAVIOR = YES
NO_AGENT_ONLY_TRANSLATION_FALLBACK = YES
```

## Security / privacy

Locale handling must not broaden the public corpus.

```text
PUBLIC_IN_ONE_LOCALE_DOES_NOT_IMPLY_PUBLIC_IN_ALL_LOCALES = YES
```

Example:

```text
German page published → German Engawa resource MAY be public
English translation draft → English Engawa resource MUST NOT be public
```

Never expose: draft translations, preview locales, CMS variants not human-public, translator notes, untranslated source unless publicly visible.

## Static / build-time compatibility

Artifact-driven sites may emit:

```text
/de/about.html + /de/about.md
/en/about.html + /en/about.md
```

No server runtime is required merely because a site is multilingual.

```text
MULTI_LOCALE_REQUIRES_RUNTIME = NO
STATIC_BUILD_TIME_COMPATIBILITY = PASS
```

See [static-build-time-integration.md](static-build-time-integration.md).

## Observability relationship

If operators log agent-surface requests, an optional normalized `locale` field is acceptable **only when** the host already has deterministic route/resource locale identity.

Do not infer language from User-Agent or model identity.

See [observability.md](observability.md).

## Recommended Engawa default

Based on repository evidence and the local proof:

- Localized HTML URLs remain canonical human routes
- Localized Markdown gets explicit URLs (`/{locale}/….md` or host-specific pattern)
- Locale variants are distinct resources with stable IDs (`{locale}-{slug}`)
- `metadata.locale` is explicit
- One shared MCP corpus contains all public locale resources
- No automatic translation
- One root `/llms.txt` lists all manageable public resources (Model A default)
- Optional per-locale llms files for large sites (explicit handoff, Model B)
- Machine routes bypass cookie / `Accept-Language` redirect behavior
- Fallback must match human-visible fallback

## Acceptance contract

```text
MULTI_LOCALE_RESOURCE_IDS_UNIQUE = PASS
RESOURCE_CANONICAL_URL_MATCHES_HUMAN_LOCALE = PASS
METADATA_LOCALE_EXPLICIT = PASS
MACHINE_ROUTES_DETERMINISTIC = PASS
FALLBACK_MUST_MATCH_HUMAN_BEHAVIOR = PASS
PUBLIC_IN_ONE_LOCALE_DOES_NOT_IMPLY_PUBLIC_IN_ALL_LOCALES = PASS
AUTO_TRANSLATION = NO
MODEL_CALLS = NONE
RUNTIME_REQUIRED = NO
```

## Related

- [Content publication rule](content-publication.md)
- [Next.js integration](integrations/nextjs.md)
- [Production references](production-references.md)
- [Integration acceptance](integration-acceptance.md)
- [Example: multi-locale site](../examples/multi-locale-site/README.md)

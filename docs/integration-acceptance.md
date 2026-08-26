# Engawa integration acceptance contract

Use this checklist after integrating or upgrading Engawa in a production website. Copy the summary block into your PR or deployment record.

Full context: [integrating an existing site](integrating-an-existing-site.md), [security model](security-model.md), [content publication rule](content-publication.md).

## DISCOVERY

Published surfaces (verify they exist and are correct—not that providers automatically consume them):

- [ ] `GET /llms.txt` returns `200`
- [ ] `llms.txt` lists the correct canonical site URL
- [ ] Expected Markdown alternate links are present (if you publish them)
- [ ] MCP URL is included in `llms.txt` (if you expose MCP)

Provider autodiscovery of `llms.txt` or `rel="alternate"` Markdown must **not** be assumed. Measure fetch behavior where possible ([Do you need Engawa?](do-you-need-engawa.md)).

## MARKDOWN

- [ ] Representative `*.md` routes return `200` (e.g. `/about.md`)
- [ ] `Content-Type` is `text/markdown` (or agreed equivalent)
- [ ] Markdown body matches the **same canonical human-public source** as the HTML route
- [ ] No private, draft, admin, or session content appears

## MCP

- [ ] MCP endpoint connects (initialize / Streamable HTTP handshake succeeds)
- [ ] `resources/list` returns expected public resources
- [ ] `resources/read` returns content for a known public resource
- [ ] `tools/list` succeeds
- [ ] Public v0.x exposes **only** `search_site` (no extra write tools)
- [ ] `search_site` returns expected public results for a known query
- [ ] `search_site` does not return private or admin-only content

## MULTI-LOCALE (when applicable)

See [multi-locale guidance](multi-locale.md).

- [ ] Locale resource IDs are unique (`de-*`, `en-*`, or host convention)
- [ ] Each resource `canonicalUrl` matches the localized human-public URL
- [ ] `metadata.locale` is set explicitly where practical
- [ ] Machine routes (`/llms.txt`, `/mcp`, `*.md`) skip cookie / `Accept-Language` redirects
- [ ] Draft/unpublished locale variants are excluded from the public corpus
- [ ] No automatic or agent-only translation fallback
- [ ] Markdown per locale derives from the same localized human-public source as HTML

## SECURITY

Content corpus (adapter-level):

- [ ] Search for admin-only terms returns **no** private resources
- [ ] Draft / unpublished sentinel content is **absent**
- [ ] Contact submission or PII sentinel is **absent**
- [ ] Environment, session, or secret paths are **absent**

Host and rate limiting (application or edge — Engawa packages do **not** provide these):

- [ ] **Host validation** — evil `Host` rejected (`PASS_APP`) or enforced at trusted reverse proxy / edge (`PASS_EDGE`, documented and tested)
- [ ] **Rate limiting** — abuse on `/mcp` and search returns 429 or documented edge behavior (`PASS_APP` or `PASS_EDGE`)
- [ ] **Origin validation** — if browser-origin MCP requests are accepted, `Origin` is validated (`PASS_APP` or `PASS_EDGE`); otherwise `NOT_APPLICABLE`

### Production security principle

```text
PRODUCTION_SECURITY_UNKNOWN_OR_MISSING = FAIL
```

For **production** integration, overall `PASS` is **forbidden** when:

- `HOST_VALIDATION` is `FAIL`, `NOT_APPLICABLE_DEV_ONLY`, or unconfigured without documented edge equivalent
- `RATE_LIMIT` is `FAIL`, `NOT_APPLICABLE_DEV_ONLY`, or unconfigured without documented edge equivalent
- Any security invariant is `UNKNOWN` or untested

`NOT_APPLICABLE_DEV_ONLY` is valid only for local development smoke—not for production acceptance.

## UX (if Bring Your Agent is installed)

- [ ] BYA trigger opens dialog
- [ ] Generic MCP option is always available
- [ ] No fake one-click provider connect for unsupported deep links
- [ ] Keyboard navigation works (focus trap, Escape closes dialog)
- [ ] Mobile layout has no horizontal overflow on BYA surfaces

## BUILD

- [ ] Site format/lint/typecheck/tests pass
- [ ] Site production build passes
- [ ] Engawa production smoke or site-specific smoke passes

## DISTRIBUTION MAP — OPTIONAL, NOT GATING

- [ ] `JOINED_DISTRIBUTION_MAP = YES / NO / NOT_REQUESTED`

`NO` or `NOT_REQUESTED` does **not** affect integration `PASS`. Map registration is not part of Engawa correctness. Production acceptance must never depend on registry availability.

---

## Summary block (copy into PR)

```text
ENGAWA_INTEGRATION_ACCEPTANCE = PASS / FAIL

DISCOVERY = PASS / FAIL
MARKDOWN = PASS / FAIL
MCP = PASS / FAIL
SECURITY = PASS / FAIL
HOST_VALIDATION = PASS_APP / PASS_EDGE / FAIL / NOT_APPLICABLE_DEV_ONLY
RATE_LIMIT = PASS_APP / PASS_EDGE / FAIL / NOT_APPLICABLE_DEV_ONLY
ORIGIN_VALIDATION = PASS_APP / PASS_EDGE / FAIL / NOT_APPLICABLE / NOT_APPLICABLE_DEV_ONLY
BYA = PASS / FAIL / NOT_INSTALLED
BUILD = PASS / FAIL
JOINED_DISTRIBUTION_MAP = YES / NO / NOT_REQUESTED

NOTES =
```

**FAIL** if any security invariant is unknown or untested, or if production host/rate limit is `FAIL` or `NOT_APPLICABLE_DEV_ONLY`.

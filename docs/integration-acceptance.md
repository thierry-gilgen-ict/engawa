# Engawa integration acceptance contract

Use this checklist after integrating or upgrading Engawa in a production website. Copy the summary block into your PR or deployment record.

Full context: [integrating an existing site](integrating-an-existing-site.md), [security model](security-model.md), [content publication rule](content-publication.md).

## DISCOVERY

- [ ] `GET /llms.txt` returns `200`
- [ ] `llms.txt` lists the correct canonical site URL
- [ ] Expected Markdown alternate links are present
- [ ] MCP URL is included in `llms.txt`

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

## SECURITY

- [ ] Search for admin-only terms returns **no** private resources
- [ ] Draft / unpublished sentinel content is **absent**
- [ ] Contact submission or PII sentinel is **absent**
- [ ] Environment, session, or secret paths are **absent**
- [ ] Evil `Host` header rejected where host validation is configured
- [ ] Rate limit exercised (429 or documented edge behavior under abuse)

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

---

## Summary block (copy into PR)

```text
ENGAWA_INTEGRATION_ACCEPTANCE = PASS / FAIL

DISCOVERY = PASS / FAIL
MARKDOWN = PASS / FAIL
MCP = PASS / FAIL
SECURITY = PASS / FAIL
BYA = PASS / FAIL / NOT_INSTALLED
BUILD = PASS / FAIL

NOTES =
```

**FAIL** if any security invariant is unknown or untested.

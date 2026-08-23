# Agent integration playbook

Deterministic instructions for coding agents (Cursor, Codex, Claude Code, OpenAI coding agents, etc.) integrating **released Engawa npm packages** into an **existing website repository**.

## MISSION

Integrate published Engawa packages into the existing website while preserving the website's architecture and strict human-public content boundary.

## DO NOT

- Fork Engawa or vendor Engawa source into the consumer repo
- Copy Engawa package internals into the host application
- Modify `@thierry-gilgen-ict/engawa-*` package source in `node_modules`
- Expose admin, draft, contact submission, session, or secret data
- Treat CMS "published" as automatically agent-public
- Invent provider deep-link URL formats
- Add write tools or OAuth to the public MCP surface
- Migrate unrelated site architecture "while integrating"
- Modify site content solely to make Engawa integration easier
- Merge or deploy without human review when instructed not to

## FIRST INSPECT (before code)

Record findings:

- Framework and app structure
- Node version (must be **24+** for current Engawa)
- Package manager and lockfile policy
- Deployment pipeline
- Public human routes and locales
- Human route content loaders (functions, CMS queries, static files)
- CMS / DB / static architecture
- Middleware (auth, locale, redirects)
- Session and admin boundaries
- Reverse proxy and canonical host
- Existing rate limiting
- Analytics and logging (metadata vs content bodies)
- Test tooling (lint, typecheck, unit, e2e)

## REQUIRED INVARIANT

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
```

For every Engawa resource, identify the **same canonical loader** the human HTML route uses.

If canonical source is unclear for a route class:

```text
PUBLIC_SOURCE_UNCLEAR = STOP
```

Do not resolve ambiguity by exposing more content.

Read [content publication rule](content-publication.md) before implementing adapters.

## IMPLEMENTATION SEQUENCE

Execute in order. Stop at any blocking condition.

| Step | Action                                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------- |
| A    | **Discovery report** — document framework, routes, sources, risks                                     |
| B    | **Integration architecture proposal** — packages, routes, adapter shape (no code yet if A incomplete) |
| C    | **Package install** — exact registry pins from [compatibility](compatibility.md)                      |
| D    | **Adapter** — custom `ContentAdapter`; no `StaticContentAdapter` in production dynamic sites          |
| E    | **llms.txt** — route + `generateLlmsTxt`                                                              |
| F    | **Markdown** — alternates sharing human-public markdown builders                                      |
| G    | **MCP** — public handler, resources, `search_site` only                                               |
| H    | **Security guards** — host, origin (if needed), rate limits, bounds                                   |
| I    | **BYA optional** — `engawa-react@0.1.0`, capability-matrix-honest actions                             |
| J    | **Analytics optional** — metadata only; never log prompt/context bodies                               |
| K    | **Tests** — site suite + [integration acceptance](integration-acceptance.md)                          |
| L    | **Production check** — staging smoke before deploy recommendation                                     |
| M    | **Final report** — machine block below                                                                |

## CURRENT TESTED PACKAGE SET

See [compatibility.md](compatibility.md). As of `ENGAWA_RELEASE_SET = 2026-08-v0.1.1`:

- `@thierry-gilgen-ict/engawa-core@0.1.1`
- `@thierry-gilgen-ict/engawa-discovery@0.1.1`
- `@thierry-gilgen-ict/engawa-mcp@0.1.1`
- `@thierry-gilgen-ict/engawa-react@0.1.0` (optional)

## FINAL REPORT (required)

Return this block when integration work completes:

```text
ENGAWA_INTEGRATION_RESULT = PASS / FAIL

FRAMEWORK =
NODE_VERSION =
PACKAGE_MANAGER =

ENGAWA_CORE_VERSION =
ENGAWA_DISCOVERY_VERSION =
ENGAWA_MCP_VERSION =
ENGAWA_REACT_VERSION =

PUBLIC_RESOURCE_COUNT =
LOCALES =
HUMAN_PUBLIC_SOURCE_PARITY = YES / NO / UNKNOWN
PRIVATE_CONTENT_EXCLUDED = YES / NO / UNKNOWN

LLMS_TXT = PASS / FAIL
MARKDOWN = PASS / FAIL
MCP = PASS / FAIL
RESOURCES_LIST = PASS / FAIL
RESOURCES_READ = PASS / FAIL
TOOLS_LIST = PASS / FAIL
SEARCH_SITE = PASS / FAIL
PUBLIC_TOOLS = search_site only / FAIL

HOST_VALIDATION = PASS / FAIL / NOT_CONFIGURED
RATE_LIMIT = PASS / FAIL / NOT_CONFIGURED
ADMIN_EXCLUDED = PASS / FAIL / UNKNOWN
DRAFTS_EXCLUDED = PASS / FAIL / UNKNOWN
CONTACT_DATA_EXCLUDED = PASS / FAIL / UNKNOWN
SESSION_DATA_EXCLUDED = PASS / FAIL / UNKNOWN
SECRETS_EXCLUDED = PASS / FAIL / UNKNOWN

BYA = PASS / FAIL / NOT_INSTALLED
GENERIC_MCP = PASS / FAIL
PROVIDER_ACTIONS_TRUTHFUL = PASS / FAIL / NOT_INSTALLED

FORMAT = PASS / FAIL
LINT = PASS / FAIL
TYPECHECK = PASS / FAIL
TESTS = PASS / FAIL
BUILD = PASS / FAIL
PRODUCTION_SMOKE = PASS / FAIL / NOT_RUN

ENGAWA_CORE_FORKED = NO
UNRELATED_ARCHITECTURE_CHANGED = NO
AUTHENTICATED_MCP_STARTED = NO
MUTATING_TOOLS_STARTED = NO

BLOCKERS =
```

**PASS** is not allowed if any security invariant is `UNKNOWN`.

## Related

- [Integrating an existing site](integrating-an-existing-site.md) — human-oriented workflow
- [Integration acceptance contract](integration-acceptance.md) — checklist
- [Security model](security-model.md)
- [Next.js integration](integrations/nextjs.md) — if applicable
- [Ready-to-copy prompt](prompts/integrate-engawa.md)

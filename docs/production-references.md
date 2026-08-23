# Production reference integrations

Engawa v0.1 packages are consumed from the public npm registry by two live production websites. No Engawa core packages were forked for either integration.

## Reference 1 — Thierry Gilgen ICT

| Item             | URL                                                                             |
| ---------------- | ------------------------------------------------------------------------------- |
| Site             | https://www.thierry-gilgen-ict.ch                                               |
| Bring Your Agent | https://www.thierry-gilgen-ict.ch/agents                                        |
| llms.txt         | https://www.thierry-gilgen-ict.ch/llms.txt                                      |
| MCP              | https://www.thierry-gilgen-ict.ch/mcp                                           |
| Markdown example | https://www.thierry-gilgen-ict.ch/field-notes/example.md (pattern; slug varies) |

**Integration characteristics**

- Editorial Field Notes content model (Prisma-backed public content)
- Multi-locale via site i18n
- Next.js App Router route handlers for machine endpoints
- Site-specific markdown builders and content adapter
- Quiet Paper / Studio visual system on `engawa-react` BEM classes

**What it proved**

- First production consumer of released npm packages
- End-to-end: llms.txt, markdown alternates, MCP `search_site`, Bring Your Agent UX
- Provider-neutral BYA with metadata-only analytics bridge

## Reference 2 — The Old Hand of Asia

| Item                  | URL                                      |
| --------------------- | ---------------------------------------- |
| Site                  | https://theoldhandofasia.ch              |
| Bring Your Agent (DE) | https://theoldhandofasia.ch/agents       |
| Bring Your Agent (EN) | https://theoldhandofasia.ch/en/agents    |
| llms.txt              | https://theoldhandofasia.ch/llms.txt     |
| MCP                   | https://theoldhandofasia.ch/mcp          |
| Markdown (DE)         | https://theoldhandofasia.ch/ankauf.md    |
| Markdown (EN)         | https://theoldhandofasia.ch/en/ankauf.md |

**Integration characteristics**

- Bilingual DE (canonical unprefixed) + EN (`/en` prefix)
- **Mixed content sources:** home uses published CMS overlay where humans do; non-home pages use static public dictionaries matching human routes
- Drizzle CMS for operator content; Engawa adapter follows [human-public sources](content-publication.md), not CMS publication alone
- Quiet Paper visual system on `engawa-react`
- Strict public/private boundary (admin, drafts, source-material, knowledge, contact submissions excluded)

**What it proved**

- Second materially different content architecture without Engawa core changes
- `MULTILINGUAL_PORTABILITY` with deterministic machine routes (no cookie/`Accept-Language` on `/mcp`, `llms.txt`, `*.md`)
- `NEXTJS_ADAPTER_EXTRACTION_JUSTIFIED = NO` — documented glue in host app, no `engawa-nextjs` package

## Portability conclusion

| Claim                                                 | Verdict                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `PORTABILITY_PROVEN_ACROSS_TWO_CONTENT_ARCHITECTURES` | **YES** — Field Notes vs section CMS + static EN                     |
| `FRAMEWORK_PORTABILITY_PROVEN`                        | **NO** — both references use Next.js; other frameworks not validated |
| `ENGAWA_CORE_CHANGE_REQUIRED` for either site         | **NO**                                                               |

## What we do not document here

- Private repository paths, secrets, or admin URLs
- Unpublished CMS workflows
- Operator credentials or deployment keys

For integration patterns without site-specific code, see [Next.js integration](integrations/nextjs.md) and [getting started](getting-started.md).

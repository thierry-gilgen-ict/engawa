# Content publication rule

Engawa integration principle:

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
```

**Public** in Engawa means what an anonymous human visitor can see on the live website—not what exists in a database, CMS, Git repo, or operator workflow.

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

## Good pattern

Human route and Engawa use the **same canonical source**:

```text
Human GET /about     → getPageContent("en").about
Engawa resource      → getPageContent("en").about  → markdown
GET /about.md        → same markdown builder
```

Homepage exception (mixed architectures): if humans use `getPublishedHome()` and Engawa home markdown uses `getPublishedHome()`, that is still parity—both sides use the same function.

## Bad pattern

```text
Human GET /ankauf    → getPageContent("de").ankauf   (static dictionary)
Engawa /ankauf       → getPublishedPage("ankauf")    (CMS overlay)
```

Agents could see CMS text before humans do. Phase 2A on [theoldhandofasia.ch](https://theoldhandofasia.ch) corrected this class of bug.

## Adapter responsibility

Your `ContentAdapter` is the gate. Engawa core does not know your CMS, database, or filesystem layout.

- Implement `listResources`, `getResource`, and `search` over **only** human-public content.
- Test with sentinels: CMS-only strings must not appear in Engawa if humans don't see them.
- Search must not return admin paths, drafts, or private IDs.

## Markdown routes

`*.md` routes should use the same builder as MCP resources. They are discovery aids, not a second publication channel with different rules.

## Related docs

- [Security model](security-model.md) — launch checklist
- [Getting started](getting-started.md) — adapter step
- [Production references](production-references.md) — how reference sites apply this rule

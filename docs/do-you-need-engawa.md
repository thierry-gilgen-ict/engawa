# Do you need Engawa?

**You may not need Engawa.**

Engawa is an open toolkit for sites that want a deliberate, bounded agent interface alongside their human website. Many sites already expose enough structure for their goals without adding another layer.

This page helps you decide—without assuming Engawa is always the answer.

## When you probably do **not** need Engawa

| Situation                                                                                                             | Why Engawa may be unnecessary                                                                     |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Small static site with clean semantic HTML and JSON-LD, and **conventional search indexing** is the only machine goal | HTML + schema.org + sitemap may already satisfy discovery and entity semantics for search engines |
| Site whose only machine integration need is a **documented transactional API**                                        | OpenAPI (or similar) may already define the callable contract agents or integrations need         |
| No plan to **maintain or measure** a separate agent retrieval surface                                                 | Engawa adds surfaces you must keep in parity with human-public content                            |
| Private or authenticated product with no anonymous public corpus                                                      | Engawa v0.1 targets **public read-only** agent surfaces                                           |

If none of your goals require deterministic agent-facing documents, explicit corpus boundaries, or bounded read-only retrieval, you can stop here.

## When Engawa becomes useful

Engawa helps when you want the **same human-public information** exposed through **cleaner, smaller, more deterministic** agent-facing representations—without pretending HTML is unreadable.

Typical drivers:

- Large or noisy browser documents (layout, navigation, scripts, chrome around the actual prose)
- Important public prose, caveats, or reasoning that agents should retrieve reliably
- Need for **deterministic Markdown** or resource identities separate from presentation HTML
- Need for **explicit corpus boundaries** (what is public to agents vs admin/CMS/drafts)
- Bounded interactive **search and read** via MCP for explicitly connected agents
- **Bring Your Agent** UX so visitors use their own AI tool instead of an embedded site chatbot
- Governance requirement that **agent-visible content equals human-public content** ([content publication rule](content-publication.md))

**Illustrative adopter measurement (not a universal benchmark):** one static homepage reported ~246 KB total HTML vs ~19 KB visible text (~7.7% visible meaning share). Agents can read HTML; the issue is presentation overhead and extraction ambiguity—not basic literacy.

## How Engawa relates to other formats

These formats are **complementary**. Engawa does not replace HTML, schema.org, sitemaps, robots.txt, or OpenAPI.

| Format                   | What it does                                                                                                            | What it does **not** do                                                                            | Often enough alone when…                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **HTML**                 | Human/browser representation; agents **can** read it                                                                    | Guarantee efficient, deterministic retrieval of intended public prose; separate corpus boundaries  | Site is small, semantic, and search indexing is the main machine goal |
| **JSON-LD / schema.org** | Structured entity and attribute semantics for pages                                                                     | Replace full document text; define interactive agent tools; enforce public/private corpus rules    | Entity markup for search/rich results is sufficient                   |
| **sitemap.xml**          | URL discovery / crawl inventory for crawlers                                                                            | Provide clean document bodies; expose search tools; prove content parity with human HTML           | Crawl coverage listing is the only need                               |
| **llms.txt**             | Compact published map/handoff artifact for agent-oriented content                                                       | Guarantee any AI provider automatically discovers or consumes it                                   | You only need a human-maintained index for tools/users given the URL  |
| **Markdown alternates**  | Clean `text/markdown` document representation                                                                           | Automatic fetching by all crawlers; entity semantics; API contracts                                | You publish Markdown for humans/tools that explicitly request it      |
| **OpenAPI**              | Contract for callable application APIs                                                                                  | Publish editorial/marketing corpus; replace llms.txt or Markdown for document sites                | Machine access is API-only (transactions, data operations)            |
| **MCP**                  | Bounded interactive protocol (`resources/list`, `resources/read`, tools)                                                | Replace HTML or Markdown; guarantee visitor-scale autonomous agent usage                           | Agents are explicitly configured to connect to your endpoint          |
| **Engawa**               | Toolkit tying agent-facing surfaces to the **same human-public source**, with read-only defaults and adapter boundaries | Replace your CMS, HTML site, schema.org, sitemap, or OpenAPI where those already solve the problem | —                                                                     |

## Discovery note

Publishing an agent surface does not guarantee a particular AI provider will automatically discover, fetch, or use it. Provider behavior varies and should be **measured** rather than assumed.

```text
SURFACE EXISTS != SURFACE FETCHED
SURFACE FETCHED != SURFACE USED
SURFACE USED != OUTPUT IMPROVED
```

Engawa supports legitimate conventions (`llms.txt`, `rel="alternate"` Markdown, `rel="describedby"`, HTTP `Link` headers) as **published machine-readable entry points**. Consumer support varies.

## Architecture paths (same invariant)

Both patterns preserve:

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
```

- **Loader-driven** — human HTML and Engawa use the same canonical content loader ([content-publication.md](content-publication.md))
- **Artifact-driven** — human-public HTML artifact → deterministic build-time extraction → Engawa representation ([ADR-0008](adr/0008-artifact-driven-content-sources.md))

Runtime crawling of production HTML as the Engawa corpus is **not** the default architecture.

## Next steps

- [Integrating an existing site](integrating-an-existing-site.md)
- [Agent integration playbook](agent-integration-playbook.md)
- [Getting started](getting-started.md) (empty external project)
- [Content publication rule](content-publication.md)

# Contentful integration

Contentful as headless CMS + **Node/TypeScript frontend**. No `@thierry-gilgen-ict/engawa-contentful` package.

See the [headless CMS hub](headless-cms.md) for governing rules:

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
CMS_PUBLISHED != AUTOMATICALLY_ENGAWA_PUBLIC
SEARCH_CORPUS == ENGAWA_PUBLIC_CORPUS
```

## Architecture

| Layer                   | Role                                                |
| ----------------------- | --------------------------------------------------- |
| Node frontend           | Existing Contentful delivery client for human pages |
| Contentful Delivery API | Public content API                                  |
| Site loaders            | Same delivery queries human routes use              |
| Engawa adapter          | Reuses public-loader layer                          |

## Adapter rules

- Use the **Content Delivery API** path already used by human routes—not Preview API—for public Engawa.
- Preview API credentials must **never** power public Engawa surfaces.
- Exclude drafts and preview entries unless human routes already expose them (rare on Delivery API).
- Exclude locales not routed publicly on the human site.
- Exclude content types not rendered by anonymous human routes.
- `search(query)` — limited to the same public routed corpus; do not use Contentful search across types the frontend does not expose.

## Pitfalls

| Risk                                               | Action                      |
| -------------------------------------------------- | --------------------------- |
| `CONTENTFUL_PREVIEW_ACCESS_TOKEN`                  | Never in public adapter     |
| Preview host / preview client                      | Separate from public Engawa |
| `include` depth pulling unpublished linked entries | Match human route includes  |
| Management API                                     | Never for public Engawa     |
| Personalization / visitor segments                 | Exclude                     |

## Related

- [Headless CMS hub](headless-cms.md)
- [Content publication rule](../content-publication.md)

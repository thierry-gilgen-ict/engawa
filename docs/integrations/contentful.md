# Contentful integration

Contentful as headless CMS + **Node/TypeScript frontend**. No `@thierry-gilgen-ict/engawa-contentful` package.

See the [headless CMS hub](headless-cms.md) for governing rules:

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
CMS_PUBLISHED != AUTOMATICALLY_ENGAWA_PUBLIC
SEARCH_CORPUS == ENGAWA_PUBLIC_CORPUS
```

## Architecture

| Layer                | Role                                                |
| -------------------- | --------------------------------------------------- |
| Node frontend        | Existing Contentful published-content loader        |
| Content Delivery API | Published delivery content                          |
| Content Preview API  | Can return unpublished/draft content—not for Engawa |
| Site loaders         | Same published queries human routes use             |
| Engawa adapter       | Reuses public-loader layer                          |

Contentful GraphQL can expose preview or unpublished content when preview behavior is explicitly enabled. Public Engawa must reuse the site's normal **published-content** loader.

## Adapter rules

- Reuse the site's **published** Contentful loader—whether it uses the Delivery API or GraphQL Content API.
- Do **not** switch Engawa to Preview API credentials or GraphQL preview mode.
- Exclude drafts and preview entries unless human routes already expose them (rare on Delivery API).
- Exclude locales not routed publicly on the human site.
- Exclude content types not rendered by anonymous human routes.
- `search(query)` — limited to the same public routed corpus; do not use Contentful search across types the frontend does not expose.

## Pitfalls

| Risk                                                | Action                                     |
| --------------------------------------------------- | ------------------------------------------ |
| `CONTENTFUL_PREVIEW_ACCESS_TOKEN`                   | Never in public adapter                    |
| Preview host / preview client                       | Separate from public Engawa                |
| Preview API / GraphQL preview resolving draft links | Never use preview loader for public Engawa |
| Management API                                      | Never for public Engawa                    |
| Personalization / visitor segments                  | Exclude                                    |

## Related

- [Headless CMS hub](headless-cms.md)
- [Content publication rule](../content-publication.md)

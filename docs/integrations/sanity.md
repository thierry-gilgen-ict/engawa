# Sanity integration

Sanity as headless CMS + **Node/TypeScript frontend**. No `@thierry-gilgen-ict/engawa-sanity` package.

See the [headless CMS hub](headless-cms.md) for governing rules:

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
CMS_PUBLISHED != AUTOMATICALLY_ENGAWA_PUBLIC
SEARCH_CORPUS == ENGAWA_PUBLIC_CORPUS
```

## Architecture

| Layer               | Role                                                          |
| ------------------- | ------------------------------------------------------------- |
| Node frontend       | Existing Sanity client and GROQ/query helpers for human pages |
| Sanity Content Lake | Backend dataset                                               |
| Site loaders        | Same GROQ filters human routes use                            |
| Engawa adapter      | Wraps loaders; no broader GROQ                                |

## Adapter rules

- GROQ queries for Engawa should wrap or reuse the **same public-loader logic** as human routes.
- Public Engawa must reuse the same **production loader/perspective** as anonymous human routes. Current Sanity production queries commonly use the `published` perspective; draft/preview flows may use `drafts` or release perspectives and must not leak into public Engawa.
- Do not add manual `_id` draft-path filters if the site's existing loader already uses an appropriate published perspective.
- Exclude preview tokens from public Engawa.
- Exclude locale/content variants not routed on the anonymous human site.
- Exclude Sanity documents that exist in the dataset but are **not** routed by the frontend.
- Do not broaden GROQ simply because Sanity can return more documents.
- `search(query)` — search only the same public corpus (e.g. filter `listResources()` results or reuse site search helper); do not run dataset-wide text search over drafts or internal types.

## Pitfalls

| Risk                                   | Action                                                     |
| -------------------------------------- | ---------------------------------------------------------- |
| `drafts` or preview perspectives       | Never on public Engawa                                     |
| `previewDrafts` (legacy alias)         | Legacy perspective name—not preferred; same rule as drafts |
| Preview API token in env               | Never wire to public adapter                               |
| Scheduled `_updatedAt` / release flags | Match human route visibility                               |
| References to unpublished linked docs  | Match human route resolution                               |
| Studio-only document types             | Exclude                                                    |

## Related

- [Headless CMS hub](headless-cms.md)
- [Content publication rule](../content-publication.md)

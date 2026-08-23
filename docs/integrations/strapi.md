# Strapi integration

Strapi as headless CMS + **Node/TypeScript frontend**. No `@thierry-gilgen-ict/engawa-strapi` package.

See the [headless CMS hub](headless-cms.md) for governing rules:

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
CMS_PUBLISHED != AUTOMATICALLY_ENGAWA_PUBLIC
SEARCH_CORPUS == ENGAWA_PUBLIC_CORPUS
```

## Architecture

| Layer               | Role                                            |
| ------------------- | ----------------------------------------------- |
| Node frontend       | Existing Strapi client/fetchers for human pages |
| Strapi REST/GraphQL | Backend API                                     |
| Site loaders        | Same fetchers human routes call                 |
| Engawa adapter      | Wraps loaders; no broader Strapi queries        |

## Adapter rules

- Reuse the frontend's existing Strapi client and fetch helpers.
- Respect published/draft (or preview) handling **exactly** as human routes do—typically `publicationState=live` or equivalent filters already in site loaders.
- Exclude unpublished locale variants and locales not routed publicly.
- Exclude private/internal collections and authenticated-only content types.
- Public-route parity: if a Strapi entry is not rendered on an anonymous human route, it is not Engawa-public.
- `search(query)` — filter the same in-memory or loader-backed public corpus; do not call a Strapi search endpoint that includes drafts, preview content, or internal types.

## Pitfalls

| Risk                              | Action                            |
| --------------------------------- | --------------------------------- |
| Preview API / draft relations     | Exclude from public adapter       |
| `populate` pulling admin fields   | Match human route field selection |
| i18n locales not on public site   | Exclude                           |
| Internal plugins' content types   | Exclude unless publicly routed    |
| Strapi users, roles, admin config | Never expose                      |

## Related

- [Headless CMS hub](headless-cms.md)
- [Content publication rule](../content-publication.md)

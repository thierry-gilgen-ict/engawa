# Headless WordPress integration

WordPress as **headless CMS** + **Node/TypeScript frontend**. This is **not** an Engawa WordPress plugin.

See the [headless CMS hub](headless-cms.md) for governing rules:

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
CMS_PUBLISHED != AUTOMATICALLY_ENGAWA_PUBLIC
SEARCH_CORPUS == ENGAWA_PUBLIC_CORPUS
```

## Architecture

| Layer                           | Role                                                                   |
| ------------------------------- | ---------------------------------------------------------------------- |
| Node frontend                   | Next.js, Astro, or custom—already has loaders for human pages          |
| WordPress REST API or WPGraphQL | Backend content API                                                    |
| Site loaders                    | `getPublicPost`, `listPublicPages`, etc.—same queries human routes use |
| Engawa adapter                  | Wraps those loaders; maps to `EngawaResource`                          |

Do **not** create: PHP plugin, WordPress package, sidecar, or generic WordPress sync helper.

## Adapter rules

- REST/GraphQL queries for Engawa must **not** be broader than queries used by human routes.
- For WPGraphQL, reuse the same **unauthenticated/public-content loader** as human routes—authenticated queries can expose drafts or other data unavailable to anonymous visitors.
- WordPress `publish` status alone is **insufficient**—a post must be anonymously routed/rendered on the frontend.
- Exclude preview/draft queries, authentication tokens, and preview cookies from public Engawa.
- Exclude custom post types unless they are actually anonymously routed and rendered.
- `listResources()` — only content the frontend already exposes to anonymous visitors.
- `getResource(idOrUri)` — same corpus; same markdown builder as human route if applicable.
- `search(query)` — search only that human-public routed corpus; do not call a WP search endpoint that returns drafts, private posts, or unrouted types.

## Pitfalls

| Risk                                       | Action                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `?status=draft` or preview query params    | Never in public adapter                                                                                        |
| Application passwords / preview JWT in env | Never wire to public Engawa                                                                                    |
| Authenticated WPGraphQL queries            | Can expose drafts or data unavailable to public requests—never for Engawa; reuse unauthenticated/public loader |
| All `post` rows with `publish`             | Exclude if frontend does not route them                                                                        |
| Internal CPTs (e.g. `acf-field`)           | Exclude                                                                                                        |
| Media not linked on public pages           | Exclude                                                                                                        |

## Related

- [Headless CMS hub](headless-cms.md)
- [Content publication rule](../content-publication.md)
- [Next.js integration](nextjs.md) — if frontend is Next.js

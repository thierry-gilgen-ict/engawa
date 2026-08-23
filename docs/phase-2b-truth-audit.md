# Phase 2B truth audit (working record)

Internal audit before documentation rewrite. Do not preserve stale wording for historical convenience.

| CLAIM                      | CURRENT_DOC                                | REALITY                                                          | ACTION                                                  |
| -------------------------- | ------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------- |
| React package shipped      | README: "Planned (not in v0.1)"            | `@thierry-gilgen-ict/engawa-react@0.1.0` on npm                  | List in README packages table                           |
| Package count              | README lists 3 packages                    | Four packages published                                          | Add engawa-react row                                    |
| Roadmap phase              | `docs/roadmap.md`: "Phase 0 (current)"     | Foundation done; first + second production refs integrated       | Rewrite roadmap phases                                  |
| Quickstart path            | monorepo `pnpm --filter minimal-site` only | External developers need npm-first path                          | README 5-min npm quickstart + `docs/getting-started.md` |
| `engines.node` on packages | core/discovery/mcp omit engines            | react has `>=24`; v0.1.0 tarballs lack engines on three packages | Prepare v0.1.1 metadata bump                            |
| Production references      | Not in Engawa repo docs                    | thierry-gilgen-ict.ch + theoldhandofasia.ch live with Engawa     | `docs/production-references.md`                         |
| Public corpus rule         | Implicit in consumers only                 | Phase 2A: `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE`                 | `docs/content-publication.md`                           |
| External registry smoke    | None                                       | Required DX gate                                                 | `scripts/external-consumer-smoke.mjs` + CI              |
| Issue/PR templates         | Missing                                    | Only CI + dependabot                                             | Add `.github` templates                                 |
| CHANGELOG / releasing      | Missing                                    | `docs/publish-npm-v0.1.0.md` only                                | `CHANGELOG.md` + `docs/releasing.md`                    |
| Next.js adapter package    | Roadmap lists planned                      | Phase 2A: extraction not justified                               | Document pattern only; no engawa-nextjs                 |
| npm publication status     | Partially scattered                        | All four @0.1.0 on registry                                      | Consolidate in README + CHANGELOG                       |

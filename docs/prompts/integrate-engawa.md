# Prompt: Integrate Engawa into this repository

Copy everything below into your coding agent.

---

Integrate Engawa into this **existing** repository.

## Canonical Engawa documentation (upstream — not in this repo)

The following are **Engawa upstream documentation**, not files expected in this consumer repository. **Fetch and read them before implementation.** Do not copy or vendor Engawa source into this repo.

- Agent integration playbook: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/agent-integration-playbook.md
- Integrating an existing site: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/integrating-an-existing-site.md
- Content publication rule: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/content-publication.md
- Security model: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/security-model.md
- Integration acceptance contract: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/integration-acceptance.md
- Compatibility matrix: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/compatibility.md
- Next.js integration (if applicable): https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/integrations/nextjs.md

If your coding environment cannot access these URLs, stop and report:

```text
ENGAWA_CANONICAL_DOCS_UNAVAILABLE = STOP
```

Ask the user to provide the documentation. Do not guess or improvise integration rules.

## Rules

1. **Discover first.** Inspect framework, runtime, package manager, deployment, public routes, locales, content loaders, middleware, auth boundaries, and rate limiting before writing integration code.

2. **Do not code** until the existing public content architecture is understood.

3. **Use published npm packages** at the current tested set in the Engawa compatibility matrix (link above). Pin exact versions. Do not fork Engawa.

4. **Preserve existing architecture.** Add routes and adapters; do not refactor unrelated systems.

5. **Do not expose private data.** Adapters must implement `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE`.

6. **Do not add** authenticated MCP, OAuth, or write tools on the public surface.

7. **Implement** (as needed): custom `ContentAdapter` (with `listResources`, `getResource`, `search`), `/llms.txt`, markdown alternates, `/mcp`, optional Bring Your Agent UI.

8. **Production security** — Engawa packages do not enforce Host, Origin, or rate limits. For production integration, host validation and rate limiting must be `PASS_APP` or `PASS_EDGE` (documented and tested edge/proxy enforcement). `NOT_APPLICABLE_DEV_ONLY` is valid only for local development. `PRODUCTION_SECURITY_UNKNOWN_OR_MISSING = FAIL`.

9. **Run** the site test suite and the Engawa integration acceptance contract (upstream link above).

10. **Return** the final machine report from the agent integration playbook. `PASS` requires no unknown security invariant and production host/rate limit must not be `FAIL` or `NOT_APPLICABLE_DEV_ONLY`.

11. **Do not merge or deploy automatically.**

If canonical human-public sources are unclear for a route class, stop and report `PUBLIC_SOURCE_UNCLEAR = STOP`.

---

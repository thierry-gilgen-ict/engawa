# Prompt: Integrate Engawa into this repository

Copy everything below into your coding agent.

---

Integrate Engawa into this **existing** repository.

## Rules

1. **Discover first.** Inspect framework, runtime, package manager, deployment, public routes, locales, content loaders, middleware, auth boundaries, and rate limiting before writing integration code.

2. **Read canonical Engawa documentation** in the Engawa repository (or your vendored copy of these paths):
   - `docs/agent-integration-playbook.md`
   - `docs/integrating-an-existing-site.md`
   - `docs/content-publication.md`
   - `docs/security-model.md`
   - `docs/integration-acceptance.md`
   - `docs/compatibility.md`
   - Framework guide if applicable (e.g. `docs/integrations/nextjs.md`)

3. **Do not code** until the existing public content architecture is understood.

4. **Use published npm packages** at the current tested set in `docs/compatibility.md`. Pin exact versions. Do not fork Engawa.

5. **Preserve existing architecture.** Add routes and adapters; do not refactor unrelated systems.

6. **Do not expose private data.** Adapters must implement `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE`.

7. **Do not add** authenticated MCP, OAuth, or write tools on the public surface.

8. **Implement** (as needed): custom `ContentAdapter`, `/llms.txt`, markdown alternates, `/mcp`, optional Bring Your Agent UI.

9. **Run** the site test suite and the Engawa integration acceptance contract (`docs/integration-acceptance.md`).

10. **Return** the final machine report from the agent integration playbook. `PASS` requires no unknown security invariant.

11. **Do not merge or deploy automatically.**

If canonical human-public sources are unclear for a route class, stop and report `PUBLIC_SOURCE_UNCLEAR = STOP`.

---

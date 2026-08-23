# Prompt: Upgrade Engawa in this repository

Copy everything below into your coding agent.

---

Upgrade Engawa packages in this **existing** repository safely.

## Canonical Engawa documentation (upstream — not in this repo)

The following are **Engawa upstream documentation**, not files expected in this consumer repository. **Fetch and read them before upgrading.** Do not copy or vendor Engawa source into this repo.

- Compatibility matrix: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/compatibility.md
- CHANGELOG: https://github.com/thierry-gilgen-ict/engawa/blob/main/CHANGELOG.md
- Upgrading guide: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/upgrading.md
- Migration guides convention: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/migrations/README.md
- Integration acceptance contract: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/integration-acceptance.md
- Security model: https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/security-model.md

If your coding environment cannot access these URLs, stop and report:

```text
ENGAWA_CANONICAL_DOCS_UNAVAILABLE = STOP
```

Ask the user to provide the documentation. Do not guess or improvise upgrade rules.

## Rules

1. **Inspect currently installed versions:**

   ```bash
   npm ls @thierry-gilgen-ict/engawa-core
   npm ls @thierry-gilgen-ict/engawa-discovery
   npm ls @thierry-gilgen-ict/engawa-mcp
   npm ls @thierry-gilgen-ict/engawa-react
   ```

2. **Read upstream docs** (links above) for target `ENGAWA_RELEASE_SET`, `UPGRADE_IMPACT`, and migration requirements.

3. **Stop conditions:**
   - `BREAKING_CHANGE = YES` and `MIGRATION_GUIDE` missing or `NONE` → **STOP**
   - Cannot verify `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE` after upgrade → **STOP**
   - `ENGAWA_CANONICAL_DOCS_UNAVAILABLE = STOP` if docs cannot be fetched

4. **Create an upgrade branch.** Update only necessary Engawa dependency pins to the target tested set. Use exact versions, not floating ranges.

5. **Preserve human-public source parity.** Do not expand the public corpus to "fix" upgrade issues.

6. **Run** site lint, typecheck, tests, and build.

7. **Run** the Engawa integration acceptance contract (upstream link above). Production host validation and rate limiting must remain `PASS_APP` or `PASS_EDGE`; `PRODUCTION_SECURITY_UNKNOWN_OR_MISSING = FAIL`.

8. **Report before/after:**
   - Installed Engawa package versions (before and after)
   - `PUBLIC_RESOURCE_COUNT` (before and after)
   - `MIGRATION_REQUIRED` for this upgrade
   - Acceptance checklist results

9. **Do not merge or deploy automatically.**

If the target release requires a migration document, read and follow it completely before marking PASS.

---

# Prompt: Upgrade Engawa in this repository

Copy everything below into your coding agent.

---

Upgrade Engawa packages in this **existing** repository safely.

## Rules

1. **Inspect currently installed versions:**

   ```bash
   npm ls @thierry-gilgen-ict/engawa-core
   npm ls @thierry-gilgen-ict/engawa-discovery
   npm ls @thierry-gilgen-ict/engawa-mcp
   npm ls @thierry-gilgen-ict/engawa-react
   ```

2. **Read Engawa documentation:**
   - `docs/compatibility.md` — target `ENGAWA_RELEASE_SET`
   - `CHANGELOG.md` — `UPGRADE_IMPACT` for target versions
   - `docs/upgrading.md` — full upgrade sequence
   - `docs/migrations/README.md` — if `MIGRATION_REQUIRED = YES`

3. **Stop conditions:**
   - `BREAKING_CHANGE = YES` and `MIGRATION_GUIDE` missing or `NONE` → **STOP**
   - Cannot verify `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE` after upgrade → **STOP**

4. **Create an upgrade branch.** Update only necessary Engawa dependency pins to the target tested set. Use exact versions, not floating ranges.

5. **Preserve human-public source parity.** Do not expand the public corpus to "fix" upgrade issues.

6. **Run** site lint, typecheck, tests, and build.

7. **Run** the Engawa integration acceptance contract (`docs/integration-acceptance.md`).

8. **Report before/after:**
   - Installed Engawa package versions (before and after)
   - `PUBLIC_RESOURCE_COUNT` (before and after)
   - `MIGRATION_REQUIRED` for this upgrade
   - Acceptance checklist results

9. **Do not merge or deploy automatically.**

If the target release requires a migration document, read and follow it completely before marking PASS.

---

# Engawa Distribution Map

The Engawa Distribution Map is an **optional public showcase** for sites built with Engawa. Joining is a deliberate one-time action by the site operator. Engawa does **not** phone home, track visitors, or send adoption data from normal application runtime.

This document is the canonical policy and security contract for the Distribution Map registry. It is **not** [`engawa-analytics`](roadmap.md) and not telemetry.

| Field            | Value                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Package          | `@thierry-gilgen-ict/engawa-map@0.1.0` (npm)                                             |
| Public name      | Engawa Distribution Map                                                                  |
| CTA              | Join the map                                                                             |
| CLI              | Published npm CLI; defaults to production registry                                       |
| Registry backend | Production live at `https://engawa-map.thierry-gilgen-ict.ch`; staging remains for tests |
| Default state    | `NOT_REGISTERED`                                                                         |

There is no `distributionMap` field in `EngawaConfig` or `engawaConfigSchema`. Installing Engawa packages does not register a site.

## What it is

- Voluntary community listing of Engawa-powered public sites
- Public showcase for adoption visibility
- Independent from Engawa runtime packages (`engawa-core`, `engawa-discovery`, `engawa-mcp`, `engawa-react`)
- Operator-controlled opt-in only

## What it is not

- Telemetry or analytics
- Page-view or visitor collection
- MCP request tracking
- Prompt or BYA context forwarding
- Package-download inference
- Automatic discovery of Engawa sites
- Fingerprinting
- A requirement for correct Engawa integration

## Architecture boundary

The registry must be a **separate service and security boundary** from consumer websites.

```text
www.example.com
    -> normal website / public Engawa surfaces (/mcp, /llms.txt, BYA, HTML)

staging Engawa registry host (STAGING_REGISTRY_HOST)
    -> https://staging-engawa-map.thierry-gilgen-ict.ch (live, DM2B PASS)

production Engawa registry host (PRODUCTION_REGISTRY_HOST — live)
    -> https://engawa-map.thierry-gilgen-ict.ch (frozen in DM3A)

Each host:
    -> Distribution Map API
    -> public showcase (production v1)
    -> isolated registry persistence
```

| Invariant                            | Value                                             |
| ------------------------------------ | ------------------------------------------------- |
| `DEDICATED_REGISTRY_SERVICE`         | REQUIRED                                          |
| `STAGING_REGISTRY_HOST`              | `staging-engawa-map.thierry-gilgen-ict.ch` (live) |
| `PRODUCTION_REGISTRY_HOST`           | `engawa-map.thierry-gilgen-ict.ch` (live)         |
| Registry write API on main `www` app | FORBIDDEN                                         |

`REGISTRY_COMPROMISE_BLAST_RADIUS != MAIN_WEBSITE` — design for independent service boundaries. This does not claim perfect isolation, but the registry must not be a normal route inside the main website application.

## Out-of-band registration

```text
REGISTRATION_IS_OUT_OF_BAND = YES
MAP_REGISTRATION_FROM_RUNTIME = FORBIDDEN
NORMAL_BUILD_DEPLOY_DOES_NOT_IMPLY_REGISTRATION
```

**Allowed path (implemented):**

```text
developer machine
or explicitly configured dedicated CI registration job
    -> engawa-map CLI (@thierry-gilgen-ict/engawa-map@0.1.0 on npm)
    -> registry API (ENGAWA_MAP_ENDPOINT)
```

**Forbidden paths** — these must never call the registry API:

- Visitor HTTP requests
- MCP tools or `/mcp` handler
- `/llms.txt` or markdown generation
- React / Bring Your Agent mount or `onEvent`
- Next.js or application startup
- Normal build or deploy startup

If CI is used, wording must be: **manual or explicitly configured dedicated CI registration job** — not generic deploy-time registration.

Register command:

```bash
npm install --save-dev @thierry-gilgen-ict/engawa-map
npx engawa-map register
# Non-interactive deliberate registration:
npx engawa-map register --yes
# Defaults to https://engawa-map.thierry-gilgen-ict.ch when ENGAWA_MAP_ENDPOINT is unset
```

## Registration lifecycle

```text
NOT_REGISTERED
    -> explicit register
PENDING
    -> manual approval
LISTED
    -> unregister / moderation
DELISTED
```

| Rule                              | Value    |
| --------------------------------- | -------- |
| `FIRST_REGISTRATION_STATE`        | PENDING  |
| `FIRST_REGISTRATION_AUTO_PUBLISH` | NO       |
| `MANUAL_APPROVAL_V1`              | YES      |
| `DOMAIN_VERIFICATION_V1`          | DEFERRED |

An unauthenticated first registration cannot prove ownership of an arbitrary domain. Manual approval is the initial anti-abuse mechanism.

Future domain verification (deferred) may use `/.well-known/engawa-map.txt` or equivalent ownership proof in a **separate security phase**.

## Public payload

Example minimal registration body (illustrative):

```json
{
  "displayName": "Example Site",
  "canonicalUrl": "https://example.com",
  "packages": {
    "@thierry-gilgen-ict/engawa-core": "0.1.1"
  },
  "hints": {
    "framework": "nextjs",
    "byaEnabled": true,
    "localeCount": 2
  }
}
```

Rules:

- `displayName` and `canonicalUrl` — explicit, public, operator-supplied
- `packages` — detected Engawa package versions at registration time
- `hints` — optional, explicitly configured; not inferred from runtime telemetry

**Not collected by default:** Node version, operating system, IP address, User-Agent history as product data, hostname beyond canonical public URL, environment variables, git remote, repository URL, adapter contents, MCP queries, prompts, BYA context, analytics events, page views, user or session identifiers.

If abuse protection temporarily processes IP or User-Agent at the infrastructure layer, that is **short-lived operational abuse logging** — not part of the Distribution Map product dataset.

## Credential model

### Runtime invariants (future)

| Invariant                                | Value |
| ---------------------------------------- | ----- |
| `MAP_TOKEN_REQUIRED_AT_RUNTIME`          | NO    |
| `MAP_TOKEN_AVAILABLE_TO_WEBSITE_PROCESS` | NO    |
| `MAP_TOKEN_AVAILABLE_TO_MCP`             | NO    |
| `MAP_TOKEN_AVAILABLE_TO_REACT`           | NO    |

The map edit/unregister credential belongs only on:

- the operator machine local secret storage, or
- a dedicated explicit registry CI secret

**Preferred local storage (when implemented):** `.engawa-map.local.json` (must be gitignored)

**Alternative:** `ENGAWA_MAP_TOKEN` only in the environment executing the explicit registry CLI or dedicated registration job.

Committed `engawa-map.config.json` may contain non-secret `siteId` only. **Never** commit bearer or edit tokens (`EDIT_TOKEN_IN_COMMITTED_CONFIG = NO`).

### Server storage (future)

- Store `site_id` + `token_hash` only (`SITE_TOKEN_RAW_SERVER_STORAGE = NO`)
- `PLAINTEXT_EDIT_TOKEN_STORED_SERVER_SIDE = NO`
- `SITE_TOKEN_GENERATED_BY` = CLI — raw token never returned by server (`SITE_TOKEN_RAW_RETURNED_BY_SERVER = NO`)
- Bootstrap verifier via `Engawa-Map-Site-Token-Hash` header (`TOKEN_HASH_IS_AUTHENTICATION = NO`)
- `SITE_SCOPED_TOKEN = YES`
- `GLOBAL_SITE_EDIT_TOKEN = NO`
- `TOKEN_REVOCABLE_V1 = YES` — unregister or maintainer-assisted revocation
- `TOKEN_ROTATION_V1 = DEFERRED` — `TOKEN_ROTATABLE_FUTURE = YES`
- `UNREGISTER_REVOKES_SITE_TOKEN = YES` — `DELISTED_TOKEN_REMAINS_ACTIVE = NO`
- `SITE_ID_IS_AUTHENTICATION = NO` — the registry must not rely on UUID secrecy

### CLI authentication (future)

- `CLI_AUTH = BEARER_TOKEN`
- `REGISTRY_SITE_AUTH_USES_WEBSITE_SESSION = NO` — do not use the main website login cookie as registry credentials
- The CLI does not require browser CORS access to the registry API

## API trust model (conceptual — not implemented in DM0)

Illustrative security semantics for a future registry API:

| Surface                        | Access                                                                      |
| ------------------------------ | --------------------------------------------------------------------------- |
| `GET /api/v1/sites`            | Public, read-only                                                           |
| `POST /api/v1/sites`           | New registration; strict validation; rate limited; creates **PENDING only** |
| `PATCH /api/v1/sites/:siteId`  | Site bearer token required                                                  |
| `DELETE /api/v1/sites/:siteId` | Site bearer token required                                                  |
| `/admin/*`                     | Separate maintainer authentication                                          |

| Boundary               | Rule     |
| ---------------------- | -------- |
| `SITE_TOKEN_AUTHORITY` | ONE_SITE |
| `ADMIN_AUTHORITY`      | SEPARATE |

A compromised site token must **not** modify another site, list or approve another site, access private moderation data, access registry administration, or affect the main website.

If a browser-based dashboard is added later, its authentication model requires a separate security review. The registry API should not rely on permissive CORS for CLI operation.

## Registration endpoint security (future checklist)

The initial registration endpoint must require:

| Control              | Required                                   |
| -------------------- | ------------------------------------------ |
| `HTTPS_ONLY`         | YES                                        |
| `STRICT_JSON_SCHEMA` | YES                                        |
| `SMALL_BODY_LIMIT`   | YES (recommended ~8–16 KB eventual)        |
| `RATE_LIMIT`         | YES                                        |
| Unknown fields       | REJECT (`UNKNOWN_REQUEST_FIELDS = REJECT`) |

Eventual `canonicalUrl` rules:

- `https://` for production listing
- Canonical public hostname only
- Reject localhost, loopback, RFC1918/private, link-local, `.local`, embedded credentials, malformed URLs

No arbitrary user-defined metadata fields. Display names and all public text must be safely escaped in the future UI.

## SSRF rule (non-negotiable)

```text
REGISTER_REQUEST_REMOTE_FETCH = NO
```

When a user submits `canonicalUrl` on registration, the registry must **not** automatically request or fetch that URL.

This includes preventing requests to targets such as `127.0.0.1`, `localhost`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `::1`, and link-local or private infrastructure.

The registration service must not become an SSRF primitive.

Future domain verification that performs network requests requires a **separate security phase** with DNS/IP validation, private-address rejection, redirect controls, timeouts, response size limits, and scheme restrictions. That phase is not part of DM0.

## Persistence isolation

| Recommendation                                   | Value                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `REGISTRY_DATA_STORE_SEPARATE_FROM_MAIN_WEBSITE` | PREFERRED                                                          |
| `REGISTRY_ACCESS_TO_MAIN_WEBSITE_DB`             | NONE (unless a future architecture review explicitly changes this) |

Use separate database or schema, credentials, and service accounts with least-privilege permissions. The registry should not receive broad access to the main website content database.

## Failure isolation

```text
ENGAWA_MAP_FAILURE_MUST_NOT_AFFECT_SITE_RUNTIME = YES
WEBSITE_DEPENDENCY_ON_REGISTRY = NONE
REGISTRY_DEPENDENCY_ON_WEBSITE_RUNTIME = NONE
SITE_RUNTIME_DEPENDENCY_ON_MAP = NONE
```

A registry outage must **not** break:

- Any consuming Engawa website
- Site build or deployment
- Application startup
- `/mcp`, `/llms.txt`, markdown routes
- Bring Your Agent
- Public HTML routes

The only failed operation during a registry outage is the **explicitly invoked registry operation** itself (register, status, unregister).

## Revocation

CLI commands (implemented):

- `register`
- `status`
- `unregister`

Maintainers must provide a contact or removal path for operators who lose their edit credential.

## Privacy

Document operational facts only. Do not claim unsupported legal bases (e.g. GDPR lawful basis) without a reviewed privacy policy.

The production registry must publish its privacy notice before public production launch (see [DM3A contract](distribution-map-production-launch.md)).

Topics to cover in that notice: deliberate operator opt-in, exact public payload, public listing purpose, delisting mechanism, retention, and contact/removal path.

## DM1A contract (frozen for implementation)

DM0 policy remains authoritative. DM1A/DM2B implemented the CLI and staging registry; production launch is [DM3A](distribution-map-production-launch.md):

| Rule                                           | Value    |
| ---------------------------------------------- | -------- |
| `UNKNOWN_REQUEST_FIELDS`                       | REJECT   |
| `UNKNOWN_RESPONSE_FIELDS`                      | REJECT   |
| `ENGAWA_MAP_EXECUTES_APPLICATION_CODE`         | NO       |
| `API_REDIRECT_FOLLOWING`                       | NO       |
| `IDEMPOTENCY_REQUIRED_FOR_REGISTER`            | YES      |
| `SITE_TOKEN_GENERATED_BY`                      | CLI      |
| `IDEMPOTENCY_REPLAY_RETURNS_RAW_TOKEN`         | NO       |
| `TOKEN_ROTATION_V1`                            | DEFERRED |
| `UNREGISTER_REVOKES_SITE_TOKEN`                | YES      |
| `CANONICAL_URL_CHANGE_REQUIRES_REAPPROVAL`     | YES      |
| `ONE_NON_DELISTED_RECORD_PER_CANONICAL_ORIGIN` | YES      |
| `ENGAWA_CI_REGISTRY_NETWORK`                   | NO       |

Full contract: [distribution-map-api.md](distribution-map-api.md). Threat model: [distribution-map-threat-model.md](distribution-map-threat-model.md).

## Release status

```text
PRODUCTION_REGISTRY = LIVE
PRODUCTION_ACCEPTANCE = PASS
ENGAWA_MAP_NPM_PUBLICATION = @thierry-gilgen-ict/engawa-map@0.1.0
DM3C = CLOSED
DM3D = RELEASED
```

## Related

- [API and CLI contract (v1)](distribution-map-api.md) — frozen endpoints, schema, CLI behavior
- [Threat model](distribution-map-threat-model.md) — registry and CLI threats
- [Security model](security-model.md) — runtime boundaries and Distribution Map subsection
- [Roadmap](roadmap.md) — `@thierry-gilgen-ict/engawa-map` implemented in repo; [DM3A production launch contract](distribution-map-production-launch.md)
- [Agent integration playbook](agent-integration-playbook.md) — agents must not register without explicit user request

# Distribution Map — production launch contract (DM3A)

Design and freeze contract for production launch. **No production deployment in DM3A.** No npm publication. No domain verification.

## Current implementation status

| Item                         | Status                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `ENGAWA_MAP_CLI_IMPLEMENTED` | YES — monorepo `packages/map`; **not** on npm                                          |
| `REGISTRY_IMPLEMENTED`       | YES — [engawa-map-registry](https://github.com/thierry-gilgen-ict/engawa-map-registry) |
| `LIVE_STAGING`               | YES — `https://staging-engawa-map.thierry-gilgen-ict.ch`                               |
| `DM2B_STAGING_ACCEPTANCE`    | PASS (accepted SHA `61623df1422206d86fc0b4aee39e1f843440faa9`)                         |
| `PRODUCTION_REGISTRY`        | NO                                                                                     |
| `ENGAWA_MAP_NPM_PUBLICATION` | NO                                                                                     |
| `DOMAIN_VERIFICATION`        | DEFERRED                                                                               |

## Production hostname (frozen)

| Field                        | Value                                      |
| ---------------------------- | ------------------------------------------ |
| `PRODUCTION_REGISTRY_HOST`   | `engawa-map.thierry-gilgen-ict.ch`         |
| `PRODUCTION_REGISTRY_ORIGIN` | `https://engawa-map.thierry-gilgen-ict.ch` |

Staging remains:

```text
https://staging-engawa-map.thierry-gilgen-ict.ch
```

Security boundaries (unchanged):

```text
REGISTRY_WRITE_API_ON_MAIN_WEBSITE = FORBIDDEN
SITE_RUNTIME_DEPENDENCY_ON_REGISTRY = NONE
```

The production registry is a **separate product boundary** from `thierry-gilgen-ict.ch`, consumer Engawa sites, MCP, BYA, and normal website runtime.

## CLI production endpoint semantics (v1 public release)

**Current (DM3B):** If `ENGAWA_MAP_ENDPOINT` is unset, the CLI defaults to `https://engawa-map.thierry-gilgen-ict.ch`. Explicit override is still required for staging and loopback development.

**Implemented v1 public behavior (DM3B):**

```text
CLI_ENDPOINT_PRECEDENCE:
  1. explicit ENGAWA_MAP_ENDPOINT (if set)
  2. production default https://engawa-map.thierry-gilgen-ict.ch
```

| Override purpose           | Example                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| Staging                    | `ENGAWA_MAP_ENDPOINT=https://staging-engawa-map.thierry-gilgen-ict.ch` |
| Local dev / CI             | `ENGAWA_MAP_ENDPOINT=http://127.0.0.1:<port>` (loopback http only)     |
| Future compatible registry | explicit HTTPS origin only if deliberately supported                   |

Rules:

- HTTPS required for non-loopback endpoints (existing `validateRegistryEndpoint`).
- Default must **not** point at staging — operators must set staging explicitly.
- No accidental staging registration when env is unset after npm publish.

`CLI_DEFAULT_PRODUCTION_ENDPOINT = https://engawa-map.thierry-gilgen-ict.ch`
`CLI_ENDPOINT_OVERRIDE_SUPPORTED = YES`

## Public Distribution Map v1 — product model

The word **Map** means a **read-only public showcase/directory**, not a geographic map.

```text
GEOGRAPHIC_MAP = NO
GEOLOCATION_COLLECTION = NO
IP_GEOLOCATION = NO
DOMAIN_GEOLOCATION = NO
VISITOR_GEOLOCATION = NO
```

### Data source

```http
GET /api/v1/sites
```

Only `LISTED` sites appear on the public showcase. `PENDING` and `DELISTED` are never public.

### Visible fields (v1)

Limited to existing public registry fields — no new implicit metadata:

- `displayName`
- `canonicalUrl`
- Engawa package versions (from registration payload)
- Operator-supplied `hints` (e.g. framework, BYA enabled, locale count)

### Public page

URL: `https://engawa-map.thierry-gilgen-ict.ch/`

Character:

```text
simple, fast, public, read-only, accessible, responsive
no login, no cookies required, no tracking, no ads, no provider logos
```

Useful v1 functions (minimal):

- Site cards / list
- Search by display name
- Filter by explicit framework hint (if present)
- Filter BYA yes/no (if hint present)
- Package/version visibility
- Link to canonical site
- “Join the map” instructions (links to Engawa docs / CLI)

**Not in v1:** ratings, reviews, likes, comments, social accounts, user profiles, site analytics, popularity rankings, automatic screenshots, automatic crawling, geographic pins.

## Public UI architecture (frozen)

Preferred production edge layout:

```text
Traefik (80/443, TLS, rate limits, body limits)
    |
    +-- /  + static assets  -> public showcase (read-only frontend)
    |
    +-- /api/v1/*            -> registry API service
    +-- /healthz, /readyz  -> registry API service
```

Principles:

- Showcase is a **separate lightweight static/read-only frontend service** (not a general-purpose web app inside the API process).
- Same dedicated hostname (`engawa-map.thierry-gilgen-ict.ch`) — that hostname **is** the Distribution Map product.
- Showcase is **not** the main Thierry Gilgen ICT website and **not** consumer site runtime.
- Browser UI needs only public `GET` (list API + static assets). **No browser mutation flows in v1.**
- **No permissive CORS** for convenience — same-origin or static fetch to public API on same host; avoid `Access-Control-Allow-Origin: *`.

`PUBLIC_UI_MUTATIONS = NO`
`PUBLIC_UI_AUTH = NO`
`PUBLIC_UI_TRACKING = NO`

## Production infrastructure contract

Production is a **separate deployment** from staging.

```text
SEPARATE_PRODUCTION_VM = YES
SEPARATE_PRODUCTION_DATABASE = YES
SEPARATE_PRODUCTION_POSTGRES_VOLUME = YES
SEPARATE_PRODUCTION_ACME_STATE = YES
SEPARATE_PRODUCTION_ENV = YES
STAGING_DATA_COPIED_TO_PRODUCTION = NO
```

Rationale for separate VM: blast-radius separation, independent database, independent upgrades, clean operational boundary. **Do not provision in DM3A.**

Preserve DM2B hardening on production:

- Ubuntu 24.04 LTS, Docker, Traefik, PostgreSQL 18
- Explicit migrations (no app auto-migrate)
- Registry: non-root, read-only FS, no-new-privileges, cap_drop ALL
- No public 3000 / 5432
- TLS ≥ 1.2, security headers, no Traefik access logs, bounded Docker logs
- Edge + application rate limits and body limits (16 KB)
- Backup + restore test + systemd backup timer

Production deploy artifacts and `deploy/production/` layout are **DM3B** scope.

## Privacy notice contract (pre-launch requirement)

Before public production launch, publish a privacy notice on the production hostname covering:

| Topic                  | Accurate v1 statement                                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voluntary registration | Operator-initiated CLI registration only                                                                                                                                                                                                                                              |
| Public listing purpose | Community showcase of Engawa-powered public sites                                                                                                                                                                                                                                     |
| Public fields          | Exact registry fields listed above                                                                                                                                                                                                                                                    |
| Lifecycle              | `PENDING` → manual approval → `LISTED`; delist → `DELISTED`                                                                                                                                                                                                                           |
| Token model            | Site-scoped bearer token generated and retained client-side (`.engawa-map.local.json` or `ENGAWA_MAP_TOKEN` for dedicated CI); registration sends only SHA-256 hash; server stores hash only and never returns the raw token; CLI does not print the raw token on successful register |
| Public visibility      | Until delisted (`LISTED` or `PENDING` on non-public status endpoints only)                                                                                                                                                                                                            |
| After delisting        | Record becomes non-public immediately; `token_hash` revoked (`NULL`); non-secret `DELISTED` row remains in registry DB under v1 retention policy until maintainer deletion — **not** hard-deleted by `unregister`                                                                     |
| Delisting / removal    | Operator `unregister` (token required) or maintainer contact for lost-token / abuse cases                                                                                                                                                                                             |
| Abuse                  | Operational rate limits; manual moderation                                                                                                                                                                                                                                            |
| Visitor telemetry      | **None** — no page views, MCP queries, prompts, BYA context                                                                                                                                                                                                                           |
| Crawling               | **No** automatic website crawling or canonical URL fetch                                                                                                                                                                                                                              |

Do not claim unsupported GDPR/legal conclusions in DM3A.

```text
SITE_TOKEN_RAW_SERVER_STORAGE = NO
SITE_TOKEN_RAW_RETURNED_BY_SERVER = NO
RAW_TOKEN_PRINTED_ON_REGISTER = NO
DELIST_IS_HARD_DELETE = NO
```

Bounded hard-deletion retention periods are **not** defined in DM3A. If production requires a numeric policy, record it as an explicit pre-production decision in DM3B/DM3C — do not imply `unregister` erases the database row.

### Removal / contact path (recommended)

| Channel                                                                     | Use                                                                                               |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Operator self-service                                                       | `engawa-map unregister` with site token                                                           |
| Security-sensitive reports; private ownership, removal, or identity details | **info@thierry-gilgen-ict.ch** (existing [SECURITY.md](../SECURITY.md) channel)                   |
| Non-sensitive public bug or abuse reports                                   | GitHub issues on [engawa-map-registry](https://github.com/thierry-gilgen-ict/engawa-map-registry) |

Do **not** post secrets, site bearer tokens, identity evidence, or sensitive abuse/security details in public GitHub issues.

`PRIVATE_SECURITY_REMOVAL_CONTACT = info@thierry-gilgen-ict.ch`
`PUBLIC_ISSUES_SENSITIVE_DATA_WARNING = YES`

## Moderation model (v1 — unchanged)

```text
FIRST_REGISTRATION_STATE = PENDING
FIRST_REGISTRATION_AUTO_PUBLISH = NO
MANUAL_APPROVAL_V1 = YES
DOMAIN_VERIFICATION_V1 = DEFERRED
```

No admin HTTP API. No browser admin dashboard. Production moderation via server-side admin CLI on the registry host (same as staging).

### Production moderation runbook (operator)

1. **Inspect pending** — query DB or admin tooling for `PENDING` registrations
2. **Approve** — `approve <siteId>` → `LISTED`, visible on public API and showcase
3. **Delist** — `delist <siteId>` → `DELISTED`, hidden from public list, token revoked
4. **Lost token** — maintainer delist after identity verification via contact path
5. **Abuse** — delist, rate limits, block at edge; no public admin UI

Do not expose registry secrets in logs or tickets.

## Production acceptance gates (DM3C checklist)

DM3A defines gates only — **no PASS claimed here.**

### Infrastructure

- [ ] DNS `A` for `engawa-map.thierry-gilgen-ict.ch`
- [ ] TLS valid; HTTP → HTTPS redirect
- [ ] Security headers (CSP, HSTS, nosniff, frame deny)
- [ ] Public 80/443 only; 3000 and 5432 closed externally
- [ ] Separate production VM, DB, volumes, ACME state, `.env`
- [ ] Postgres 18 data dir `/var/lib/postgresql/18/docker`
- [ ] Migration explicit; persistence verified
- [ ] Backup, restore test, systemd backup timer active

### API and showcase

- [ ] `healthz` / `readyz` HTTPS
- [ ] Public API LISTED-only on `GET /api/v1/sites`
- [ ] Public showcase renders LISTED sites only
- [ ] No permissive CORS

### Unpublished release-candidate CLI (DM3C — before npm publication)

Production acceptance uses an **unpublished** Engawa release candidate — not the published npm package.

```text
DM3C_CLI_SOURCE = exact Engawa DM3B/DM3C reviewed commit
DM3C_CLI_PACKAGING = local build / pnpm pack / equivalent release-candidate artifact
DM3C_CLI_NPM_PUBLICATION = NO
DM3C_DEFAULT_ENDPOINT_TEST = production origin with no ENGAWA_MAP_ENDPOINT override
```

Flow to prove against live production:

```text
unpublished release-candidate CLI
    -> default production endpoint (no ENGAWA_MAP_ENDPOINT)
    -> register --yes -> PENDING
    -> status -> PENDING
    -> unregister
    -> old token -> 401
    -> local secret removed; siteId removed from engawa-map.config.json
```

- [ ] Unpublished release-candidate CLI: default production endpoint (no `ENGAWA_MAP_ENDPOINT`)
- [ ] `register --yes` → `PENDING`
- [ ] `status` → `PENDING`
- [ ] `unregister` → old token `401`, local secret removed

### DM3D — published npm smoke (after DM3C PASS)

- [ ] `npm publish @thierry-gilgen-ict/engawa-map@0.1.0`
- [ ] Fresh external `npm install` against production registry
- [ ] Published-package CLI smoke (default endpoint, register/status/unregister)
- [ ] Public documentation updated; announce “Join the map”

### Manual moderation

- [ ] `PENDING` → approve → `LISTED` → visible on API + UI
- [ ] `LISTED` → delist → hidden on API + UI; old token `401`

### Edge and resilience

- [ ] Rate limit → `429` (bounded test)
- [ ] Body limit → rejection (e.g. `413`)
- [ ] Registry restart → `readyz` PASS
- [ ] Postgres restart → data persisted
- [ ] Token revocation persists across restart

### Security audit

- [ ] No raw token / Authorization / DATABASE_URL in logs
- [ ] No request payload logging
- [ ] Registry outage does not affect Engawa consumer sites

## Release sequence (frozen)

```text
DM3A  — production contract / design / docs (this document)
DM3B  — public showcase UI, production deploy artifacts, CLI default endpoint, CI/runtime smoke
DM3C  — provision production VM, DNS/TLS, deploy, full live production acceptance, first controlled listing
DM3D  — publish @thierry-gilgen-ict/engawa-map@0.1.0, public docs, external npm smoke, announce "Join the map"
```

```text
NPM_PUBLICATION_BEFORE_PRODUCTION_ACCEPTANCE = NO
```

Do not publish the CLI until production has passed DM3C acceptance.

## Explicitly deferred (outside DM3)

OAuth, authenticated MCP tools, user accounts, browser admin UI, domain verification, token rotation, telemetry, analytics, `engawa-analytics`, geolocation, automatic crawling, screenshots, provider integrations, `engawa-nextjs`.

## DM3B implementation status

CLI_DEFAULT_PRODUCTION_ENDPOINT = IMPLEMENTED
PRODUCTION_SHOWCASE = IMPLEMENTED_IN_REPO (registry)
PRODUCTION_DEPLOY_ARTIFACTS = IMPLEMENTED_IN_REPO (registry)
PRODUCTION_DEPLOYMENT = NOT_YET
NPM_PUBLICATION = NO

## Related documents

- [distribution-map.md](distribution-map.md) — policy and lifecycle
- [distribution-map-api.md](distribution-map-api.md) — frozen v1 API contract
- [distribution-map-threat-model.md](distribution-map-threat-model.md) — threats
- Registry [staging runbook](https://github.com/thierry-gilgen-ict/engawa-map-registry/blob/main/docs/staging-deployment.md) — staging reference
- Registry [production deployment design](https://github.com/thierry-gilgen-ict/engawa-map-registry/blob/main/docs/production-deployment.md) — DM3B target

# Distribution Map API and CLI contract (v1)

This document freezes the **future registry API** and **engawa-map CLI** behavior for implementation review. It is a contract, not implementation.

| Field             | Value                                            |
| ----------------- | ------------------------------------------------ |
| Package (planned) | `@thierry-gilgen-ict/engawa-map`                 |
| CLI status        | **PLANNED** — not functional in current releases |
| Registry host     | `REGISTRY_HOST = TO_BE_ANNOUNCED`                |
| API version       | `/api/v1`                                        |

Canonical policy remains in [distribution-map.md](distribution-map.md). Threat analysis is in [distribution-map-threat-model.md](distribution-map-threat-model.md).

DM0 invariants are authoritative. This contract **tightens** where noted and does not weaken them.

## Base endpoint

Production registry host is not decided. Do not invent or publish a dead endpoint (e.g. `map.engawa.dev`).

Paths are frozen independently of host:

```text
{REGISTRY_HOST}/api/v1/...
```

Future CLI endpoint selection:

| Source                | Use                                      |
| --------------------- | ---------------------------------------- |
| `ENGAWA_MAP_ENDPOINT` | Primary override for staging/development |
| Future `--endpoint`   | Optional later; env is enough for v1     |

| Rule                           | Value |
| ------------------------------ | ----- |
| `ENDPOINT_HTTPS_ONLY` (prod)   | YES   |
| `INSECURE_REMOTE_HTTP_ALLOWED` | NO    |
| Credentials in endpoint URL    | NO    |

Insecure `http://` permitted **only** for loopback development when an explicit development/test mode is active:

- `http://127.0.0.1`
- `http://localhost`
- `http://[::1]`

`http://arbitrary-remote-host` is forbidden.

## API surface (v1)

### Public list

```http
GET /api/v1/sites
```

| Property | Value                           |
| -------- | ------------------------------- |
| Auth     | None                            |
| Purpose  | Public Distribution Map listing |

Returns **only** `LISTED` sites. Never returns `PENDING`, `DELISTED`, credentials, or moderation metadata. Public and read-only.

Must be paginated (see [Pagination](#pagination)).

### Register

```http
POST /api/v1/sites
```

| Property                   | Value                           |
| -------------------------- | ------------------------------- |
| Auth on first registration | `NONE_ON_FIRST_REGISTRATION`    |
| Creates state              | `PENDING` only — never `LISTED` |
| Success status             | `201 Created`                   |

Successful first registration returns:

- `siteId`
- current state (`PENDING`)
- one newly issued site-scoped edit token (returned **once** at creation)
- timestamps as required by the response schema

The edit token is returned because the registrant needs a credential to manage the pending record. It must **not** be returned again by normal status or list calls.

**Headers (registration):**

| Header                      | Required    | Purpose                                                          |
| --------------------------- | ----------- | ---------------------------------------------------------------- |
| `Idempotency-Key`           | YES         | Safe retry after lost response (see [Idempotency](#idempotency)) |
| `Engawa-Map-Client-Version` | Recommended | Protocol compatibility metadata — not public listing data        |

### Protected status

```http
GET /api/v1/sites/:siteId/status
Authorization: Bearer <site-token>
```

Purpose: `engawa-map status` — operator-visible record with `PENDING` / `LISTED` / `DELISTED` state. No admin or moderation secrets.

### Update

```http
PATCH /api/v1/sites/:siteId
Authorization: Bearer <site-token>
```

May update only fields belonging to that site. A site token **cannot**:

- alter approval status directly
- modify another site's record
- change moderation metadata
- change administrative fields

| Rule                                       | Value |
| ------------------------------------------ | ----- |
| `CANONICAL_URL_CHANGE_REQUIRES_REAPPROVAL` | YES   |

If `canonicalUrl` changes meaningfully, status returns to `PENDING` and public listing ends until re-approved.

### Unregister

```http
DELETE /api/v1/sites/:siteId
Authorization: Bearer <site-token>
```

Result: `DELISTED`. Hard synchronous deletion is not the v1 API operation. Public listing must disappear immediately or effectively immediately. Retention and deletion policy belongs to the future registry privacy notice.

Success status: `204 No Content` (or `200` with final state if the contract requires a body — pick one at implementation and use consistently; recommended: `204`).

## Registration payload schema

Minimal v1 body:

```json
{
  "displayName": "Example Site",
  "canonicalUrl": "https://example.com",
  "packages": {
    "@thierry-gilgen-ict/engawa-core": "0.1.1",
    "@thierry-gilgen-ict/engawa-discovery": "0.1.1",
    "@thierry-gilgen-ict/engawa-mcp": "0.1.1",
    "@thierry-gilgen-ict/engawa-react": "0.1.0"
  },
  "hints": {
    "framework": "nextjs",
    "byaEnabled": true,
    "localeCount": 2
  }
}
```

| Rule                     | Value                                            |
| ------------------------ | ------------------------------------------------ |
| `STRICT_REQUEST_SCHEMA`  | YES                                              |
| `UNKNOWN_REQUEST_FIELDS` | REJECT                                           |
| `hints`                  | Optional object; individual hint fields optional |
| Arbitrary metadata bag   | FORBIDDEN                                        |

Future Zod validation must use strict mode (e.g. `.strict()`). Do not silently accept unrecognized keys.

`--dry-run` output must equal the live registration payload (`DRY_RUN_EXACT_PAYLOAD = YES`) via shared serialization — no separate dry-run builder.

### No CLI-machine metadata in public payload

The v1 public registration payload must **not** automatically add:

- `nodeVersion`, `operatingSystem`, `hostname`, `username`
- IP, User-Agent
- `gitRemote`, `repositoryURL`, `packageManager`, `workingDirectory`
- `environmentVariables`

If protocol compatibility needs engawa-map CLI version, send it separately (e.g. `Engawa-Map-Client-Version` header). Do not put CLI version in the public listing response.

| Rule                        | Value |
| --------------------------- | ----- |
| `ENGAWA_MAP_VERSION_PUBLIC` | NO    |

### Package version map (`packages`)

v1 allowed keys only:

- `@thierry-gilgen-ict/engawa-core`
- `@thierry-gilgen-ict/engawa-discovery`
- `@thierry-gilgen-ict/engawa-mcp`
- `@thierry-gilgen-ict/engawa-react`

`@thierry-gilgen-ict/engawa-map` is registry-client tooling — not agent-facing website capability. Unknown `@thierry-gilgen-ict/engawa-*` names must not silently enter the public payload until this contract is updated.

Each value must be an exact installed version string (e.g. `0.1.1`), not a range like `^0.1.1`.

### Hints (`hints`)

Optional, intentionally small:

| Field         | Type    | Notes                                                     |
| ------------- | ------- | --------------------------------------------------------- |
| `framework`   | string  | Optional                                                  |
| `byaEnabled`  | boolean | Optional                                                  |
| `localeCount` | integer | Optional; minimum 1; reasonable maximum at implementation |

No `Record<string, unknown>`. Do not infer locale count by scanning website content. Hints come from explicit configuration or deterministic allowed metadata only.

| Rule                               | Value |
| ---------------------------------- | ----- |
| `OPTIONAL_HINTS_ARE_NOT_TELEMETRY` | YES   |

## Canonical URL contract

Validation uses a real URL parser. **No DNS lookup. No HTTP requests.**

| Rule                                            | Value |
| ----------------------------------------------- | ----- |
| `CANONICAL_URL_HTTPS_ONLY` (production listing) | YES   |
| `CANONICAL_URL_NETWORK_LOOKUP`                  | NO    |
| `URL_VALIDATION_PERFORMS_NETWORK_LOOKUP`        | NO    |

Treat a Distribution Map entry as a **site origin**, not an arbitrary page URL.

Production requirements:

| Field    | Rule                                   |
| -------- | -------------------------------------- |
| Scheme   | `https`                                |
| Username | forbidden                              |
| Password | forbidden                              |
| Query    | forbidden                              |
| Fragment | forbidden                              |
| Path     | `/` (recommended normalization target) |

Normalization (recommended):

- lowercase hostname
- remove default HTTPS port (`:443`)
- normalize trailing slash consistently

Do not create separate listings for `https://example.com` and `https://example.com/`.

Reject hostname forms unsafe as public canonical origins:

- `localhost`, `.local`
- loopback IP literals
- RFC1918 / private IPv4 literals
- link-local IPv4 literals
- IPv6 loopback, private, and link-local literals
- embedded credentials

A hostname resolving to private infrastructure cannot be established without DNS resolution — that belongs to a **future verification security phase**, not DM1/DM1A.

## Duplicate-domain handling

| Rule                                           | Value |
| ---------------------------------------------- | ----- |
| `ONE_NON_DELISTED_RECORD_PER_CANONICAL_ORIGIN` | YES   |

Do not allow unlimited duplicate `PENDING` records for one canonical origin. Do not let an attacker permanently squat another person's domain by overwriting existing credentials.

Requirements:

- duplicate active/pending registration must **not** overwrite existing credentials
- API must **not** reveal the existing site's token or private metadata
- maintainers can resolve/reject stale or abusive pending claims
- future domain verification is the strong ownership mechanism

Conflict response:

```http
409 Conflict
```

```json
{
  "error": {
    "code": "CANONICAL_URL_ALREADY_REGISTERED",
    "message": "The canonical URL already has an active registration."
  }
}
```

Do not leak sensitive information about the existing registrant.

## Idempotency

| Rule                                | Value |
| ----------------------------------- | ----- |
| `IDEMPOTENCY_REQUIRED_FOR_REGISTER` | YES   |

`POST /api/v1/sites` requires:

```http
Idempotency-Key: <random UUID>
```

Server returns the same semantic first-registration result for the same key within a bounded retention window.

The idempotency key is **not** authentication. Do not expose another site's result based solely on an idempotency key. Backend must bind idempotency records to the registration attempt semantics (payload hash or equivalent safeguards).

Scenario: POST succeeds on server, network response is lost, CLI does not receive site token — idempotency makes intentional retry safe.

## Token model

Future site edit tokens:

| Rule                   | Value       |
| ---------------------- | ----------- |
| `CRYPTOGRAPHIC_RANDOM` | YES         |
| `SITE_TOKEN_ENTROPY`   | >= 256 bits |
| `SITE_TOKEN_SCOPED`    | YES         |
| Bearer                 | YES         |
| `TOKEN_SERVER_STORAGE` | HASH_ONLY   |
| `SITE_ID_IS_AUTH`      | NO          |

Use a cryptographically secure generator (e.g. Node `crypto.randomBytes()` when implemented).

**Never use:** UUID alone, `Math.random()`, siteId-derived token, predictable token.

Server stores only a hash (`PLAINTEXT_EDIT_TOKEN_STORED_SERVER_SIDE = NO`). SHA-256 is acceptable for lookup/comparison of high-entropy secrets unless a stronger construction is chosen at implementation.

Require constant-time secret comparison where applicable. Never log raw bearer tokens.

Never place token in: URL, query string, error message, public response after issuance, analytics, normal CLI logs.

### Rotation and revocation

| Rule                               | Value |
| ---------------------------------- | ----- |
| `TOKEN_ROTATABLE`                  | YES   |
| `TOKEN_REVOCABLE`                  | YES   |
| `OLD_TOKEN_INVALID_AFTER_ROTATION` | YES   |

Rotation atomically: create new token, replace hash, invalidate previous token. Do not support multiple indefinite edit tokens per site in v1 unless a future requirement explicitly adds that.

Lost-token recovery is **not** "send token by email" unless a future identity system is deliberately designed. v1: maintainer-assisted removal/recovery is acceptable.

Optional future CLI: `engawa-map token rotate` — not required for first implementation.

## Local credential model

| Rule                             | Value     |
| -------------------------------- | --------- |
| `TOKEN_IN_COMMITTED_CONFIG`      | NO        |
| `TOKEN_IN_CLI_ARGUMENT`          | FORBIDDEN |
| `EDIT_TOKEN_IN_COMMITTED_CONFIG` | NO        |

Committed `engawa-map.config.json` may contain non-secret `siteId` only:

```json
{
  "siteId": "..."
}
```

Preferred local secret file: `.engawa-map.local.json` (gitignored).

Future CLI must:

- never commit the secret file
- document it as secret
- ensure `.gitignore` excludes it before writing
- refuse or warn strongly if Git reports the file as tracked
- write atomically
- use restrictive permissions where supported (`0600` on POSIX where feasible)

Windows: do not pretend POSIX `0600` semantics exist. Rely on local filesystem/account ACL and document the limitation (`WINDOWS_SECRET_FILE_LIMITATION_DOCUMENTED = YES`).

Alternative: `ENGAWA_MAP_TOKEN` for dedicated CI jobs.

### Secret precedence

Deterministic lookup (highest wins):

```text
ENGAWA_MAP_TOKEN
    >
.engawa-map.local.json
```

No `--token` flag in v1 — shell history and process-list exposure. No command-line token argument.

## No application code execution

| Rule                                   | Value |
| -------------------------------------- | ----- |
| `ENGAWA_MAP_EXECUTES_APPLICATION_CODE` | NO    |
| `DOTENV_SCAN`                          | NO    |

The CLI may read only explicitly allowed **static** inputs:

- nearest relevant `package.json`
- `engawa-map.config.json`
- `.engawa-map.local.json`
- documented environment variables (`ENGAWA_MAP_TOKEN`, `ENGAWA_MAP_ENDPOINT`)

The CLI must **not**:

- import `engawa.config.ts` or application Engawa config modules
- import Next.js config
- execute TS/JS config
- load arbitrary app modules
- scan `.env`
- inspect adapter source
- inspect application database

## Package version detection

Future CLI discovers Engawa versions from the consumer project:

1. Locate relevant `package.json`
2. Identify declared `@thierry-gilgen-ict/engawa-*` packages
3. Resolve installed package metadata where possible (e.g. `node_modules` package.json version)
4. Report actual installed version
5. Never execute package code to discover version

| Rule                        | Value |
| --------------------------- | ----- |
| `VERSION_RANGE_FABRICATION` | NO    |

If resolution is ambiguous or package is not installed: `VERSION_DETECTION_UNKNOWN` — fail registration preview or require explicit operator correction. Do not fabricate a version from `^0.1.1`.

## CLI commands (v1)

Required:

- `engawa-map register`
- `engawa-map status`
- `engawa-map unregister`

Optional future (not required for first implementation):

- `engawa-map update`
- `engawa-map token rotate`

## `register` UX

Flow:

1. Load static config
2. Detect Engawa versions
3. Validate locally
4. Construct exact payload
5. Print exact payload
6. Ask explicit confirmation
7. Network request
8. Store `siteId` + credential securely
9. Print result

Example confirmation (default **NO**):

```text
Engawa Distribution Map — optional opt-in

You are about to register this public site:

Name:     Example Site
URL:      https://example.com
Packages:
  @thierry-gilgen-ict/engawa-core 0.1.1
  @thierry-gilgen-ict/engawa-mcp  0.1.1

Optional hints:
  framework: nextjs
  BYA:       true
  locales:   2

This sends only the payload shown above.
No visitor tracking. No runtime telemetry.

Initial listing state: PENDING.

Proceed? [y/N]
```

| Rule                       | Value |
| -------------------------- | ----- |
| `REGISTER_CONFIRM_DEFAULT` | NO    |

### Non-interactive confirmation

| Rule                                   | Value               |
| -------------------------------------- | ------------------- |
| `NON_INTERACTIVE_REGISTER_WITHOUT_YES` | FAIL_BEFORE_NETWORK |

When no TTY is available and confirmation has not been bypassed, fail closed before any network call.

`--yes` is an explicit confirmation bypass only. It must **not** relax: payload validation, TLS, authentication, URL rules, or schema rules.

### `--dry-run`

```bash
engawa-map register --dry-run
```

| Rule                    | Value |
| ----------------------- | ----- |
| `DRY_RUN_NETWORK_CALLS` | ZERO  |
| `DRY_RUN_WRITES`        | ZERO  |
| `DRY_RUN_EXACT_PAYLOAD` | YES   |

Shows exact JSON request body that would be sent. May also display resolved endpoint, method, public payload, whether authentication is used — never raw secrets.

## Network client behavior

### Redirects

| Rule                     | Value |
| ------------------------ | ----- |
| `API_REDIRECT_FOLLOWING` | NO    |

For registration, update, delete, and authenticated requests: use `redirect: "error"` or equivalent. Do not allow a trusted registry endpoint to redirect bearer-authenticated requests to another host.

Safest v1: no API redirect following on any map client request.

### Timeout

| Rule              | Value                                     |
| ----------------- | ----------------------------------------- |
| `REQUEST_TIMEOUT` | 10 seconds (recommended initial contract) |

Use abort/cancellation. Timeout produces a clear machine error.

### Retry

| Rule                  | Value |
| --------------------- | ----- |
| `REGISTER_AUTO_RETRY` | NO    |
| `PATCH_AUTO_RETRY`    | NO    |
| `DELETE_AUTO_RETRY`   | NO    |
| `MUTATION_AUTO_RETRY` | NO    |

Idempotency makes manual retry of first registration safe. On network failure, guide the operator to run `engawa-map status` or retry intentionally.

### Malicious registry responses

CLI treats all server responses as untrusted input. See [distribution-map-threat-model.md](distribution-map-threat-model.md).

| Rule                         | Value  |
| ---------------------------- | ------ |
| `STRICT_RESPONSE_SCHEMA`     | YES    |
| `UNKNOWN_RESPONSE_FIELDS`    | REJECT |
| `RESPONSE_SIZE_BOUND`        | YES    |
| `REMOTE_CODE_EXECUTION`      | NO     |
| `SERVER_SUPPLIED_PATH_WRITE` | NO     |

Never: execute returned commands, execute JavaScript, import remote modules, write arbitrary server-provided paths, follow arbitrary returned URLs, print unescaped terminal control characters, trust `siteId` without schema validation, accept oversized bodies.

### Terminal output safety

Server-provided values (e.g. `displayName`) may contain untrusted text. Sanitize or safely render control characters. Do not interpolate raw server error bodies. Use bounded textual error messages. Do not print arbitrary HTML or server bodies.

## Error contract

Machine-readable errors:

```json
{
  "error": {
    "code": "CANONICAL_URL_ALREADY_REGISTERED",
    "message": "The canonical URL already has an active registration."
  }
}
```

`code` drives CLI behavior. `message` is human-readable.

Initial error codes:

| Code                               | Typical use                                   |
| ---------------------------------- | --------------------------------------------- |
| `INVALID_REQUEST`                  | Schema or validation failure                  |
| `INVALID_CANONICAL_URL`            | URL rules violated                            |
| `CANONICAL_URL_ALREADY_REGISTERED` | Duplicate origin conflict                     |
| `RATE_LIMITED`                     | Rate limit exceeded                           |
| `UNAUTHORIZED`                     | Missing/invalid bearer token                  |
| `SITE_NOT_FOUND`                   | Site does not exist or not visible to caller  |
| `SITE_DELISTED`                    | Operation on delisted site                    |
| `IDEMPOTENCY_CONFLICT`             | Idempotency key reused with different payload |
| `INTERNAL_ERROR`                   | Unexpected registry error                     |

Do not expose: stack traces, SQL/database errors, token hashes, internal paths, infrastructure details.

## HTTP semantics

| Status | Meaning                                              |
| ------ | ---------------------------------------------------- |
| `200`  | Successful read or update                            |
| `201`  | First registration created (`PENDING`)               |
| `202`  | Optional if approval processing semantics require it |
| `204`  | Unregister succeeded                                 |
| `400`  | Invalid request                                      |
| `401`  | Missing/invalid bearer token                         |
| `404`  | Resource unavailable / not found                     |
| `409`  | Duplicate / conflict                                 |
| `413`  | Body too large                                       |
| `429`  | Rate limited                                         |
| `500`  | Unexpected registry error                            |
| `503`  | Registry temporarily unavailable                     |

Registration success convention: `POST /api/v1/sites` → `201 Created`, state `PENDING`.

## Rate limits

Backend enforces limits independently of CLI behavior. At minimum, separately rate limit:

- unauthenticated register
- authenticated mutations
- public list / status as appropriate

`429` should include `Retry-After` where practical. Do not identify or permanently track people merely to implement rate limiting. Infrastructure short-lived abuse signals remain separate from product data.

| Rule                  | Value |
| --------------------- | ----- |
| `RATE_LIMIT_REQUIRED` | YES   |

## Body and response limits

| Rule                           | Value                |
| ------------------------------ | -------------------- |
| `REQUEST_BODY_LIMIT_REQUIRED`  | YES                  |
| Registration request max       | <= 16 KB recommended |
| `RESPONSE_SIZE_BOUND_REQUIRED` | YES                  |
| `PUBLIC_LIST_PAGINATED`        | YES                  |

`GET /api/v1/sites` must not return unbounded registry data.

### Pagination

Conceptual v1 parameters: `limit`, `cursor`, with a conservative maximum `limit`. Do not freeze complex pagination beyond v1 needs.

## Config file contract

`engawa-map.config.json` — static JSON only:

```json
{
  "displayName": "Example Site",
  "canonicalUrl": "https://example.com",
  "siteId": "optional-after-registration",
  "hints": {
    "framework": "nextjs",
    "byaEnabled": true,
    "localeCount": 2
  }
}
```

Do not add `enabled: true` — there is no background process to enable.

| Rule                             | Value |
| -------------------------------- | ----- |
| `CONFIG_FILE_PRESENCE_REGISTERS` | NO    |

Registration happens only when the operator invokes `engawa-map register` and confirms.

## CLI failure semantics

Site/runtime is fail-open (never depends on registry). The explicitly invoked CLI should not hide failure.

| Operation            | Default exit |
| -------------------- | ------------ |
| `register` failure   | non-zero     |
| `status` failure     | non-zero     |
| `unregister` failure | non-zero     |

Future explicit non-blocking option for dedicated CI (e.g. `ENGAWA_MAP_SKIP_ON_ERROR=1` or `--non-blocking`) — **not** part of DM1A implementation.

| Rule                                    | Value   |
| --------------------------------------- | ------- |
| `NORMAL_CLI_FAILURE_EXIT`               | NONZERO |
| `NON_BLOCKING_REQUIRES_EXPLICIT_OPT_IN` | YES     |

Normal website builds remain unaffected because they never invoke the CLI.

## No live network in Engawa CI

| Rule                         | Value |
| ---------------------------- | ----- |
| `ENGAWA_CI_REGISTRY_NETWORK` | NO    |

Future package tests must use injected/mock fetch, local test server, fixtures, fake tokens, fake endpoints. Never hit production or staging registry from normal unit/integration CI.

A later separately authorized end-to-end staging smoke may exist outside required normal CI.

## Registry deployment requirements (DM2 — not implemented)

Future registry must have: dedicated service/process, dedicated DB credentials, least privilege, HTTPS, edge rate limits, request-body limits, security headers for public dashboard, separate admin auth, no main website session reuse, secrets via deployment secret management, no secrets in repository, appropriate backups, privacy/removal contact, operational logging without product telemetry.

Dedicated registry service may share physical server with other services if **service/network/credential isolation** exists. Do not falsely claim separate physical infrastructure is required.

## Related

- [Distribution Map policy](distribution-map.md)
- [Threat model](distribution-map-threat-model.md)
- [Security model](security-model.md)
- [Roadmap](roadmap.md)

# Distribution Map threat model

Threat analysis for the planned `@thierry-gilgen-ict/engawa-map` CLI and dedicated registry service. Policy: [distribution-map.md](distribution-map.md). API contract: [distribution-map-api.md](distribution-map-api.md).

DM1A is the first Engawa component **intentionally capable of outbound network requests**. This boundary requires review before implementation.

## Trust zones

Three distinct zones:

```text
1. consumer CLI (operator machine / dedicated CI job)
2. registry public + site API
3. registry maintainer / admin
```

| Boundary                                        | Rule                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `SITE_TOKEN_AUTHORITY`                          | ONE_SITE_ONLY                                                                                         |
| `ADMIN_AUTHORITY`                               | SEPARATE_AUTHENTICATION                                                                               |
| Compromised site token                          | Must not grant admin access                                                                           |
| Compromised registry service                    | Must not have credentials for www, main website DB, main website deployment, or consumer Engawa sites |
| `REGISTRY_SERVICE_HAS_MAIN_WEBSITE_CREDENTIALS` | NO                                                                                                    |

## Threat matrix

| Threat                               | Mitigation                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Silent telemetry                     | No runtime integration; opt-in only; `PHONE_HOME = NO`                                           |
| Accidental registration              | Explicit `engawa-map register` + confirmation default NO                                         |
| CI accidental consent                | Dedicated registration job only; `--yes` required without TTY                                    |
| Credential leak in git               | Local secret file + env only; `TOKEN_IN_COMMITTED_CONFIG = NO`                                   |
| Token leak in logs                   | Redaction; never log raw bearer tokens                                                           |
| Token theft                          | Site-scoped bearer; v1 revocation via unregister/maintainer; `TOKEN_ROTATION_V1 = DEFERRED`      |
| UUID guessing                        | `SITE_ID_IS_AUTH = NO`                                                                           |
| Cross-site modification              | Authorization by site-scoped token only                                                          |
| Domain squatting                     | `PENDING` first; manual approval v1; future verification                                         |
| Duplicate registration               | `ONE_NON_DELISTED_RECORD_PER_ORIGIN`; `409` without metadata leak                                |
| Registry SSRF on register            | `REGISTER_REQUEST_REMOTE_FETCH = NO`                                                             |
| Future verification SSRF             | Separate reviewed security phase                                                                 |
| Malicious canonical URL              | Strict parser; no remote fetch at register                                                       |
| Malicious display name               | Terminal output sanitization; no raw control sequences                                           |
| Malicious registry response          | Strict response schema; bounded body; no code execution                                          |
| API redirect token theft             | `API_REDIRECT_FOLLOWING = NO`                                                                    |
| MITM                                 | HTTPS only for production; loopback HTTP only in dev mode                                        |
| Registry outage                      | No runtime dependency; fail-open for sites                                                       |
| Request replay                       | Bearer auth; client-generated token; idempotency with client-side persistence                    |
| Brute force token guessing           | >= 256-bit cryptographic random tokens                                                           |
| Database leak                        | `TOKEN_SERVER_STORAGE = HASH_ONLY`                                                               |
| Abuse / spam                         | Rate limits + moderation; short-lived abuse logs not product data                                |
| Data overcollection                  | Exact minimal schema; `UNKNOWN_REQUEST_FIELDS = REJECT`                                          |
| Arbitrary application code execution | `ENGAWA_MAP_EXECUTES_APPLICATION_CODE = NO`                                                      |
| Secret discovery via `.env`          | `DOTENV_SCAN = NO`                                                                               |
| Supply-chain surprise                | Optional standalone `@thierry-gilgen-ict/engawa-map` package only                                |
| Visitor tracking                     | `VISITOR_TRACKING = NO`                                                                          |
| MCP tracking                         | `MCP_TRACKING = NO`                                                                              |
| BYA forwarding                       | `BYA_FORWARDING = NO`                                                                            |
| Token in shell history               | `TOKEN_IN_CLI_ARGUMENT = FORBIDDEN`                                                              |
| Config file implies consent          | `CONFIG_FILE_PRESENCE_REGISTERS = NO`                                                            |
| Version range fabrication            | `VERSION_RANGE_FABRICATION = NO`                                                                 |
| Lost registration response           | Client persists token + idempotency key before POST; `IDEMPOTENCY_REPLAY_RETURNS_RAW_TOKEN = NO` |
| CI hitting live registry             | `ENGAWA_CI_REGISTRY_NETWORK = NO`                                                                |
| Hints as telemetry                   | `OPTIONAL_HINTS_ARE_NOT_TELEMETRY = YES`                                                         |
| engawa-map in public listing         | `ENGAWA_MAP_VERSION_PUBLIC = NO`                                                                 |

## Malicious registry response

Registry compromise or malicious responses are a **first-class threat**. The CLI must treat all server responses as untrusted input.

| Rule                                  | Value  |
| ------------------------------------- | ------ |
| `STRICT_RESPONSE_SCHEMA`              | YES    |
| `UNKNOWN_RESPONSE_FIELDS`             | REJECT |
| `RESPONSE_SIZE_BOUND_REQUIRED`        | YES    |
| `REMOTE_CODE_EXECUTION`               | NO     |
| `SERVER_SUPPLIED_PATH_WRITE`          | NO     |
| `MALICIOUS_REGISTRY_RESPONSE_COVERED` | YES    |

Never:

- execute returned commands or JavaScript
- import remote modules
- write to arbitrary server-provided file paths
- follow arbitrary returned URLs automatically
- print unescaped terminal control characters
- trust `siteId` without schema validation
- accept oversized response bodies

## Terminal control character risk

Server-provided strings (`displayName`, error `message`) may contain untrusted text including ANSI or terminal control sequences.

| Rule                                      | Value |
| ----------------------------------------- | ----- |
| `TERMINAL_CONTROL_CHARACTER_RISK_COVERED` | YES   |

Mitigation: sanitize or safely render control characters; bounded error text; no raw server body interpolation.

## Main website isolation (www.thierry-gilgen-ict.ch)

The Engawa monorepo main website and the Distribution Map registry are separate security boundaries.

| Rule                                      | Value |
| ----------------------------------------- | ----- |
| `WWW_WRITE_API_FOR_MAP`                   | NO    |
| `WWW_MAP_TOKEN`                           | NO    |
| `WWW_RUNTIME_REGISTRY_CALL`               | NO    |
| `WWW_DB_SHARED_CREDENTIAL`                | NO    |
| `WWW_SESSION_USED_FOR_REGISTRY_SITE_AUTH` | NO    |
| `WWW_DEPLOY_DEPENDS_ON_REGISTRY`          | NO    |

The public website may **link** to the map. That is not hosting the registry write API.

The registry host may eventually use a dedicated subdomain of `thierry-gilgen-ict.ch` but must remain a **separate application/service boundary** (`REGISTRY_WRITE_API_IN_MAIN_WEBSITE = NO`).

## Failure isolation

| Rule                                     | Value |
| ---------------------------------------- | ----- |
| `MAP_OUTAGE_AFFECTS_SITE_RUNTIME`        | NO    |
| `WEBSITE_DEPENDENCY_ON_REGISTRY`         | NONE  |
| `REGISTRY_DEPENDENCY_ON_WEBSITE_RUNTIME` | NONE  |

Registry outage must not break: build, deploy, startup, `/mcp`, `/llms.txt`, markdown, BYA, public HTML.

Only explicitly invoked registry operations fail during registry outage.

CLI default: non-zero exit on failure (`NORMAL_CLI_FAILURE_EXIT = NONZERO`). Non-blocking behavior requires explicit opt-in (`NON_BLOCKING_REQUIRES_EXPLICIT_OPT_IN = YES`).

## Residual risks

Honest limitations:

- **Manual approval v1** — maintainers can make mistakes; abusive listings until delisted
- **Domain verification deferred** — without verification, canonical URL is operator-declared only until a future phase
- **No DNS at register** — private infrastructure behind a public hostname cannot be detected without resolution
- **Physical co-location** — registry may share hardware with other services; isolation is logical/service-level
- **Operator machine compromise** — local secret file or env token exposure is out of registry control
- **Dedicated CI job misconfiguration** — `--yes` in wrong pipeline could register unintentionally
- **Maintainer admin compromise** — separate admin auth reduces blast radius but does not eliminate it
- **Rate limits** — edge limits reduce abuse but do not prevent all spam
- **No self-service token rotation in v1** — `TOKEN_ROTATION_V1 = DEFERRED`; stolen token remains valid until unregister or maintainer revocation
- **Windows secret file permissions** — ACL model differs from POSIX `0600`
- **Dry-run trust gap** — mitigated by `DRY_RUN_EXACT_PAYLOAD = YES` shared serializer

## Related

- [Distribution Map policy](distribution-map.md)
- [API and CLI contract](distribution-map-api.md)
- [Security model](security-model.md)

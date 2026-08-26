# Operator-local observability for Engawa surfaces

A practical recipe for measuring requests to Engawa agent surfaces using logs you already control.

This is **not** a telemetry product, **not** an analytics package, and **not** hosted by Engawa.

```text
ENGAWA_RUNTIME_PHONE_HOME = NO
OPERATOR_LOCAL_ONLY = YES
DISTRIBUTION_MAP_IS_OBSERVABILITY = NO
MCP_REQUEST_BODY_LOGGING = NO
USER_AGENT == MODEL_CONSUMPTION = NEVER
```

Published Engawa packages must not send analytics to Engawa or Thierry Gilgen ICT, call a central analytics endpoint, call the Distribution Map, require an analytics token, or make new outbound runtime network calls for observability.

## Purpose

### What this can answer

From **observed requests** to surfaces you publish:

- Is `/llms.txt` being requested?
- Which published markdown resources receive requests?
- Is `/mcp` receiving traffic?
- What HTTP methods and status codes occur?
- What `Accept` values are declared?
- What User-Agent strings are declaring themselves?
- Are requests succeeding or failing?
- Are volumes changing over time?

Preferred language for these signals:

```text
OBSERVED_REQUEST
BOT_LIKE_REQUEST
DECLARED_USER_AGENT
UNKNOWN_CLIENT
```

### What this cannot answer

- Whether a model actually read or used the response
- Whether Engawa content influenced an answer or citation
- Which exact model consumed a response (unless independently proven outside this recipe)
- Semantic intent from User-Agent alone

```text
USER_AGENT == MODEL_CONSUMPTION = NEVER
```

A User-Agent can indicate a crawler, bot, browser, tool, assistant integration, or claimed identity. It is **evidence of a declared client string**, not proof of model consumption.

## Recommended normalized observation schema

Document a small conceptual event (your log pipeline may use different field names):

| Field         | Meaning                                           |
| ------------- | ------------------------------------------------- |
| `timestamp`   | Request time (UTC preferred)                      |
| `surface`     | Bounded classification (below)                    |
| `method`      | HTTP method                                       |
| `path`        | Normalized path only (no query string by default) |
| `status`      | Response status code                              |
| `bytes`       | Response size if available                        |
| `duration_ms` | Request duration if available                     |
| `accept`      | `Accept` header value (or truncated form)         |
| `user_agent`  | Declared `User-Agent` (or truncated form)         |

```text
surface ∈ { LLMS_TXT, MARKDOWN, MCP, CANONICAL_HTML, OTHER }
```

This is documentation / schema guidance only. Engawa does **not** ship a central collector.

### Explicitly exclude from the default recipe

Do **not** require logging:

- prompts
- MCP request bodies
- MCP query / `search_site` terms
- response bodies
- cookies
- `Authorization` / other auth headers
- session IDs
- user IDs
- form data
- IP addresses (if your infrastructure logs IPs by default, apply your own privacy and retention policy; prefer anonymization or minimization where feasible)

Strip or avoid query strings in the normalized `path` unless you have a justified non-sensitive need.

For `/mcp`, observe the request at **route / transport** level only:

```text
MCP_REQUEST_BODY_LOGGING = NO
```

## Surface classification

Prefer **configured / known Engawa surfaces**, not every path that happens to end in `.md`.

| Example                                             | Surface          |
| --------------------------------------------------- | ---------------- |
| Exact site-root `/llms.txt`                         | `LLMS_TXT`       |
| Known published markdown alternate or resource path | `MARKDOWN`       |
| Exact configured MCP endpoint (often `/mcp`)        | `MCP`            |
| Ordinary human HTML URL                             | `CANONICAL_HTML` |
| Everything else                                     | `OTHER`          |

Optional: if you observe canonical HTML with `Accept: text/markdown`, note it in `accept` for operator-local analysis. Same-URL negotiation was evaluated in the [content negotiation experiment](content-negotiation-experiment.md); dedicated `.md` routes remain the Engawa default.

## Minimal metrics

Recommend simple aggregates only:

- request count by `surface`
- status distribution by `surface`
- request count by normalized `path`
- request count by declared `user_agent`
- `Accept` distribution
- latency distribution where `duration_ms` exists
- successful vs failed requests
- trend over time (e.g. per day)

Avoid vanity or speculative metrics (for example “AI reads”).

## Recipe A — Existing server / CDN access logs

Extend structured access logs you already operate (application reverse proxy, CDN, or host) to include:

- path (normalized)
- method
- status
- `Accept`
- `User-Agent`
- duration when available

Do **not** require request or response bodies.

### Infrastructure-neutral pseudo-config

```text
access_log fields =
  time
  method
  host
  path_without_query
  status
  bytes_sent
  duration_ms
  request_header.Accept
  request_header.User-Agent

access_log exclude =
  request_body
  response_body
  Cookie
  Authorization
  query_string   # default: omit from observation path
```

There is **no single canonical** Engawa hosting stack. Production reference sites document package pins and surfaces, not a required proxy vendor. Treat the following as **non-canonical examples** only.

> Provider-native timing units vary. Preserve the native unit in raw logs and explicitly convert to canonical `duration_ms` during normalization.

### Example (non-canonical): nginx-style log format

```nginx
# EXAMPLE ONLY — not required by Engawa
log_format engawa_obs escape=json
  '{"timestamp":"$time_iso8601",'
  '"method":"$request_method",'
  '"path":"$uri",'
  '"status":$status,'
  '"bytes":$body_bytes_sent,'
  '"duration_seconds":$request_time,'
  '"accept":"$http_accept",'
  '"user_agent":"$http_user_agent"}';

access_log /var/log/nginx/engawa-obs.log engawa_obs;
```

nginx `$request_time` is measured in **seconds with millisecond resolution** (for example, `0.125` means 125 ms). In your local log pipeline or analysis step, normalize `duration_seconds * 1000` into canonical `duration_ms`. Do not rename raw provider fields to `duration_ms` without conversion.

### Example (non-canonical): Caddy-style log fields

```caddy
# EXAMPLE ONLY — not required by Engawa
log {
  output file /var/log/caddy/engawa-obs.log
  format json
  # Prefer JSON access logs; map/filter fields in your shipper
  # to path, method, status, Accept, User-Agent, duration.
  # Do not log request or response bodies for /mcp.
}
```

Map raw access events into the normalized schema (including `surface`) in your log pipeline or a local analysis script.

## Recipe B — Application-level structured logging

When edge configuration is unavailable, record **metadata-only** observations in the host application and write structured JSON to stdout/stderr or the host’s local logging facility.

Rules:

- never log MCP body
- never log search / query content
- never log cookies or auth headers
- never trigger an outbound analytics request
- do **not** modify Engawa runtime packages to do this automatically

Framework-neutral sketch:

```javascript
// Pseudocode — host application only; not an Engawa package API
function observeAgentSurface(req, resMeta) {
  const path = new URL(req.url, "http://local").pathname; // drop query
  const surface = classifySurface(path); // LLMS_TXT | MARKDOWN | MCP | ...
  const record = {
    timestamp: new Date().toISOString(),
    surface,
    method: req.method,
    path,
    status: resMeta.status,
    bytes: resMeta.bytes,
    duration_ms: resMeta.durationMs,
    accept: req.headers.accept ?? "",
    user_agent: req.headers["user-agent"] ?? "",
  };
  // Local only — stdout / host logger. No fetch() to analytics.
  console.log(JSON.stringify(record));
}
```

## Example log records

`LLMS_TXT`:

```json
{
  "timestamp": "2026-08-26T12:00:00Z",
  "surface": "LLMS_TXT",
  "method": "GET",
  "path": "/llms.txt",
  "status": 200,
  "bytes": 8421,
  "duration_ms": 18,
  "accept": "text/plain,*/*",
  "user_agent": "example-client/1.0"
}
```

`MARKDOWN`:

```json
{
  "timestamp": "2026-08-26T12:01:00Z",
  "surface": "MARKDOWN",
  "method": "GET",
  "path": "/about.md",
  "status": 200,
  "bytes": 1204,
  "duration_ms": 12,
  "accept": "text/markdown,*/*",
  "user_agent": "example-bot/2.0"
}
```

`MCP` (no body, no query payload in the observation):

```json
{
  "timestamp": "2026-08-26T12:02:00Z",
  "surface": "MCP",
  "method": "POST",
  "path": "/mcp",
  "status": 200,
  "bytes": 512,
  "duration_ms": 45,
  "accept": "application/json, text/event-stream",
  "user_agent": "example-mcp-client/1.0"
}
```

## Local analysis (no SaaS required)

Prefer tools you already run against local files. A portable starting point is `jq`. Optionally load NDJSON into DuckDB or your existing observability stack **without** sending Engawa traffic to an Engawa-hosted service.

Sanitized fixtures and a local aggregator live in [`examples/observability/`](../examples/observability/).

```bash
# Count by surface
jq -r .surface examples/observability/fixtures/agent-surface-requests.ndjson | sort | uniq -c

# Count /llms.txt
jq -c 'select(.path == "/llms.txt")' examples/observability/fixtures/agent-surface-requests.ndjson | wc -l

# Status distribution
jq -r '[.surface, (.status|tostring)] | join("\t")' examples/observability/fixtures/agent-surface-requests.ndjson | sort | uniq -c

# Declared User-Agent groups
jq -r .user_agent examples/observability/fixtures/agent-surface-requests.ndjson | sort | uniq -c

# Accept distribution
jq -r .accept examples/observability/fixtures/agent-surface-requests.ndjson | sort | uniq -c

# Local Node aggregator (NETWORK_CALLS = NONE)
node examples/observability/analyze.mjs examples/observability/fixtures/agent-surface-requests.ndjson
```

## Retention and privacy

Concise operator policy (not legal advice):

- Collect the minimum fields necessary for operational questions above
- Define retention explicitly; avoid indefinite raw-log retention
- Restrict who can read logs
- Never treat access logs as authorization evidence
- Sanitize or anonymize identifiers where applicable (especially if infrastructure logs IPs)
- Follow privacy and retention requirements that apply to your jurisdiction and hosting

## Relationship to other Engawa features

### Distribution Map

```text
DISTRIBUTION_MAP_IS_OBSERVABILITY = NO
```

The [Distribution Map](distribution-map.md) is voluntary site registration / showcase — not traffic telemetry.

### Bring Your Agent `onEvent`

Metadata-only UI events may coexist ([getting-started](getting-started.md), [Next.js integration](integrations/nextjs.md)):

- no prompts
- no agent context bodies
- no MCP body
- no central Engawa collection

### Future analytics helpers

Do **not** introduce:

- `engawa-analytics`
- a telemetry SDK in published packages
- a hosted Engawa dashboard
- an analytics API
- a phone-home collector

Package naming / extraction waits until a pattern is proven ([roadmap](roadmap.md)).

## Related

- [Security model](security-model.md)
- [llms.txt authoring](llms-txt-authoring.md) — fetch signals vs model consumption
- [Architecture](architecture.md)
- [Example: local analysis](../examples/observability/README.md)

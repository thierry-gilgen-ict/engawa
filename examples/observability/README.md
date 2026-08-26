# Example: local Engawa surface observation analysis

Sanitized NDJSON fixtures and a tiny local aggregator for the [operator-local observability recipe](../../docs/observability.md).

```text
OPERATOR_LOCAL_ONLY = YES
NETWORK_CALLS = NONE
MCP_REQUEST_BODY_LOGGING = NO
```

This example does **not** call Engawa packages, the Distribution Map, or any analytics endpoint.

## Files

| Path                                                                               | Purpose                                               |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [`fixtures/agent-surface-requests.ndjson`](fixtures/agent-surface-requests.ndjson) | Sanitized observation records                         |
| [`analyze.mjs`](analyze.mjs)                                                       | Local counts by surface / status / path / UA / Accept |

## Run

From the Engawa repository root:

```bash
node examples/observability/analyze.mjs examples/observability/fixtures/agent-surface-requests.ndjson
```

Or with `jq`:

```bash
jq -r .surface examples/observability/fixtures/agent-surface-requests.ndjson | sort | uniq -c
```

## Fixture invariants

Each line is one JSON object with the normalized fields from the recipe. Records intentionally omit:

- prompts
- MCP bodies / search terms
- response bodies
- cookies
- authorization headers
- IPs / user IDs / session IDs

`User-Agent` values are declared client strings only — not proof of model consumption.

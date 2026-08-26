# Example: content negotiation experiment

Bounded local proof for the [content negotiation experiment](../../docs/content-negotiation-experiment.md).

```text
EXPERIMENT_ONLY = YES
PRODUCTION_READY_ACCEPT_PARSER = NO
NETWORK_CALLS = NONE
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
```

This example does **not** import Engawa packages and does **not** change production Engawa behavior.

## Models demonstrated

| Route           | Behavior                                                            |
| --------------- | ------------------------------------------------------------------- |
| `GET /about`    | Model B — same canonical URL; representation selected from `Accept` |
| `GET /about.md` | Model A — dedicated Markdown URL (control baseline)                 |

Both Markdown paths use the same `buildMarkdown()` output from [`content.mjs`](content.mjs).

## Files

| Path                                                           | Purpose                                             |
| -------------------------------------------------------------- | --------------------------------------------------- |
| [`content.mjs`](content.mjs)                                   | Single public source → HTML + Markdown builders     |
| [`accept-parser.mjs`](accept-parser.mjs)                       | Experimental `Accept` selection (`EXPERIMENT_ONLY`) |
| [`negotiate.mjs`](negotiate.mjs)                               | Response headers + bodies for `/about`              |
| [`server.mjs`](server.mjs)                                     | Localhost HTTP server                               |
| [`cache-demo.mjs`](cache-demo.mjs)                             | In-memory cache-key proof for `Vary: Accept`        |
| [`fixtures/accept-vectors.json`](fixtures/accept-vectors.json) | Accept test matrix                                  |

## Run

Cache proof (no server):

```bash
node examples/content-negotiation/cache-demo.mjs
```

Local server:

```bash
node examples/content-negotiation/server.mjs
```

Then probe (separate terminal):

```bash
curl -sI -H "Accept: text/html" http://127.0.0.1:3848/about
curl -sI -H "Accept: text/markdown" http://127.0.0.1:3848/about
curl -sI http://127.0.0.1:3848/about.md
```

## Experimental selection policy

See the canonical doc for full policy and standards context. Summary:

- missing `Accept` → HTML
- higher `q` wins; equal `q` → HTML
- `*/*` does not specifically request Markdown
- `text/markdown;q=0` → never Markdown
- both representations `q=0` → `406 Not Acceptable`

Negotiated responses emit `Vary: Accept` on both HTML and Markdown branches.

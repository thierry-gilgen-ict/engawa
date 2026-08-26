# Security model (v0.1)

> Public Engawa is read-only by default.

## Principles

- No unauthenticated mutation
- No private or customer data in public adapters
- No secret or environment exposure through tools
- No arbitrary filesystem traversal (no FS adapter in v0.1)
- No arbitrary outbound network from tools
- Input validation on all tool parameters
- Output and content size bounds
- Result count bounds on search
- Predictable errors; no stack traces to remote users in production
- Adapters do not silently expand authority
- Tools registered via explicit allow-list
- Future authenticated tools architecturally separate from public tools
- Public MCP (`createEngawaPublicMcpHandler`) requires `agentInterface.enabled` and `agentInterface.public`; disabled or private configs fail closed with `EngawaAgentInterfaceError`
- Adapter output validated at core boundary before MCP or discovery consumption

## Threat analysis

| Threat                                            | v0.1 status                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Prompt / content injection via registered content | Partially mitigated — content is site-controlled; agents must treat untrusted text carefully      |
| Malicious content source (compromised adapter)    | Partially mitigated — schema validation at core boundary; adapter is site operator responsibility |
| Path traversal                                    | Mitigated — no filesystem adapter in v0.1                                                         |
| SSRF via tools                                    | Mitigated — no outbound HTTP in tools                                                             |
| Tool abuse (spam search)                          | Partially mitigated — query length and result limits; rate limiting recommended at edge           |
| Resource enumeration                              | Accepted — public resources are intentionally listable                                            |
| DoS / oversized queries                           | Partially mitigated — byte and length bounds; edge rate limiting recommended                      |
| Accidental secret leakage                         | Mitigated — tools return only adapter content; no env access                                      |
| Unsafe future mutation                            | Future — mutating tools require auth and separate review                                          |
| Cross-tenant leakage (future SaaS)                | Future — multi-tenant isolation not in v0.1                                                       |

Phase 0 established defaults and boundaries for the public read-only surface. Production reference integrations (Phase 1–2A) validated the model on live sites; operators must still enforce host-specific guards and [content publication parity](content-publication.md).

## Launch checklist (public Engawa)

Before enabling public MCP and machine markdown on a production domain:

- [ ] **Human-public corpus only** — adapter matches anonymous HTML routes ([content-publication.md](content-publication.md)); no production runtime HTML crawling as corpus source
- [ ] **Read-only public tools** — v0.1: `search_site` only; no custom mutating tools on public handler
- [ ] **Host validation** — reject requests with unexpected `Host` in production
- [ ] **Origin validation** — where browser clients call MCP, validate `Origin`
- [ ] **Rate limits** — application or edge limits on `/mcp` and search
- [ ] **Query length limits** — `maxSearchQueryLength` in config (default 200, ceiling 500)
- [ ] **Result limits** — `maxSearchResults` bounded (default 10, ceiling 50)
- [ ] **No drafts** — unpublished CMS rows not in adapter
- [ ] **No private files** — `source-material/`, `knowledge/`, admin media excluded
- [ ] **No contact submissions** — form bodies never in Engawa corpus
- [ ] **No session data** — cookies, tokens, user IDs not in resources or tools
- [ ] **No env/secrets** — tools do not read `process.env` or config secrets
- [ ] **No raw database tool** — search goes through adapter, not SQL MCP tools
- [ ] **No unauthenticated mutation** — writes belong in authenticated future surface
- [ ] **Markdown `noindex`** — if alternates should not compete with HTML in search indexes
- [ ] **Analytics metadata only** — BYA `onEvent`: no prompt, context, or MCP query body logging
- [ ] **Operator-local agent-surface logs (optional)** — if you measure `/llms.txt`, markdown, or `/mcp` traffic, use [operator-local observability](observability.md): no Engawa phone-home, no MCP request-body logging, User-Agent is not proof of model consumption

## Distribution Map (opt-in only)

The [Distribution Map](distribution-map.md) is an **optional showcase** — not telemetry, not `engawa-analytics`, and not part of Engawa runtime. Production registry is live; CLI is `@thierry-gilgen-ict/engawa-map@0.1.0` on npm.

Current published Engawa packages:

- Make **no** Distribution Map requests
- Do **not** register sites from MCP tools, discovery generation, React/BYA mount, or `onEvent`
- Do **not** require a map token at runtime (`NO_RUNTIME_MAP_TOKEN`)

Registration design rules (future registry):

- `REGISTRATION_IS_OUT_OF_BAND = YES` — only explicit CLI or dedicated CI registration job
- `NO_RUNTIME_NETWORK_CALL` from normal website processes to the registry
- `REGISTER_REQUEST_REMOTE_FETCH = NO` — registry must not fetch submitted URLs on registration
- Dedicated registry service; external to public MCP authority
- Registry outage must not affect site build, deploy, startup, `/mcp`, `/llms.txt`, markdown, BYA, or public HTML

This does not weaken **No arbitrary outbound network from tools** — public MCP tools remain read-only and adapter-bound.

DM1A freezes the future `engawa-map` CLI contract and registry API ([distribution-map-api.md](distribution-map-api.md), [distribution-map-threat-model.md](distribution-map-threat-model.md)) without implementing network code. Additional hard invariants for future implementation:

- `ENGAWA_MAP_EXECUTES_APPLICATION_CODE = NO` — CLI reads static config only
- `UNKNOWN_REQUEST_FIELDS = REJECT` / `UNKNOWN_RESPONSE_FIELDS = REJECT`
- `API_REDIRECT_FOLLOWING = NO` on registry client requests
- `ENGAWA_CI_REGISTRY_NETWORK = NO` — no live registry in normal CI
- `DO_NOT_IMPLEMENT_MAP_NETWORK_CODE_BEFORE_DM1A_APPROVAL` — agents must not add outbound HTTP until contract is approved

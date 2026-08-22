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

## Threat analysis

| Threat                                            | v0.1 status                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Prompt / content injection via registered content | Partially mitigated — content is site-controlled; agents must treat untrusted text carefully |
| Malicious content source (compromised adapter)    | Partially mitigated — adapter is site operator responsibility; bounds limit blast radius     |
| Path traversal                                    | Mitigated — no filesystem adapter in v0.1                                                    |
| SSRF via tools                                    | Mitigated — no outbound HTTP in tools                                                        |
| Tool abuse (spam search)                          | Partially mitigated — query length and result limits; rate limiting recommended at edge      |
| Resource enumeration                              | Accepted — public resources are intentionally listable                                       |
| DoS / oversized queries                           | Partially mitigated — byte and length bounds; edge rate limiting recommended                 |
| Accidental secret leakage                         | Mitigated — tools return only adapter content; no env access                                 |
| Unsafe future mutation                            | Future — mutating tools require auth and separate review                                     |
| Cross-tenant leakage (future SaaS)                | Future — multi-tenant isolation not in v0.1                                                  |

Phase 0 does not permanently solve all threats. It establishes defaults and boundaries for the public read-only surface.

# ADR 0007: Resource URI identity

## Status

Accepted

## Context

Resource URIs must be deterministic, unambiguous, and scoped to the site's canonical base path. Host-only URIs collide when multiple Engawa deployments share a host at different paths (e.g. `https://example.com` vs `https://example.com/docs`).

## Decision

- Resource IDs: `^[a-zA-Z0-9._-]+$` (max 128 chars). Reject `/`, `?`, `#`, whitespace.
- URI algorithm: `engawa://{host}{canonicalPath}/r/{percentEncodedId}`
  - `canonicalPath`: pathname from normalized `canonicalUrl` (empty when root).
  - ID encoded with `encodeURIComponent` after ID validation.
- `StaticContentAdapter` throws on duplicate IDs.
- Core validates all adapter output: schema, ID, URI match, page URL under site base.

## Consequences

Agents can distinguish deployments on the same host. Adapters must produce IDs and URIs consistent with this algorithm before core validation.

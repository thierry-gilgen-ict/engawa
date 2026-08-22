# ADR 0004: Read-only public default

## Status

Accepted

## Context

Public agent endpoints are high-risk if they allow mutation or secret access.

## Decision

v0.1 public Engawa surfaces are read-only. `security.publicDefault` is `"read-only"`. Only `search_site` with `readOnlyHint: true`.

## Consequences

Authenticated mutating tools are a separate future layer.

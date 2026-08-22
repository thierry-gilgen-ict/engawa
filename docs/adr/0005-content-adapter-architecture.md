# ADR 0005: Content adapter architecture

## Status

Accepted

## Context

Content may come from markdown, CMS, APIs, or application services.

## Decision

Define a minimal `ContentAdapter` with `listResources`, `getResource`, and `search`. v0.1 ships `StaticContentAdapter` only.

## Consequences

Core stays framework-independent. Risky adapters (filesystem) deferred until sandboxing is designed.

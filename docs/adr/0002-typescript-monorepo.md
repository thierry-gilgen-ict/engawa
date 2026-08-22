# ADR 0002: TypeScript monorepo

## Status

Accepted

## Context

Engawa needs multiple packages (core, discovery, MCP, future UI) with shared types.

## Decision

Use pnpm workspaces, ESM, strict TypeScript, and `tsc` project references. No Turborepo/Nx in Phase 0.

## Consequences

Simple tooling. Packages build independently. Clear dependency graph.

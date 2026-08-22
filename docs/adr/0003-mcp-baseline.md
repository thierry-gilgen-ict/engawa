# ADR 0003: MCP baseline

## Status

Accepted

## Context

MCP TypeScript SDK v1 (`@modelcontextprotocol/sdk`) and session-oriented HTTP patterns are obsolete.

## Decision

Target MCP protocol **2026-07-28** and SDK v2:

- `@modelcontextprotocol/server@2.0.0`
- `@modelcontextprotocol/node@2.0.0`
- `createMcpHandler` with per-request factory (stateless core)

## Consequences

Modern protocol alignment. No legacy StreamableHTTPServerTransport session wiring in Phase 0.

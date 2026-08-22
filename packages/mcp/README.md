# @thierry-gilgen-ict/engawa-mcp

Generic MCP adapter for Engawa using `@modelcontextprotocol/server` v2 (MCP spec 2026-07-28).

**Public v0.1 API:** `createEngawaPublicMcpServer()` and `createEngawaPublicMcpHandler()` — require `agentInterface.enabled` and `agentInterface.public`. Private or authenticated MCP is a future, separate surface.

Exposes registered content as MCP resources and a bounded read-only `search_site` tool with limits from `EngawaConfig`.

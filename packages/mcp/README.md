# @thierry-gilgen-ict/engawa-mcp

MCP server adapter for Engawa using `@modelcontextprotocol/server` v2 (MCP spec baseline 2026-07-28).

**Stability:** Early v0.x. Public read-only surface only in v0.1.

## When you need this package

Expose a public Streamable HTTP MCP endpoint with registered resources and `search_site`.

## When you don't

Agent-only sites that publish markdown + llms.txt without MCP.

## Install

```bash
npm install @thierry-gilgen-ict/engawa-mcp@0.1.1
```

Requires **Node.js 24+** (with engawa-core 0.1.1+). Depends on `@thierry-gilgen-ict/engawa-core`.

## Minimal example

```typescript
import { createEngawa, StaticContentAdapter } from "@thierry-gilgen-ict/engawa-core";
import { createEngawaPublicMcpHandler } from "@thierry-gilgen-ict/engawa-mcp";

const engawa = createEngawa(config, adapter);
const mcpHandler = createEngawaPublicMcpHandler(engawa);

// In your HTTP route (Next.js, etc.):
return mcpHandler.fetch(request);
```

**Complete Next.js App Router wiring** (host guards, rate limit, GET/POST/DELETE/OPTIONS, prerequisites including `@modelcontextprotocol/server@2.0.0`): [docs/examples/nextjs-mcp-app-router.md](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/examples/nextjs-mcp-app-router.md)

For low-level `McpServer` access (in-memory tests, custom transport):

```typescript
import { createEngawaPublicMcpServer } from "@thierry-gilgen-ict/engawa-mcp";

const server = await createEngawaPublicMcpServer(engawa);
```

## Public v0.1 API

| Export                         | Purpose                   |
| ------------------------------ | ------------------------- |
| `createEngawaPublicMcpServer`  | MCP `McpServer` instance  |
| `createEngawaPublicMcpHandler` | HTTP handler (`.fetch()`) |
| `assertPublicAgentInterface`   | Fail closed if not public |
| `EngawaAgentInterfaceError`    | Config guard error        |

**Tools:** `search_site` only (read-only). **Resources:** adapter corpus + `_meta` JSON.

Requires `agentInterface.enabled` and `agentInterface.public`.

## Security

- No mutating tools in public handler
- Host/origin validation belongs in **your** route layer
- Rate limiting belongs in **your** application or edge
- See [security model](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/security-model.md)

## Documentation

- [Complete Next.js MCP route](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/examples/nextjs-mcp-app-router.md)
- [Next.js integration](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/integrations/nextjs.md)
- [Getting started](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/getting-started.md)

## License

MIT

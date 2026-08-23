# Example Studio (minimal-site)

A **fictional** site demonstrating the Engawa v0.1 vertical slice inside this monorepo.

## What it teaches

- `EngawaConfig` validation
- `StaticContentAdapter` with multiple resources
- `createEngawa()` instance
- `generateLlmsTxt()` for `/llms.txt`
- `createEngawaPublicMcpHandler` wired to Node `http`
- Public `search_site` via MCP

Production sites install **npm packages** instead of `workspace:*` links—see [docs/getting-started.md](../docs/getting-started.md).

## Run (monorepo)

From repository root:

```bash
pnpm install
pnpm build
pnpm --filter minimal-site start
```

Endpoints:

- http://127.0.0.1:3847/llms.txt
- http://127.0.0.1:3847/mcp (Streamable HTTP MCP)
- http://127.0.0.1:3847/about.md (and other `*.md` routes)
- http://127.0.0.1:3847/health

No database or external services required.

## Source files

- `src/site.ts` — config, adapter, engawa instance
- `src/server.ts` — HTTP routing for llms.txt, markdown, MCP

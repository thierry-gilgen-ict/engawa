# Example Studio (minimal-site)

A generic fictional site demonstrating the Engawa v0.1 vertical slice.

## Run

From the repository root:

```bash
pnpm install
pnpm build
pnpm --filter minimal-site start
```

Then open:

- http://127.0.0.1:3847/llms.txt
- http://127.0.0.1:3847/health
- MCP endpoint: http://127.0.0.1:3847/mcp

Markdown pages: `/about.md`, `/services.md`, `/faq.md`, `/contact.md`

No database or external services required.

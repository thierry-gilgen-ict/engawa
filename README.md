# Engawa

The open toolkit for agent-native websites.

**Bring your agent.**

Engawa helps websites expose a first-class interface for AI agents alongside the human-facing site. Visitors can bring the agent they already trust instead of using another embedded chatbot.

## Why Engawa

Traditional websites optimize for humans browsing HTML. Agents scraping that HTML get noisy, incomplete context. Engawa sits between your site and the agent ecosystem—like an _engawa_, the transitional space between inside and outside in Japanese architecture.

```
                    WEBSITE
                       │
          ┌────────────┴────────────┐
          │                         │
     Human interface          Agent interface
          │                         │
       HTML/UI                  Engawa
                                    │
                           ┌────────┼────────┐
                           │        │        │
                       llms.txt    MCP    content
```

## What it does

- Validates generic site configuration (`EngawaConfig`)
- Normalizes content through pluggable adapters
- Generates [llms.txt v2](https://llmstxt.org/) discovery files
- Exposes MCP resources and safe read-only tools (e.g. `search_site`)
- Documents an implementation profile for agent-native websites

## Current status

Early **v0.1** foundation. Not production-hardened. API may change before 1.0.

## Quick example

See [`examples/minimal-site`](examples/minimal-site) for Example Studio—a fictional site with `llms.txt`, markdown pages, and an MCP endpoint.

```bash
pnpm install
pnpm build
pnpm --filter minimal-site start
```

## Packages

| Package                                | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| `@thierry-gilgen-ict/engawa-core`      | Config, resources, adapters          |
| `@thierry-gilgen-ict/engawa-discovery` | llms.txt generation, link metadata   |
| `@thierry-gilgen-ict/engawa-mcp`       | MCP server adapter (spec 2026-07-28) |

Planned (not in v0.1): React UI, Next.js adapters, CLI, analytics.

## Security defaults

Public Engawa endpoints are **read-only by default** in v0.1. No unauthenticated mutation, no secret access, bounded search input and results. See [`docs/security-model.md`](docs/security-model.md).

## Licensing

- **Source code**: [MIT](/LICENSE)
- **Documentation and profiles**: [CC BY 4.0](/docs/LICENSE)

## Roadmap

See [`docs/roadmap.md`](docs/roadmap.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT for software. CC BY 4.0 for docs. Copyright Thierry Gilgen ICT, 2026.

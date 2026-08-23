# @thierry-gilgen-ict/engawa-core

Framework-independent core for Engawa: configuration, normalized resources, content adapters, and `createEngawa`.

**Stability:** Early v0.x. API may change before 1.0.

## When you need this package

Always, for any Engawa integration. Other Engawa packages depend on it.

## Install

```bash
npm install @thierry-gilgen-ict/engawa-core@0.1.1
```

Requires **Node.js 24+** (package `engines` enforced in 0.1.1+).

## Minimal example

```typescript
import {
  createEngawa,
  StaticContentAdapter,
  validateEngawaConfig,
} from "@thierry-gilgen-ict/engawa-core";

const config = validateEngawaConfig({
  site: {
    name: "My Site",
    canonicalUrl: "https://www.example.com",
    description: "Public site description.",
    language: "en",
  },
  agentInterface: { enabled: true, public: true },
  security: { publicDefault: "read-only" },
  metadata: { version: "0.1.1" },
});

const adapter = new StaticContentAdapter(config.site.canonicalUrl, [
  { id: "about", title: "About", content: "# About\n\nText.", path: "/about.md" },
]);

const engawa = createEngawa(config, adapter);
const resources = await engawa.listResources();
```

## Key exports

| Export                                      | Purpose                                      |
| ------------------------------------------- | -------------------------------------------- |
| `validateEngawaConfig`                      | Parse and normalize site config              |
| `createEngawa`                              | Bind config + adapter with validation bounds |
| `ContentAdapter`                            | Interface for public corpus                  |
| `StaticContentAdapter`                      | In-memory demo / small sites                 |
| `EngawaResource`, `EngawaConfig`            | Types                                        |
| `buildResourceUri`, `normalizeCanonicalUrl` | URI helpers                                  |

## Sibling packages

- `@thierry-gilgen-ict/engawa-discovery` — llms.txt (uses resources from core)
- `@thierry-gilgen-ict/engawa-mcp` — MCP server (uses `Engawa` instance)
- `@thierry-gilgen-ict/engawa-react` — optional BYA UI

## Security

Adapters define the public corpus. Engawa validates resource shape and size at the boundary but does **not** decide what is public—your adapter does. See [content publication rule](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/content-publication.md).

## Documentation

- [Getting started](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/getting-started.md)
- [Security model](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/security-model.md)

## License

MIT

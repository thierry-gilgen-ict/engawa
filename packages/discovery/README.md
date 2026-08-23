# @thierry-gilgen-ict/engawa-discovery

Generates deterministic [llms.txt v2](https://llmstxt.org/) files and HTML discovery link metadata (`rel="alternate"`, `rel="describedby"`).

**Stability:** Early v0.x. API may change before 1.0.

## When you need this package

Expose `GET /llms.txt` or add `rel="describedby"` links on HTML pages.

## When you don't

You hand-author discovery files with no Engawa resource model (unusual).

## Install

```bash
npm install @thierry-gilgen-ict/engawa-discovery@0.1.1
```

Requires **Node.js 24+** (with engawa-core 0.1.1+). Depends on `@thierry-gilgen-ict/engawa-core`.

## Minimal example

```typescript
import { createEngawa, StaticContentAdapter } from "@thierry-gilgen-ict/engawa-core";
import { generateLlmsTxt, getLlmsTxtUrl } from "@thierry-gilgen-ict/engawa-discovery";

// ... config + adapter + engawa (see engawa-core README)

const resources = await engawa.listResources();
const body = generateLlmsTxt(engawa.config, resources);
const llmsUrl = getLlmsTxtUrl(engawa.config); // https://site/llms.txt
```

## Key exports

| Export              | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `generateLlmsTxt`   | Build llms.txt body from config + resources |
| `getLlmsTxtUrl`     | Canonical llms.txt URL                      |
| `getDiscoveryLinks` | `rel` link objects for HTML headers         |
| `formatLinkHeader`  | HTTP `Link` header string                   |

## Security

llms.txt lists only resources your adapter registered. It does not leak hidden CMS rows by itself—adapter discipline required.

## Documentation

[Getting started](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/getting-started.md)

## License

MIT

# @thierry-gilgen-ict/engawa-react

Reusable **Bring Your Agent** React components for Engawa agent-native websites.

Provider-neutral UI: generic MCP always works; vendor-specific actions follow the [provider capability matrix](../../docs/providers/provider-capability-matrix.md).

## Install

```bash
npm install @thierry-gilgen-ict/engawa-react react react-dom
```

## Usage

```tsx
import { AskYourAgent, DEFAULT_PROVIDERS } from "@thierry-gilgen-ict/engawa-react";

<AskYourAgent
  mcpUrl="https://www.example.com/mcp"
  context={{
    type: "article",
    title: "My article",
    canonicalUrl: "https://www.example.com/post",
    siteName: "Example",
    mcpUrl: "https://www.example.com/mcp",
  }}
  providers={DEFAULT_PROVIDERS}
  labels={labels}
  onEvent={(event) => console.log(event.name)}
/>
```

All user-facing strings are passed via `labels`. Analytics are emitted via `onEvent` — no vendor analytics built in.

## License

MIT

# @thierry-gilgen-ict/engawa-react

Reusable **Bring Your Agent** React components for Engawa agent-native websites.

**Stability:** Early v0.x (0.1.0). API may change before 1.0.

## When you need this package

Add a provider-neutral "ask with your agent" dialog (ChatGPT, Claude, Grok, Cursor, generic MCP).

## When you don't

Headless integrations with no on-site BYA button.

## Install

```bash
npm install @thierry-gilgen-ict/engawa-react@0.1.0 react react-dom
```

Requires **Node.js 24+** (`engines` in package.json). Peer deps: `react`, `react-dom` ^18 or ^19.

Does not include MCP server—you still need `engawa-core` + `engawa-mcp` (or another MCP host) for the endpoint URL.

## Usage

```tsx
import { AskYourAgent, DEFAULT_PROVIDERS } from "@thierry-gilgen-ict/engawa-react";

<AskYourAgent
  mcpUrl="https://www.example.com/mcp"
  context={{
    type: "page",
    title: "About",
    canonicalUrl: "https://www.example.com/about",
    siteName: "Example",
    mcpUrl: "https://www.example.com/mcp",
  }}
  providers={DEFAULT_PROVIDERS}
  labels={labels}
  onEvent={(event) => {
    /* metadata only */
  }}
/>;
```

All user-facing strings via `labels`. Provider actions follow the [capability matrix](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/providers/provider-capability-matrix.md)—no fake one-click MCP connect.

## Key exports

| Export                                                  | Purpose                                  |
| ------------------------------------------------------- | ---------------------------------------- |
| `AskYourAgent`                                          | Primary trigger + dialog                 |
| `DEFAULT_PROVIDERS`                                     | ChatGPT, Claude, Grok, Cursor, Other MCP |
| Provider picker, dialog, connection panel subcomponents |

## Security / privacy

- `onEvent` emits **metadata** (provider, action, page path)—never prompt or copied context bodies
- No built-in analytics vendor; host app owns tracking policy

## Documentation

[Getting started — React step](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/getting-started.md#step-7--optional-react-bring-your-agent-ui)

## License

MIT

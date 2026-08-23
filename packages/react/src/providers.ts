import type { AgentProviderDefinition } from "./types.js";

export const DEFAULT_PROVIDERS: AgentProviderDefinition[] = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    actions: ["OPEN_PROVIDER", "COPY_MCP_URL", "COPY_CONTEXT", "SHOW_CONNECTION_INSTRUCTIONS"],
    openUrl: "https://chatgpt.com",
  },
  {
    id: "claude",
    label: "Claude",
    actions: ["OPEN_PROVIDER", "COPY_MCP_URL", "COPY_CONTEXT", "SHOW_CONNECTION_INSTRUCTIONS"],
    openUrl: "https://claude.ai",
  },
  {
    id: "grok",
    label: "Grok",
    actions: ["OPEN_PROVIDER", "COPY_MCP_URL", "COPY_CONTEXT", "SHOW_CONNECTION_INSTRUCTIONS"],
    openUrl: "https://grok.com/connectors",
  },
  {
    id: "cursor",
    label: "Cursor",
    actions: [
      "COPY_MCP_URL",
      "COPY_CONNECTION_DETAILS",
      "SHOW_CONNECTION_INSTRUCTIONS",
      "OPEN_PROVIDER",
    ],
    openUrl: "https://cursor.com/docs/mcp",
    docsUrl: "https://cursor.com/docs/mcp",
  },
  {
    id: "generic",
    label: "Other MCP client",
    actions: ["COPY_MCP_URL", "COPY_CONNECTION_DETAILS", "SHOW_CONNECTION_INSTRUCTIONS"],
  },
];

export function getProviderById(
  providers: AgentProviderDefinition[],
  id: string,
): AgentProviderDefinition | undefined {
  return providers.find((p) => p.id === id);
}

export function hasAction(provider: AgentProviderDefinition, action: string): boolean {
  return provider.actions.includes(action as AgentProviderDefinition["actions"][number]);
}

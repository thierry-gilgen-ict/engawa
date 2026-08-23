export type AgentContextType = "site" | "page" | "article" | "service" | "generic";

/** Fields that must never appear in public agent context. */
export const FORBIDDEN_CONTEXT_KEYS = [
  "cookie",
  "cookies",
  "session",
  "sessionId",
  "userId",
  "customerId",
  "token",
  "secret",
  "password",
  "auth",
] as const;

export type AgentContext = {
  type: AgentContextType;
  title?: string;
  canonicalUrl?: string;
  summary?: string;
  mcpUrl?: string;
  siteName?: string;
};

export type AgentProviderId = "chatgpt" | "claude" | "grok" | "cursor" | "generic";

export type AgentUiAction =
  | "DIRECT_HANDOFF"
  | "COPY_CONTEXT"
  | "COPY_MCP_URL"
  | "COPY_CONNECTION_DETAILS"
  | "SHOW_CONNECTION_INSTRUCTIONS"
  | "OPEN_PROVIDER"
  | "UNSUPPORTED";

export type CapabilityLevel =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "MANUAL"
  | "UNKNOWN"
  | "NOT_SUPPORTED";

export type AgentProviderDefinition = {
  id: AgentProviderId;
  label: string;
  actions: AgentUiAction[];
  openUrl?: string;
  docsUrl?: string;
};

export type AskAgentEventName =
  | "ask_agent_open"
  | "ask_agent_close"
  | "ask_agent_provider_selected"
  | "ask_agent_mcp_copied"
  | "ask_agent_context_copied"
  | "ask_agent_instructions_opened"
  | "ask_agent_external_handoff";

export type AskAgentEvent = {
  name: AskAgentEventName;
  provider?: AgentProviderId;
  pageType?: AgentContextType;
  action?: AgentUiAction;
  pagePath?: string;
};

export type AskYourAgentLabels = {
  trigger: string;
  dialogTitle: string;
  dialogDescription: string;
  providerChatgpt: string;
  providerClaude: string;
  providerGrok: string;
  providerCursor: string;
  providerGeneric: string;
  copyMcpUrl: string;
  copyContext: string;
  copyConnectionDetails: string;
  showInstructions: string;
  openProvider: string;
  openProviderChatgpt: string;
  openProviderClaude: string;
  openProviderGrok: string;
  openProviderCursorDocs: string;
  copied: string;
  mcpEndpointLabel: string;
  whatCanAccess: string;
  instructionsTitle: string;
  instructionsChatgpt: string;
  instructionsClaude: string;
  instructionsGrok: string;
  instructionsCursor: string;
  instructionsGeneric: string;
  close: string;
};

export type AskYourAgentProps = {
  mcpUrl: string;
  context: AgentContext;
  providers?: AgentProviderDefinition[];
  labels: AskYourAgentLabels;
  onEvent?: (event: AskAgentEvent) => void;
  className?: string;
  triggerClassName?: string;
  pagePath?: string;
};

export type AgentReadyMarkProps = {
  labels: Pick<AskYourAgentLabels, "trigger">;
  onClick: () => void;
  className?: string;
};

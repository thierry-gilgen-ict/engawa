import type { AgentProviderDefinition, AskYourAgentLabels } from "./types.js";
import { hasAction } from "./providers.js";

type ProviderActionsProps = {
  provider: AgentProviderDefinition;
  labels: AskYourAgentLabels;
  onCopyMcp: () => void;
  onCopyContext: () => void;
  onCopyConnectionDetails: () => void;
  onShowInstructions: () => void;
  onOpenProvider: () => void;
  showInstructions: boolean;
  copiedMcp: boolean;
  copiedContext: boolean;
  copiedConnection: boolean;
};

export function ProviderActions({
  provider,
  labels,
  onCopyMcp,
  onCopyContext,
  onCopyConnectionDetails,
  onShowInstructions,
  onOpenProvider,
  showInstructions,
  copiedMcp,
  copiedContext,
  copiedConnection,
}: ProviderActionsProps) {
  const openLabel =
    provider.id === "chatgpt"
      ? labels.openProviderChatgpt
      : provider.id === "claude"
        ? labels.openProviderClaude
        : provider.id === "grok"
          ? labels.openProviderGrok
          : provider.id === "cursor"
            ? labels.openProviderCursorDocs
            : labels.openProvider;

  return (
    <div className="engawa-provider-actions">
      <div className="engawa-provider-actions__buttons">
        {hasAction(provider, "OPEN_PROVIDER") && provider.openUrl ? (
          <button type="button" className="engawa-provider-actions__btn" onClick={onOpenProvider}>
            {openLabel}
          </button>
        ) : null}
        {hasAction(provider, "COPY_MCP_URL") ? (
          <button type="button" className="engawa-provider-actions__btn" onClick={onCopyMcp}>
            {copiedMcp ? labels.copied : labels.copyMcpUrl}
          </button>
        ) : null}
        {hasAction(provider, "COPY_CONTEXT") ? (
          <button type="button" className="engawa-provider-actions__btn" onClick={onCopyContext}>
            {copiedContext ? labels.copied : labels.copyContext}
          </button>
        ) : null}
        {hasAction(provider, "COPY_CONNECTION_DETAILS") ? (
          <button
            type="button"
            className="engawa-provider-actions__btn"
            onClick={onCopyConnectionDetails}
          >
            {copiedConnection ? labels.copied : labels.copyConnectionDetails}
          </button>
        ) : null}
        {hasAction(provider, "SHOW_CONNECTION_INSTRUCTIONS") ? (
          <button
            type="button"
            className="engawa-provider-actions__btn"
            onClick={onShowInstructions}
            aria-expanded={showInstructions}
          >
            {labels.showInstructions}
          </button>
        ) : null}
      </div>
      {showInstructions ? (
        <div
          className="engawa-provider-actions__instructions"
          role="region"
          aria-label={labels.instructionsTitle}
        >
          <p className="engawa-provider-actions__instructions-title">{labels.instructionsTitle}</p>
          <p className="engawa-provider-actions__instructions-body">
            {instructionText(labels, provider.id)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function instructionText(labels: AskYourAgentLabels, id: AgentProviderDefinition["id"]): string {
  switch (id) {
    case "chatgpt":
      return labels.instructionsChatgpt;
    case "claude":
      return labels.instructionsClaude;
    case "grok":
      return labels.instructionsGrok;
    case "cursor":
      return labels.instructionsCursor;
    case "generic":
      return labels.instructionsGeneric;
    default:
      return labels.instructionsGeneric;
  }
}

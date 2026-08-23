import type { AgentProviderDefinition, AskYourAgentLabels } from "./types.js";

type AgentProviderPickerProps = {
  providers: AgentProviderDefinition[];
  labels: AskYourAgentLabels;
  selectedId: AgentProviderDefinition["id"] | null;
  onSelect: (provider: AgentProviderDefinition) => void;
};

function providerLabel(labels: AskYourAgentLabels, id: AgentProviderDefinition["id"]): string {
  switch (id) {
    case "chatgpt":
      return labels.providerChatgpt;
    case "claude":
      return labels.providerClaude;
    case "grok":
      return labels.providerGrok;
    case "cursor":
      return labels.providerCursor;
    case "generic":
      return labels.providerGeneric;
    default:
      return id;
  }
}

export function AgentProviderPicker({
  providers,
  labels,
  selectedId,
  onSelect,
}: AgentProviderPickerProps) {
  return (
    <div className="engawa-provider-picker" role="listbox" aria-label={labels.dialogTitle}>
      <div className="engawa-provider-picker__grid">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            role="option"
            aria-selected={selectedId === provider.id}
            className="engawa-provider-picker__item"
            onClick={() => onSelect(provider)}
          >
            {providerLabel(labels, provider.id)}
          </button>
        ))}
      </div>
    </div>
  );
}

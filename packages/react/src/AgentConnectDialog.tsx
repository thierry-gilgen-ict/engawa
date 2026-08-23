import { useEffect, useId, useRef, useState } from "react";
import type {
  AgentContext,
  AgentProviderDefinition,
  AskAgentEvent,
  AskYourAgentLabels,
} from "./types.js";
import { AgentProviderPicker } from "./AgentProviderPicker.js";
import { McpConnectionPanel } from "./McpConnectionPanel.js";
import { ProviderActions } from "./ProviderActions.js";
import { buildCursorMcpConfig, buildHandoffMessage, copyToClipboard } from "./context.js";
import { useFocusTrap } from "./useFocusTrap.js";

type AgentConnectDialogProps = {
  open: boolean;
  onClose: () => void;
  mcpUrl: string;
  context: AgentContext;
  providers: AgentProviderDefinition[];
  labels: AskYourAgentLabels;
  onEvent?: (event: AskAgentEvent) => void;
  pagePath?: string;
  whatCanAccessHref?: string;
};

function emit(event: AskAgentEvent, onEvent?: (event: AskAgentEvent) => void) {
  onEvent?.(event);
}

export function AgentConnectDialog({
  open,
  onClose,
  mcpUrl,
  context,
  providers,
  labels,
  onEvent,
  pagePath,
  whatCanAccessHref,
}: AgentConnectDialogProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<AgentProviderDefinition | null>(providers[0] ?? null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [copiedContext, setCopiedContext] = useState(false);
  const [copiedConnection, setCopiedConnection] = useState(false);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        emit({ name: "ask_agent_close", pageType: context.type, pagePath }, onEvent);
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, onEvent, context.type, pagePath]);

  if (!open) return null;

  async function handleCopyMcp() {
    const ok = await copyToClipboard(mcpUrl);
    if (ok) {
      setCopiedMcp(true);
      emit({
        name: "ask_agent_mcp_copied",
        provider: selected?.id,
        pageType: context.type,
        action: "COPY_MCP_URL",
        pagePath,
      }, onEvent);
      window.setTimeout(() => setCopiedMcp(false), 2000);
    }
  }

  async function handleCopyContext() {
    const message = buildHandoffMessage({ ...context, mcpUrl });
    const ok = await copyToClipboard(message);
    if (ok) {
      setCopiedContext(true);
      emit({
        name: "ask_agent_context_copied",
        provider: selected?.id,
        pageType: context.type,
        action: "COPY_CONTEXT",
        pagePath,
      }, onEvent);
      window.setTimeout(() => setCopiedContext(false), 2000);
    }
  }

  async function handleCopyConnectionDetails() {
    const config = buildCursorMcpConfig(mcpUrl, "site-mcp");
    const ok = await copyToClipboard(config);
    if (ok) {
      setCopiedConnection(true);
      emit({
        name: "ask_agent_mcp_copied",
        provider: selected?.id,
        pageType: context.type,
        action: "COPY_CONNECTION_DETAILS",
        pagePath,
      }, onEvent);
      window.setTimeout(() => setCopiedConnection(false), 2000);
    }
  }

  function handleOpenProvider() {
    const url = selected?.openUrl ?? selected?.docsUrl;
    if (!url) return;
    emit({
      name: "ask_agent_external_handoff",
      provider: selected?.id,
      pageType: context.type,
      action: "OPEN_PROVIDER",
      pagePath,
    }, onEvent);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleSelectProvider(provider: AgentProviderDefinition) {
    setSelected(provider);
    setShowInstructions(false);
    emit({
      name: "ask_agent_provider_selected",
      provider: provider.id,
      pageType: context.type,
      pagePath,
    }, onEvent);
  }

  function handleShowInstructions() {
    setShowInstructions((v) => !v);
    emit({
      name: "ask_agent_instructions_opened",
      provider: selected?.id,
      pageType: context.type,
      action: "SHOW_CONNECTION_INSTRUCTIONS",
      pagePath,
    }, onEvent);
  }

  return (
    <div className="engawa-dialog-backdrop" data-engawa-dialog-backdrop onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="engawa-dialog"
        data-engawa-dialog
        onClick={(e) => e.stopPropagation()}
      >
        <header className="engawa-dialog__header">
          <h2 id={titleId} className="engawa-dialog__title">{labels.dialogTitle}</h2>
          <button
            type="button"
            className="engawa-dialog__close"
            onClick={() => {
              emit({ name: "ask_agent_close", pageType: context.type, pagePath }, onEvent);
              onClose();
            }}
            aria-label={labels.close}
          >
            ×
          </button>
        </header>
        <p id={descId} className="engawa-dialog__description">{labels.dialogDescription}</p>

        <AgentProviderPicker
          providers={providers}
          labels={labels}
          selectedId={selected?.id ?? null}
          onSelect={handleSelectProvider}
        />

        {selected ? (
          <ProviderActions
            provider={selected}
            labels={labels}
            onCopyMcp={handleCopyMcp}
            onCopyContext={handleCopyContext}
            onCopyConnectionDetails={handleCopyConnectionDetails}
            onShowInstructions={handleShowInstructions}
            onOpenProvider={handleOpenProvider}
            showInstructions={showInstructions}
            copiedMcp={copiedMcp}
            copiedContext={copiedContext}
            copiedConnection={copiedConnection}
          />
        ) : null}

        <McpConnectionPanel
          mcpUrl={mcpUrl}
          labels={labels}
          onCopyMcp={handleCopyMcp}
          copied={copiedMcp}
          whatCanAccessHref={whatCanAccessHref}
        />
      </div>
    </div>
  );
}

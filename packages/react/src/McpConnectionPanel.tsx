import type { AskYourAgentLabels } from "./types.js";

type McpConnectionPanelProps = {
  mcpUrl: string;
  labels: AskYourAgentLabels;
  onCopyMcp: () => void;
  copied: boolean;
  whatCanAccessHref?: string;
};

export function McpConnectionPanel({
  mcpUrl,
  labels,
  onCopyMcp,
  copied,
  whatCanAccessHref,
}: McpConnectionPanelProps) {
  return (
    <div className="engawa-mcp-panel" data-engawa-mcp-panel>
      <hr className="engawa-mcp-panel__rule" />
      <p className="engawa-mcp-panel__label">{labels.mcpEndpointLabel}</p>
      <div className="engawa-mcp-panel__row">
        <code className="engawa-mcp-panel__url">{mcpUrl}</code>
        <button type="button" className="engawa-mcp-panel__copy" onClick={onCopyMcp}>
          {copied ? labels.copied : labels.copyMcpUrl}
        </button>
      </div>
      {whatCanAccessHref ? (
        <a className="engawa-mcp-panel__link" href={whatCanAccessHref} rel="noopener noreferrer">
          {labels.whatCanAccess}
        </a>
      ) : null}
    </div>
  );
}

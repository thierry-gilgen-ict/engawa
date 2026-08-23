import { useState } from "react";
import { AgentConnectDialog } from "./AgentConnectDialog.js";
import { DEFAULT_PROVIDERS } from "./providers.js";
import type { AskYourAgentProps } from "./types.js";

export function AskYourAgent({
  mcpUrl,
  context,
  providers = DEFAULT_PROVIDERS,
  labels,
  onEvent,
  className,
  triggerClassName,
  pagePath,
}: AskYourAgentProps) {
  const [open, setOpen] = useState(false);
  const enrichedContext = { ...context, mcpUrl: context.mcpUrl ?? mcpUrl };

  function handleOpen() {
    setOpen(true);
    onEvent?.({
      name: "ask_agent_open",
      pageType: enrichedContext.type,
      pagePath,
    });
  }

  function handleClose() {
    setOpen(false);
  }

  const whatCanAccessHref = "/agents";

  return (
    <div className={className ?? "engawa-ask-your-agent"} data-engawa-ask-your-agent>
      <button
        type="button"
        className={triggerClassName ?? "engawa-ask-your-agent__trigger"}
        onClick={handleOpen}
        aria-haspopup="dialog"
      >
        {labels.trigger}
      </button>
      <AgentConnectDialog
        open={open}
        onClose={handleClose}
        mcpUrl={mcpUrl}
        context={enrichedContext}
        providers={providers}
        labels={labels}
        onEvent={onEvent}
        pagePath={pagePath}
        whatCanAccessHref={whatCanAccessHref}
      />
    </div>
  );
}

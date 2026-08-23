import { useState } from "react";
import type { AgentReadyMarkProps } from "./types.js";

export function AgentReadyMark({ labels, onClick, className }: AgentReadyMarkProps) {
  return (
    <button
      type="button"
      className={className ?? "engawa-agent-ready-mark"}
      onClick={onClick}
      data-engawa-agent-ready-mark
    >
      {labels.trigger}
    </button>
  );
}

import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AskYourAgent } from "./AskYourAgent.js";
import { TEST_LABELS } from "./engawa-react.logic.test.js";

describe("AskYourAgent", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders generic MCP provider option", async () => {
    render(
      <AskYourAgent
        mcpUrl="https://example.com/mcp"
        context={{ type: "page", siteName: "Example" }}
        labels={TEST_LABELS}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: TEST_LABELS.trigger }));
    expect(screen.getByRole("option", { name: "Other MCP client" })).toBeTruthy();
  });

  it("fires onEvent when dialog opens", () => {
    const onEvent = vi.fn();
    render(
      <AskYourAgent
        mcpUrl="https://example.com/mcp"
        context={{ type: "site", siteName: "Example" }}
        labels={TEST_LABELS}
        onEvent={onEvent}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: TEST_LABELS.trigger }));
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ask_agent_open", pageType: "site" }),
    );
  });

  it("closes on Escape", async () => {
    render(
      <AskYourAgent
        mcpUrl="https://example.com/mcp"
        context={{ type: "page", siteName: "Example" }}
        labels={TEST_LABELS}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: TEST_LABELS.trigger }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("copy MCP URL fires event", async () => {
    const onEvent = vi.fn();
    render(
      <AskYourAgent
        mcpUrl="https://example.com/mcp"
        context={{ type: "page", siteName: "Example" }}
        labels={TEST_LABELS}
        onEvent={onEvent}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: TEST_LABELS.trigger }));
    const copyButtons = screen.getAllByRole("button", { name: TEST_LABELS.copyMcpUrl });
    fireEvent.click(copyButtons[0]);
    await waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "ask_agent_mcp_copied",
          action: "COPY_MCP_URL",
        }),
      );
    });
  });

  it("cursor provider shows copy MCP config action", () => {
    render(
      <AskYourAgent
        mcpUrl="https://example.com/mcp"
        context={{ type: "page", siteName: "Example" }}
        labels={TEST_LABELS}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: TEST_LABELS.trigger }));
    fireEvent.click(screen.getByRole("option", { name: "Cursor" }));
    expect(screen.getByRole("button", { name: TEST_LABELS.copyConnectionDetails })).toBeTruthy();
  });

  it("trigger has accessible name", () => {
    render(
      <AskYourAgent
        mcpUrl="https://example.com/mcp"
        context={{ type: "generic" }}
        labels={TEST_LABELS}
      />,
    );
    expect(screen.getByRole("button", { name: TEST_LABELS.trigger })).toBeTruthy();
  });
});

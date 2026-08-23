import { describe, expect, it } from "vitest";
import { assertSafeContext, buildCursorMcpConfig, buildHandoffMessage } from "./context.js";
import { DEFAULT_PROVIDERS, hasAction } from "./providers.js";
import type { AskYourAgentLabels } from "./types.js";

describe("buildHandoffMessage", () => {
  it("builds article context with title and canonical URL", () => {
    const message = buildHandoffMessage({
      type: "article",
      title: "Test Note",
      canonicalUrl: "https://example.com/field-notes/test",
      siteName: "Example Site",
      mcpUrl: "https://example.com/mcp",
    });
    expect(message).toContain("Test Note");
    expect(message).toContain("https://example.com/field-notes/test");
    expect(message).toContain("https://example.com/mcp");
  });

  it("rejects forbidden context keys", () => {
    expect(() =>
      assertSafeContext({
        type: "page",
        sessionId: "secret",
      } as never),
    ).toThrow(/forbidden key/i);
  });
});

describe("buildCursorMcpConfig", () => {
  it("produces valid JSON with MCP URL", () => {
    const json = buildCursorMcpConfig("https://example.com/mcp", "site-mcp");
    const parsed = JSON.parse(json);
    expect(parsed.mcpServers["site-mcp"].url).toBe("https://example.com/mcp");
  });
});

describe("DEFAULT_PROVIDERS", () => {
  it("always includes generic MCP option", () => {
    expect(DEFAULT_PROVIDERS.some((p) => p.id === "generic")).toBe(true);
  });

  it("cursor shows copy connection details not direct handoff", () => {
    const cursor = DEFAULT_PROVIDERS.find((p) => p.id === "cursor");
    expect(cursor).toBeDefined();
    expect(hasAction(cursor!, "COPY_CONNECTION_DETAILS")).toBe(true);
    expect(hasAction(cursor!, "DIRECT_HANDOFF")).toBe(false);
  });

  it("chatgpt does not claim direct handoff", () => {
    const chatgpt = DEFAULT_PROVIDERS.find((p) => p.id === "chatgpt");
    expect(chatgpt).toBeDefined();
    expect(hasAction(chatgpt!, "DIRECT_HANDOFF")).toBe(false);
    expect(hasAction(chatgpt!, "OPEN_PROVIDER")).toBe(true);
  });
});

export const TEST_LABELS: AskYourAgentLabels = {
  trigger: "Ask your agent →",
  dialogTitle: "Bring your agent.",
  dialogDescription: "Use the AI you already work with.",
  providerChatgpt: "ChatGPT",
  providerClaude: "Claude",
  providerGrok: "Grok",
  providerCursor: "Cursor",
  providerGeneric: "Other MCP client",
  copyMcpUrl: "Copy URL",
  copyContext: "Copy context",
  copyConnectionDetails: "Copy MCP config",
  showInstructions: "Setup instructions",
  openProvider: "Open provider",
  openProviderChatgpt: "Open ChatGPT",
  openProviderClaude: "Open Claude",
  openProviderGrok: "Open Grok connectors",
  openProviderCursorDocs: "Cursor MCP docs",
  copied: "Copied",
  mcpEndpointLabel: "Official MCP endpoint",
  whatCanAccess: "What can my agent access? →",
  instructionsTitle: "Setup",
  instructionsChatgpt: "ChatGPT instructions",
  instructionsClaude: "Claude instructions",
  instructionsGrok: "Grok instructions",
  instructionsCursor: "Cursor instructions",
  instructionsGeneric: "Generic instructions",
  close: "Close",
};

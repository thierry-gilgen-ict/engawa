import type { AgentContext } from "./types.js";
import { FORBIDDEN_CONTEXT_KEYS } from "./types.js";

function sanitizeText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Reject context objects that include forbidden private keys.
 */
export function assertSafeContext(context: AgentContext): void {
  const record = context as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_CONTEXT_KEYS.some((forbidden) => lower.includes(forbidden))) {
      throw new Error(`AgentContext contains forbidden key: ${key}`);
    }
  }
}

export function buildHandoffMessage(context: AgentContext): string {
  assertSafeContext(context);

  const siteName = sanitizeText(context.siteName ?? "this site");
  const mcpUrl = context.mcpUrl?.trim() ?? "";
  const title = context.title ? sanitizeText(context.title) : undefined;
  const canonicalUrl = context.canonicalUrl?.trim();

  if (title && canonicalUrl && isSafeUrl(canonicalUrl)) {
    const safeUrl = canonicalUrl;
    const mcpPart = mcpUrl && isSafeUrl(mcpUrl) ? ` Use the site's official agent interface at ${mcpUrl}` : "";
    return `I'm viewing "${title}" on ${siteName}.${mcpPart} Canonical page: ${safeUrl}. Help me understand or discuss this content using only the site's official public information.`;
  }

  if (title) {
    const mcpPart =
      mcpUrl && isSafeUrl(mcpUrl)
        ? ` Use the official agent interface at ${mcpUrl} to access public site information.`
        : "";
    return `I'm exploring ${siteName} — "${title}".${mcpPart}`;
  }

  const mcpPart =
    mcpUrl && isSafeUrl(mcpUrl)
      ? ` The official MCP endpoint is ${mcpUrl}.`
      : "";
  return `I'm exploring ${siteName}.${mcpPart} Help me understand this site using its official public agent interface.`;
}

export function buildCursorMcpConfig(mcpUrl: string, serverLabel = "site-mcp"): string {
  if (!isSafeUrl(mcpUrl)) {
    throw new Error("Invalid MCP URL for Cursor config");
  }
  return JSON.stringify(
    {
      mcpServers: {
        [serverLabel]: {
          url: mcpUrl,
        },
      },
    },
    null,
    2,
  );
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

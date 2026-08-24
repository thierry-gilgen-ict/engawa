import { isMcpPath, lineReferencesMcp } from "./mcp.js";
import { resolveSameOriginLink } from "./url.js";

export function parseLlmsTxt(
  body: string,
  base: URL,
): { urls: string[]; mcpReferenced: boolean; markdownReferenced: boolean } {
  const urls: string[] = [];
  let mcpReferenced = false;
  let markdownReferenced = false;
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (lineReferencesMcp(trimmed)) mcpReferenced = true;
    if (/\.md/i.test(trimmed) || /markdown/i.test(trimmed)) markdownReferenced = true;
    const urlMatch = trimmed.match(/https?:\/\/[^\s)]+/i) ?? trimmed.match(/\(([^)]+)\)/);
    const candidate = urlMatch ? (urlMatch[1] ?? urlMatch[0]) : trimmed;
    try {
      const resolved = resolveSameOriginLink(base, candidate);
      if (resolved) {
        urls.push(resolved.href);
        if (isMcpPath(resolved.pathname)) mcpReferenced = true;
        if (resolved.pathname.toLowerCase().endsWith(".md")) markdownReferenced = true;
      }
    } catch {
      continue;
    }
  }
  return { urls: [...new Set(urls)], mcpReferenced, markdownReferenced };
}

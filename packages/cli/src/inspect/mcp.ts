export function isMcpPath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, "").toLowerCase();
  return p === "/mcp" || p.endsWith("/mcp");
}

export function isMcpUrl(url: string): boolean {
  try {
    return isMcpPath(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function lineReferencesMcp(line: string): boolean {
  if (/\bmcp\b/i.test(line)) return true;
  const urlMatch = line.match(/https?:\/\/[^\s)]+/i) ?? line.match(/\(([^)]+)\)/);
  const candidate = urlMatch ? (urlMatch[1] ?? urlMatch[0]) : "";
  if (candidate && isMcpUrl(candidate)) return true;
  return false;
}

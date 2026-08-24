import { resolveSameOriginLink } from "./url.js";

const LOC_RE = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;

export function extractSitemapUrls(xml: string, base: URL, maxUrls: number): string[] {
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  LOC_RE.lastIndex = 0;
  while ((match = LOC_RE.exec(xml)) !== null && urls.length < maxUrls) {
    const loc = match[1].trim();
    const resolved = resolveSameOriginLink(base, loc);
    if (resolved) urls.push(resolved.href);
  }
  return urls;
}

const SITEMAP_LINE_RE = /^Sitemap:\s*(.+)$/gim;

export function extractRobotsSitemapUrls(robots: string, base: URL): string[] {
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  SITEMAP_LINE_RE.lastIndex = 0;
  while ((match = SITEMAP_LINE_RE.exec(robots)) !== null) {
    const loc = match[1].trim();
    const resolved = resolveSameOriginLink(base, loc);
    if (resolved) urls.push(resolved.href);
  }
  return urls;
}

export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex/i.test(xml);
}

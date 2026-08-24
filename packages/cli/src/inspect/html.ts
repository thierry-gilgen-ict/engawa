import { parse } from "node-html-parser";
import type { ParsedHtml } from "./types.js";
import { resolveSameOriginLink } from "./url.js";

export function parseHtmlDocument(html: string, baseUrl: URL): ParsedHtml {
  const root = parse(html);
  const title = root.querySelector("title")?.text.trim() || undefined;
  const htmlLang = root.getAttribute("lang")?.trim() || undefined;

  const canonical = root.querySelector('link[rel="canonical"]');
  const canonicalHref = canonical?.getAttribute("href");
  const canonicalUrl = canonicalHref
    ? resolveSameOriginLink(baseUrl, canonicalHref)?.href
    : undefined;

  const metaDescription =
    root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || undefined;
  const generator =
    root.querySelector('meta[name="generator"]')?.getAttribute("content")?.trim() || undefined;

  const links: string[] = [];
  const markdownAlternates: string[] = [];
  const hreflang: string[] = [];

  for (const link of root.querySelectorAll("link")) {
    const rel = (link.getAttribute("rel") ?? "").toLowerCase();
    const href = link.getAttribute("href");
    if (!href) continue;
    const type = (link.getAttribute("type") ?? "").toLowerCase();
    if (rel.includes("alternate")) {
      if (type.includes("markdown") || href.toLowerCase().endsWith(".md")) {
        const resolved = resolveSameOriginLink(baseUrl, href);
        if (resolved) markdownAlternates.push(resolved.href);
      }
      const hrefLangAttr = link.getAttribute("hreflang");
      if (hrefLangAttr) hreflang.push(hrefLangAttr.trim());
    }
  }

  for (const anchor of root.querySelectorAll("a")) {
    const href = anchor.getAttribute("href");
    if (!href) continue;
    const resolved = resolveSameOriginLink(baseUrl, href);
    if (resolved) links.push(resolved.href);
    if (href.toLowerCase().endsWith(".md")) {
      if (resolved) markdownAlternates.push(resolved.href);
    }
  }

  return {
    title,
    htmlLang,
    canonicalUrl,
    metaDescription,
    generator,
    links,
    markdownAlternates: [...new Set(markdownAlternates)],
    hreflang: [...new Set(hreflang)],
  };
}

export function detectAgentPageLinks(parsed: ParsedHtml, baseUrl: URL): string[] {
  const evidence: string[] = [];
  for (const href of parsed.links) {
    try {
      const u = new URL(href);
      const path = u.pathname.toLowerCase();
      if (path === "/agents" || path === "/agents/" || path.endsWith("/agents")) {
        evidence.push(href);
      }
    } catch {
      continue;
    }
  }
  if (baseUrl.pathname.toLowerCase().replace(/\/$/, "") === "/agents") {
    evidence.push(baseUrl.href);
  }
  return [...new Set(evidence)];
}

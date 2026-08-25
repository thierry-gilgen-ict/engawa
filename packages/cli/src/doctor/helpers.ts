import { createHash } from "node:crypto";
import { sanitizeTerminalText } from "../sanitize.js";
import { MAX_EVIDENCE_TEXT } from "./types.js";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function evidenceText(input: string, max = MAX_EVIDENCE_TEXT): string {
  return sanitizeTerminalText(input, max);
}

export function stableSortStrings(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function contentTypeIsHtml(contentType: string): boolean {
  return /text\/html/i.test(contentType);
}

export function contentTypeIsTextLike(contentType: string): boolean {
  if (!contentType) return true;
  return /text\/|application\/(json|xml)|markdown/i.test(contentType);
}

export function contentTypeIsMarkdown(contentType: string): boolean {
  return /text\/markdown|text\/x-markdown|text\/plain/i.test(contentType);
}

/** Normalize a URL to comparable site-root form, or null if not a root URL. */
export function normalizeSiteRootUrl(input: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const path = parsed.pathname === "" || parsed.pathname === "/" ? "/" : parsed.pathname;
  if (path !== "/") return null;
  if (parsed.search || parsed.hash) return null;
  return `${parsed.origin}/`;
}

export function expectedCanonicalRoot(options: {
  canonicalUrl?: string;
  finalUrl: string;
  origin: string;
}): string {
  const candidates = [options.canonicalUrl, options.finalUrl, options.origin];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return `${parsed.origin}/`;
      }
    } catch {
      continue;
    }
  }
  return `${options.origin}/`;
}

/** Extract absolute http(s) URLs from llms body (evidence only; not a fetch list). */
export function extractAbsoluteUrls(body: string): string[] {
  const found = body.match(/https?:\/\/[^\s)<>"']+/gi) ?? [];
  return [...new Set(found.map((u) => u.replace(/[.,;:]+$/, "")))];
}

export function llmsContainsCanonicalSiteRoot(body: string, expectedRoot: string): boolean {
  const expected = normalizeSiteRootUrl(expectedRoot);
  if (!expected) return false;
  for (const raw of extractAbsoluteUrls(body)) {
    const root = normalizeSiteRootUrl(raw);
    if (root === expected) return true;
  }
  return false;
}

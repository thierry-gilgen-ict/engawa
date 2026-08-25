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

import type { HTMLElement, NodeType, TextNode } from "node-html-parser";
import { absolutizeHref } from "./links.js";

const STRIP_TAGS = new Set(["script", "style", "noscript", "template"]);

function isTextNode(node: { nodeType: NodeType }): node is TextNode {
  return node.nodeType === 3;
}

function isElement(node: { nodeType: NodeType }): node is HTMLElement {
  return node.nodeType === 1;
}

function preserveTextNodeSpacing(text: string): string {
  return text.replace(/[\t\r\f\v]+/g, " ").replace(/ +/g, " ");
}

function normalizeBlockText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripDisallowedDescendants(root: HTMLElement): void {
  for (const tag of STRIP_TAGS) {
    root.querySelectorAll(tag).forEach((el) => el.remove());
  }
}

function convertInline(node: HTMLElement, pageBaseUrl: string): string {
  const parts: string[] = [];
  for (const child of node.childNodes) {
    if (isTextNode(child)) {
      const text = preserveTextNodeSpacing(child.rawText);
      if (text.length > 0) parts.push(text);
      continue;
    }
    if (!isElement(child)) continue;
    const tag = child.tagName?.toLowerCase();
    if (!tag) continue;
    if (tag === "strong" || tag === "b") {
      const inner = convertInline(child, pageBaseUrl);
      if (inner) parts.push(`**${inner}**`);
    } else if (tag === "em" || tag === "i") {
      const inner = convertInline(child, pageBaseUrl);
      if (inner) parts.push(`*${inner}*`);
    } else if (tag === "code") {
      const inner = preserveTextNodeSpacing(child.text);
      if (inner) parts.push(`\`${inner}\``);
    } else if (tag === "a") {
      const href = child.getAttribute("href") ?? "";
      const label = convertInline(child, pageBaseUrl) || href;
      const url = absolutizeHref(href, pageBaseUrl);
      parts.push(`[${label}](${url})`);
    } else {
      parts.push(convertInline(child, pageBaseUrl));
    }
  }
  return parts.join("").replace(/^\s+/, "").replace(/\s+$/, "");
}

function convertBlockList(listEl: HTMLElement, ordered: boolean, pageBaseUrl: string): string {
  const items = listEl.childNodes.filter(
    (n) => isElement(n) && n.tagName?.toLowerCase() === "li",
  ) as HTMLElement[];
  const lines: string[] = [];
  items.forEach((li, index) => {
    const prefix = ordered ? `${index + 1}. ` : "- ";
    const inner = convertBlocks(li, pageBaseUrl).replace(/\n+/g, " ").trim();
    lines.push(`${prefix}${inner}`);
  });
  return lines.join("\n");
}

function convertBlocks(container: HTMLElement, pageBaseUrl: string): string {
  const blocks: string[] = [];

  for (const child of container.childNodes) {
    if (isTextNode(child)) {
      const text = normalizeBlockText(child.rawText);
      if (text) blocks.push(text);
      continue;
    }
    if (!isElement(child)) continue;
    const tag = child.tagName?.toLowerCase();
    if (!tag) continue;

    if (
      tag === "h1" ||
      tag === "h2" ||
      tag === "h3" ||
      tag === "h4" ||
      tag === "h5" ||
      tag === "h6"
    ) {
      const level = Number(tag[1]);
      const text = convertInline(child, pageBaseUrl);
      if (text) blocks.push(`${"#".repeat(level)} ${text}`);
    } else if (tag === "p") {
      const text = convertInline(child, pageBaseUrl);
      if (text) blocks.push(text);
    } else if (tag === "ul") {
      const list = convertBlockList(child, false, pageBaseUrl);
      if (list) blocks.push(list);
    } else if (tag === "ol") {
      const list = convertBlockList(child, true, pageBaseUrl);
      if (list) blocks.push(list);
    } else if (tag === "pre") {
      const codeEl = child.querySelector("code");
      const codeText = codeEl ? codeEl.text : child.text;
      const trimmed = codeText.replace(/\n$/, "");
      blocks.push(`\`\`\`\n${trimmed}\n\`\`\``);
    } else if (tag === "blockquote") {
      const inner = convertBlocks(child, pageBaseUrl);
      if (inner) {
        blocks.push(
          inner
            .split("\n")
            .map((line) => (line ? `> ${line}` : ">"))
            .join("\n"),
        );
      }
    } else if (tag === "div" || tag === "section" || tag === "article") {
      const inner = convertBlocks(child, pageBaseUrl);
      if (inner) blocks.push(inner);
    } else {
      const inner = convertInline(child, pageBaseUrl);
      if (inner) blocks.push(inner);
    }
  }

  return normalizeMarkdown(blocks.join("\n\n"));
}

export function normalizeMarkdown(markdown: string): string {
  const lines = markdown.split("\n");
  const normalized: string[] = [];
  let blankPending = false;
  for (const line of lines) {
    const trimmedEnd = line.replace(/\s+$/g, "");
    if (trimmedEnd.trim() === "") {
      if (!blankPending && normalized.length > 0) {
        blankPending = true;
        normalized.push("");
      }
      continue;
    }
    blankPending = false;
    normalized.push(trimmedEnd);
  }
  return normalized.join("\n").trim();
}

export function htmlMainToMarkdown(mainEl: HTMLElement, pageBaseUrl: string): string {
  stripDisallowedDescendants(mainEl);
  const markdown = convertBlocks(mainEl, pageBaseUrl);
  if (!markdown) {
    throw new Error("Content selector matched an element with no extractable content");
  }
  return markdown;
}

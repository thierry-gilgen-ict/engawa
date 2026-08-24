import type { FrameworkHint, ParsedHtml } from "./types.js";

export function detectFrameworkHints(
  parsed: ParsedHtml,
  headers: Record<string, string>,
  htmlBody: string,
): FrameworkHint[] {
  const hints: FrameworkHint[] = [];
  const lowerHtml = htmlBody.toLowerCase();

  if (lowerHtml.includes("/_next/") || lowerHtml.includes("__next_data__")) {
    hints.push({
      name: "nextjs",
      confidence: "high",
      evidence: ["_next asset path or __NEXT_DATA__"],
    });
  } else if (lowerHtml.includes("/_astro/")) {
    hints.push({ name: "astro", confidence: "high", evidence: ["_astro asset path"] });
  } else if (lowerHtml.includes("/_nuxt/") || lowerHtml.includes("__nuxt")) {
    hints.push({ name: "nuxt", confidence: "high", evidence: ["_nuxt markers"] });
  } else if (lowerHtml.includes("/_sveltekit/") || lowerHtml.includes("__sveltekit")) {
    hints.push({ name: "sveltekit", confidence: "high", evidence: ["sveltekit markers"] });
  }

  if (parsed.generator?.toLowerCase().includes("wordpress")) {
    hints.push({
      name: "wordpress",
      confidence: "high",
      evidence: [`generator: ${parsed.generator}`],
    });
  } else if (lowerHtml.includes("wp-content") || lowerHtml.includes("wp-includes")) {
    hints.push({
      name: "wordpress",
      confidence: "medium",
      evidence: ["wp-content or wp-includes paths"],
    });
  }

  const powered = headers["x-powered-by"]?.toLowerCase() ?? "";
  if (powered.includes("next")) {
    hints.push({
      name: "nextjs",
      confidence: "medium",
      evidence: [`x-powered-by: ${headers["x-powered-by"]}`],
    });
  }

  if (hints.length === 0 && htmlBody.length > 0) {
    hints.push({
      name: "generic/static",
      confidence: "low",
      evidence: ["no strong framework markers observed"],
    });
  }

  const seen = new Set<string>();
  return hints.filter((h) => {
    if (seen.has(h.name)) return false;
    seen.add(h.name);
    return true;
  });
}

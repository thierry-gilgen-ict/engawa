import type { EngawaConfig } from "@thierry-gilgen-ict/engawa-core";

export type {
  LlmsTxtBuildResult,
  LlmsTxtOptions,
  LlmsTxtOverflowPolicy,
  LlmsTxtWarning,
  LlmsTxtWarningCode,
} from "./llms-txt.js";
export { buildLlmsTxt, generateLlmsTxt } from "./llms-txt.js";

export interface DiscoveryLink {
  rel: "alternate" | "describedby";
  href: string;
  type?: string;
}

export function getLlmsTxtUrl(config: EngawaConfig, basePath = "/llms.txt"): string {
  const path = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return `${config.site.canonicalUrl}${path}`;
}

export function getDiscoveryLinks(
  config: EngawaConfig,
  markdownAlternateUrl?: string,
  llmsTxtPath = "/llms.txt",
): DiscoveryLink[] {
  const links: DiscoveryLink[] = [
    {
      rel: "describedby",
      href: getLlmsTxtUrl(config, llmsTxtPath),
    },
  ];

  if (markdownAlternateUrl) {
    links.unshift({
      rel: "alternate",
      href: markdownAlternateUrl,
      type: "text/markdown",
    });
  }

  return links;
}

export function formatLinkHeader(links: DiscoveryLink[]): string {
  return links
    .map((link) => {
      const parts = [`<${link.href}>`, `rel="${link.rel}"`];
      if (link.type) parts.push(`type="${link.type}"`);
      return parts.join("; ");
    })
    .join(", ");
}

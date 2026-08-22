import type { EngawaConfig, EngawaResource } from "@thierry-gilgen-ict/engawa-core";

export interface DiscoveryLink {
  rel: "alternate" | "describedby";
  href: string;
  type?: string;
}

export interface LlmsTxtOptions {
  mcpPath?: string;
  optionalResourceIds?: string[];
}

export function generateLlmsTxt(
  config: EngawaConfig,
  resources: EngawaResource[],
  options: LlmsTxtOptions = {},
): string {
  const mcpPath = options.mcpPath ?? "/mcp";
  const optionalIds = new Set(options.optionalResourceIds ?? []);
  const primary = resources.filter((r) => !optionalIds.has(r.id));
  const optional = resources.filter((r) => optionalIds.has(r.id));

  const lines: string[] = [
    `# ${config.site.name}`,
    `> ${config.site.description}`,
    "",
    `${config.site.name} provides machine-readable content for AI agents.`,
    "",
    "Agents should read this file, follow links to detailed markdown pages, and use the MCP endpoint for structured search.",
    "",
    `- MCP endpoint: ${config.site.canonicalUrl}${mcpPath.startsWith("/") ? mcpPath : `/${mcpPath}`}`,
    "- Public agent interface is read-only in v0.1.",
    "",
    "## Pages",
    ...primary.map((r) => formatListItem(r)),
  ];

  if (optional.length > 0) {
    lines.push("", "## Optional", ...optional.map((r) => formatListItem(r)));
  }

  return lines.join("\n").trimEnd() + "\n";
}

function formatListItem(resource: EngawaResource): string {
  const note = resource.description ? `: ${resource.description}` : "";
  return `- [${resource.title}](${resource.canonicalUrl})${note}`;
}

export function getLlmsTxtUrl(config: EngawaConfig, basePath = "/llms.txt"): string {
  const path = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return `${config.site.canonicalUrl}${path}`;
}

export function getDiscoveryLinks(
  config: EngawaConfig,
  pageCanonicalUrl: string,
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

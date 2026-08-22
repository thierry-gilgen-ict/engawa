import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { buildResourceUri, type Engawa, type EngawaResource } from "@thierry-gilgen-ict/engawa-core";
import * as z from "zod/v4";

const META_RESOURCE_ID = "_meta";

const searchInputSchema = z.object({
  query: z.string().min(1).max(200).describe("Search query for site content"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Maximum number of results (default 10)"),
});

const searchResultSchema = z.object({
  results: z.array(
    z.object({
      uri: z.string(),
      title: z.string(),
      description: z.string().optional(),
      canonicalUrl: z.string(),
    }),
  ),
});

export async function createEngawaMcpServer(engawa: Engawa): Promise<McpServer> {
  const server = new McpServer({
    name: "engawa",
    version: engawa.metadata.engawaVersion,
  });

  const metaUri = buildResourceUri(engawa.config.site.canonicalUrl, META_RESOURCE_ID);

  server.registerResource(
    "engawa-meta",
    metaUri,
    {
      title: "Engawa agent interface metadata",
      description: "Version and implementation profile for this Engawa endpoint",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify({
            engawaVersion: engawa.metadata.engawaVersion,
            implementationProfile: engawa.metadata.implementationProfile,
            mcpProtocolBaseline: engawa.metadata.mcpProtocolBaseline,
            site: {
              name: engawa.config.site.name,
              canonicalUrl: engawa.config.site.canonicalUrl,
            },
            security: engawa.config.security,
          }),
        },
      ],
    }),
  );

  const resources = await engawa.listResources();
  for (const resource of resources) {
    registerEngawaResource(server, resource);
  }

  server.registerTool(
    "search_site",
    {
      title: "Search site content",
      description: "Search public site content registered with Engawa (read-only)",
      annotations: { readOnlyHint: true },
      inputSchema: searchInputSchema,
      outputSchema: searchResultSchema,
    },
    async ({ query, limit }) => {
      const max = limit ?? engawa.config.content.maxSearchResults;
      const results = await engawa.search(query);
      const bounded = results.slice(0, Math.min(max, 10)).map(toSearchHit);
      const output = { results: bounded };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  );

  return server;
}

function registerEngawaResource(server: McpServer, resource: EngawaResource): void {
  server.registerResource(
    `resource-${resource.id}`,
    resource.uri,
    {
      title: resource.title,
      description: resource.description,
      mimeType: resource.mimeType,
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: resource.mimeType,
          text: resource.content,
        },
      ],
    }),
  );
}

function toSearchHit(resource: EngawaResource) {
  return {
    uri: resource.uri,
    title: resource.title,
    description: resource.description,
    canonicalUrl: resource.canonicalUrl,
  };
}

export function createEngawaMcpHandler(engawa: Engawa) {
  return createMcpHandler(() => createEngawaMcpServer(engawa));
}

import { z } from "zod";

export const ENGAWA_VERSION = "0.1.0";
export const IMPLEMENTATION_PROFILE_VERSION = "0.1";
export const MCP_PROTOCOL_BASELINE = "2026-07-28";

/** Documented absolute safety ceilings for Engawa config (not hidden MCP-specific limits). */
export const MAX_SEARCH_QUERY_LENGTH_CEILING = 500;
export const MAX_SEARCH_RESULTS_CEILING = 50;

const httpAbsoluteUrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
    message: "canonicalUrl must be an absolute http(s) URL",
  });

export const resourceIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Resource id must contain only letters, digits, dots, underscores, and hyphens",
  );

export const engawaConfigSchema = z.object({
  site: z.object({
    name: z.string().min(1),
    canonicalUrl: httpAbsoluteUrlSchema,
    description: z.string().min(1),
    language: z.string().min(1).default("en"),
  }),
  agentInterface: z.object({
    enabled: z.boolean(),
    public: z.boolean(),
  }),
  content: z
    .object({
      maxResourceBytes: z.number().int().positive().default(65536),
      maxSearchResults: z.number().int().positive().max(MAX_SEARCH_RESULTS_CEILING).default(10),
      maxSearchQueryLength: z
        .number()
        .int()
        .positive()
        .max(MAX_SEARCH_QUERY_LENGTH_CEILING)
        .default(200),
    })
    .default({
      maxResourceBytes: 65536,
      maxSearchResults: 10,
      maxSearchQueryLength: 200,
    }),
  security: z.object({
    publicDefault: z.literal("read-only"),
  }),
  metadata: z.object({
    version: z.string().min(1),
  }),
});

export type EngawaConfig = z.infer<typeof engawaConfigSchema>;

export const engawaResourceSchema = z.object({
  id: resourceIdSchema,
  uri: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  mimeType: z.string().min(1),
  content: z.string(),
  canonicalUrl: httpAbsoluteUrlSchema,
  lastModified: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type EngawaResource = z.infer<typeof engawaResourceSchema>;

export interface ContentAdapter {
  listResources(): Promise<EngawaResource[]>;
  getResource(idOrUri: string): Promise<EngawaResource | undefined>;
  search(query: string): Promise<EngawaResource[]>;
}

export interface AgentInterfaceMetadata {
  engawaVersion: string;
  implementationProfile: string;
  mcpProtocolBaseline: string;
}

export interface Engawa {
  readonly config: EngawaConfig;
  readonly adapter: ContentAdapter;
  readonly metadata: AgentInterfaceMetadata;
  listResources(): Promise<EngawaResource[]>;
  getResource(idOrUri: string): Promise<EngawaResource | undefined>;
  search(query: string): Promise<EngawaResource[]>;
}

export function validateResourceId(id: string): string {
  return resourceIdSchema.parse(id);
}

export function normalizeCanonicalUrl(url: string): string {
  const parsed = new URL(url);

  if (parsed.username || parsed.password) {
    throw new Error("canonicalUrl must not contain username or password credentials");
  }
  if (parsed.search) {
    throw new Error("canonicalUrl must not contain a query string");
  }
  if (parsed.hash) {
    throw new Error("canonicalUrl must not contain a fragment");
  }

  let path = parsed.pathname;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  parsed.pathname = path;

  const normalized = parsed.toString().replace(/\/$/, "");
  return normalized || parsed.origin;
}

export function getCanonicalPath(canonicalUrl: string): string {
  const pathname = new URL(canonicalUrl).pathname;
  if (pathname === "/" || pathname === "") {
    return "";
  }
  return pathname;
}

export function buildResourceUri(canonicalUrl: string, id: string): string {
  validateResourceId(id);
  const parsed = new URL(canonicalUrl);
  const path = getCanonicalPath(canonicalUrl);
  const encodedId = encodeURIComponent(id);
  return `engawa://${parsed.host}${path}/r/${encodedId}`;
}

export function validateEngawaConfig(input: unknown): EngawaConfig {
  const parsed = engawaConfigSchema.parse(input);
  const canonicalUrl = normalizeCanonicalUrl(parsed.site.canonicalUrl);
  return {
    ...parsed,
    site: {
      ...parsed.site,
      canonicalUrl,
    },
  };
}

export function validateAdapterResource(raw: unknown, config: EngawaConfig): EngawaResource {
  const resource = engawaResourceSchema.parse(raw);
  const siteBase = config.site.canonicalUrl;

  const expectedUri = buildResourceUri(siteBase, resource.id);
  if (resource.uri !== expectedUri) {
    throw new Error(
      `Resource URI mismatch for id "${resource.id}": expected "${expectedUri}", got "${resource.uri}"`,
    );
  }

  const normalizedPageUrl = normalizeCanonicalUrl(resource.canonicalUrl);
  if (normalizedPageUrl !== siteBase && !normalizedPageUrl.startsWith(`${siteBase}/`)) {
    throw new Error(
      `Resource canonicalUrl "${resource.canonicalUrl}" is outside site base "${siteBase}"`,
    );
  }

  return { ...resource, canonicalUrl: normalizedPageUrl };
}

function enforceContentBounds(resource: EngawaResource, maxBytes: number): EngawaResource {
  const byteLength = Buffer.byteLength(resource.content, "utf8");
  if (byteLength > maxBytes) {
    throw new Error(
      `Resource "${resource.id}" exceeds maxResourceBytes (${byteLength} > ${maxBytes})`,
    );
  }
  return resource;
}

function normalizeSearchQuery(query: string, maxLength: number): string {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new Error("Search query must not be empty");
  }
  if (trimmed.length > maxLength) {
    throw new Error(`Search query exceeds max length (${trimmed.length} > ${maxLength})`);
  }
  for (const char of trimmed) {
    const code = char.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      throw new Error("Search query contains invalid control characters");
    }
  }
  return trimmed;
}

function validateAndBoundResource(
  raw: unknown,
  config: EngawaConfig,
  maxBytes: number,
): EngawaResource {
  return enforceContentBounds(validateAdapterResource(raw, config), maxBytes);
}

export function createEngawa(configInput: unknown, adapter: ContentAdapter): Engawa {
  const config = validateEngawaConfig(configInput);
  const maxBytes = config.content.maxResourceBytes;
  const maxResults = config.content.maxSearchResults;
  const maxQueryLength = config.content.maxSearchQueryLength;

  const metadata: AgentInterfaceMetadata = {
    engawaVersion: ENGAWA_VERSION,
    implementationProfile: IMPLEMENTATION_PROFILE_VERSION,
    mcpProtocolBaseline: MCP_PROTOCOL_BASELINE,
  };

  return {
    config,
    adapter,
    metadata,
    async listResources(): Promise<EngawaResource[]> {
      const resources = await adapter.listResources();
      return resources.map((r) => validateAndBoundResource(r, config, maxBytes));
    },
    async getResource(idOrUri: string): Promise<EngawaResource | undefined> {
      const resource = await adapter.getResource(idOrUri);
      if (!resource) return undefined;
      return validateAndBoundResource(resource, config, maxBytes);
    },
    async search(query: string): Promise<EngawaResource[]> {
      const normalized = normalizeSearchQuery(query, maxQueryLength);
      const results = await adapter.search(normalized);
      return results.slice(0, maxResults).map((r) => validateAndBoundResource(r, config, maxBytes));
    },
  };
}

export { StaticContentAdapter, type StaticResourceInput } from "./static-adapter.js";

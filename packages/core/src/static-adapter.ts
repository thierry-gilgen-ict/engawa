import {
  buildResourceUri,
  type EngawaResource,
  normalizeCanonicalUrl,
  validateResourceId,
} from "./index.js";

export interface StaticResourceInput {
  id: string;
  title: string;
  description?: string;
  mimeType?: string;
  content: string;
  path?: string;
  lastModified?: string;
  metadata?: Record<string, unknown>;
}

export class StaticContentAdapter {
  private readonly resources: Map<string, EngawaResource>;
  private readonly uriIndex: Map<string, string>;

  constructor(canonicalUrl: string, inputs: StaticResourceInput[]) {
    const normalizedBase = normalizeCanonicalUrl(canonicalUrl);
    this.resources = new Map();
    this.uriIndex = new Map();

    for (const input of inputs) {
      const id = validateResourceId(input.id);
      if (this.resources.has(id)) {
        throw new Error(`Duplicate resource id "${id}"`);
      }

      const path = input.path ?? `/${id}.md`;
      const canonical = `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
      const resource: EngawaResource = {
        id,
        uri: buildResourceUri(normalizedBase, id),
        title: input.title,
        description: input.description,
        mimeType: input.mimeType ?? "text/markdown",
        content: input.content,
        canonicalUrl: canonical,
        lastModified: input.lastModified,
        metadata: input.metadata,
      };
      this.resources.set(resource.id, resource);
      this.uriIndex.set(resource.uri, resource.id);
    }
  }

  async listResources(): Promise<EngawaResource[]> {
    return Array.from(this.resources.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  async getResource(idOrUri: string): Promise<EngawaResource | undefined> {
    const byId = this.resources.get(idOrUri);
    if (byId) return byId;
    const id = this.uriIndex.get(idOrUri);
    if (id) return this.resources.get(id);
    return undefined;
  }

  async search(query: string): Promise<EngawaResource[]> {
    const lower = query.toLowerCase();
    const matches = Array.from(this.resources.values()).filter((resource) => {
      const haystack = [resource.id, resource.title, resource.description ?? "", resource.content]
        .join(" ")
        .toLowerCase();
      return haystack.includes(lower);
    });
    return matches.sort((a, b) => a.id.localeCompare(b.id));
  }
}

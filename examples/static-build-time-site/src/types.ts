export interface ManifestSite {
  name: string;
  canonicalUrl: string;
  description: string;
  language?: string;
}

export interface ManifestResource {
  id: string;
  source: string;
  canonicalPath: string;
  markdownPath: string;
  contentSelector: string;
}

export interface EngawaManifest {
  site: ManifestSite;
  sourceRoot: string;
  outputRoot: string;
  manifestPath: string;
  resources: ManifestResource[];
}

export interface GeneratedResourceTrace {
  sourcePath: string;
  sourceSha256: string;
}

export interface GeneratedResourceRecord {
  id: string;
  title: string;
  description?: string;
  mimeType: string;
  content: string;
  path: string;
  canonicalUrl: string;
  trace: GeneratedResourceTrace;
}

export interface ExtractResult {
  projectRoot: string;
  manifestPath: string;
  outputRoot: string;
  resources: GeneratedResourceRecord[];
  llmsTxtPath: string;
  engawaConfig: Record<string, unknown>;
}

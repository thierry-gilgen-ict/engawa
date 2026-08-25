import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parse } from "node-html-parser";
import {
  buildResourceUri,
  createEngawa,
  normalizeCanonicalUrl,
  StaticContentAdapter,
  type StaticResourceInput,
} from "@thierry-gilgen-ict/engawa-core";
import { generateLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";
import { htmlMainToMarkdown } from "./html-to-markdown.js";
import { loadManifest, defaultManifestPath } from "./manifest.js";
import { outputRelativePath, resolveUnderRoot } from "./paths.js";
import type { ExtractResult, GeneratedResourceRecord } from "./types.js";

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function buildCanonicalUrl(siteUrl: string, canonicalPath: string): string {
  const normalized = normalizeCanonicalUrl(siteUrl);
  if (canonicalPath === "/") {
    return normalized.endsWith("/") ? normalized : `${normalized}/`;
  }
  const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const base = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  return `${base}${path}`;
}

function buildEngawaConfig(manifest: ReturnType<typeof loadManifest>): Record<string, unknown> {
  return {
    site: {
      name: manifest.site.name,
      canonicalUrl: manifest.site.canonicalUrl,
      description: manifest.site.description,
      language: manifest.site.language ?? "en",
    },
    agentInterface: {
      enabled: true,
      public: true,
    },
    content: {
      maxResourceBytes: 65536,
      maxSearchResults: 10,
      maxSearchQueryLength: 200,
    },
    security: {
      publicDefault: "read-only",
    },
    metadata: {
      version: "0.1.0",
    },
  };
}

function extractSingleResource(
  projectRoot: string,
  manifest: ReturnType<typeof loadManifest>,
  resource: {
    id: string;
    source: string;
    canonicalPath: string;
    markdownPath: string;
    contentSelector: string;
  },
): GeneratedResourceRecord {
  const sourceRoot = resolveUnderRoot(projectRoot, manifest.sourceRoot, "sourceRoot");
  const sourceAbs = resolveUnderRoot(
    sourceRoot,
    resource.source,
    `resources[${resource.id}].source`,
  );
  const sourceBytes = readFileSync(sourceAbs);
  const sourceSha256 = sha256Hex(sourceBytes);
  const sourceRel = join(manifest.sourceRoot, resource.source).replace(/\\/g, "/");

  const html = sourceBytes.toString("utf8");
  const root = parse(html);
  const boundary = root.querySelector(resource.contentSelector);
  if (!boundary) {
    throw new Error(
      `Content selector "${resource.contentSelector}" matched nothing in ${resource.source}`,
    );
  }

  const metaDescription =
    root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || undefined;
  const titleFromHead = root.querySelector("title")?.text.trim();

  const siteOrigin = normalizeCanonicalUrl(manifest.site.canonicalUrl);
  const markdown = htmlMainToMarkdown(boundary, siteOrigin);

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || titleFromHead || resource.id;

  const canonicalUrl = buildCanonicalUrl(manifest.site.canonicalUrl, resource.markdownPath);

  return {
    id: resource.id,
    title,
    description: metaDescription,
    mimeType: "text/markdown",
    content: markdown,
    path: resource.markdownPath,
    canonicalUrl,
    trace: {
      sourcePath: sourceRel,
      sourceSha256,
    },
  };
}

export async function runExtractAsync(
  projectRoot: string,
  manifestPath?: string,
): Promise<ExtractResult> {
  const manifestFile = manifestPath ?? defaultManifestPath(projectRoot);
  const manifest = loadManifest(manifestFile);

  const outputRootAbs = resolveUnderRoot(projectRoot, manifest.outputRoot, "outputRoot");
  const manifestOutAbs = resolveUnderRoot(projectRoot, manifest.manifestPath, "manifestPath");

  const generated: GeneratedResourceRecord[] = manifest.resources.map((resource) =>
    extractSingleResource(projectRoot, manifest, resource),
  );

  mkdirSync(outputRootAbs, { recursive: true });
  mkdirSync(dirname(manifestOutAbs), { recursive: true });

  for (const record of generated) {
    const mdRel = outputRelativePath(
      manifest.outputRoot,
      record.path.replace(/^\/+/, ""),
      `markdown output for ${record.id}`,
    );
    const mdAbs = resolveUnderRoot(outputRootAbs, mdRel, `markdown output for ${record.id}`);
    writeFileSync(mdAbs, record.content, "utf8");
  }

  const manifestPayload = {
    schemaVersion: "static-build-time-site.resources.v1",
    site: manifest.site,
    resources: generated,
  };
  writeFileSync(manifestOutAbs, `${JSON.stringify(manifestPayload, null, 2)}\n`, "utf8");

  const engawaConfig = buildEngawaConfig(manifest);
  const staticInputs: StaticResourceInput[] = generated.map((record) => ({
    id: record.id,
    title: record.title,
    description: record.description,
    mimeType: record.mimeType,
    content: record.content,
    path: record.path,
    metadata: {
      sourcePath: record.trace.sourcePath,
      sourceSha256: record.trace.sourceSha256,
    },
  }));

  const adapter = new StaticContentAdapter(manifest.site.canonicalUrl, staticInputs);
  const engawa = createEngawa(engawaConfig, adapter);
  const resources = await engawa.listResources();
  const llmsTxt = generateLlmsTxt(engawa.config, resources);
  const llmsPath = join(outputRootAbs, "llms.txt");
  writeFileSync(llmsPath, llmsTxt, "utf8");

  return {
    projectRoot,
    manifestPath: relative(projectRoot, manifestOutAbs).replace(/\\/g, "/"),
    outputRoot: manifest.outputRoot,
    resources: generated,
    llmsTxtPath: join(manifest.outputRoot, "llms.txt").replace(/\\/g, "/"),
    engawaConfig,
  };
}

export function toStaticAdapterInputs(records: GeneratedResourceRecord[]): StaticResourceInput[] {
  return records.map((record) => ({
    id: record.id,
    title: record.title,
    description: record.description,
    mimeType: record.mimeType,
    content: record.content,
    path: record.path,
    metadata: {
      sourcePath: record.trace.sourcePath,
      sourceSha256: record.trace.sourceSha256,
    },
  }));
}

export function createEngawaFromExtractResult(
  result: ExtractResult,
  canonicalUrl: string,
): ReturnType<typeof createEngawa> {
  const adapter = new StaticContentAdapter(canonicalUrl, toStaticAdapterInputs(result.resources));
  return createEngawa(result.engawaConfig, adapter);
}

export function resourceUriFor(siteUrl: string, id: string): string {
  return buildResourceUri(normalizeCanonicalUrl(siteUrl), id);
}

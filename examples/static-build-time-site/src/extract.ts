import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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
import {
  markdownPathToOutputRel,
  outputRelativePath,
  resolveBoundedRootUnderProject,
  resolveExistingUnderBoundedRoot,
  resolveRealProjectRoot,
  resolveWriteTargetUnderBoundedRoot,
  walkMarkdownFiles,
} from "./paths.js";
import type { ExtractResult, GeneratedResourceRecord } from "./types.js";

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function buildCanonicalUrl(siteUrl: string, path: string): string {
  const normalized = normalizeCanonicalUrl(siteUrl);
  if (path === "/") {
    return normalized.endsWith("/") ? normalized : `${normalized}/`;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  return `${base}${normalizedPath}`;
}

export function buildHumanPageUrl(siteUrl: string, canonicalPath: string): string {
  return buildCanonicalUrl(siteUrl, canonicalPath);
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

function removeStaleMarkdown(outputRootAbs: string, expectedMdRels: Set<string>): void {
  walkMarkdownFiles(outputRootAbs, (absPath, relPath) => {
    if (!expectedMdRels.has(relPath)) {
      unlinkSync(absPath);
    }
  });
}

function extractSingleResource(
  realProjectRoot: string,
  realSourceRoot: string,
  manifest: ReturnType<typeof loadManifest>,
  resource: {
    id: string;
    source: string;
    canonicalPath: string;
    markdownPath: string;
    contentSelector: string;
  },
): GeneratedResourceRecord {
  const sourceAbs = resolveExistingUnderBoundedRoot(
    realSourceRoot,
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

  const pageBaseUrl = buildHumanPageUrl(manifest.site.canonicalUrl, resource.canonicalPath);
  const markdown = htmlMainToMarkdown(boundary, pageBaseUrl);

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

  const realProjectRoot = resolveRealProjectRoot(projectRoot);
  const realSourceRoot = resolveBoundedRootUnderProject(
    realProjectRoot,
    manifest.sourceRoot,
    "sourceRoot",
  );
  let realOutputRoot = resolveBoundedRootUnderProject(
    realProjectRoot,
    manifest.outputRoot,
    "outputRoot",
  );
  const manifestOutAbs = resolveWriteTargetUnderBoundedRoot(
    realProjectRoot,
    manifest.manifestPath,
    "manifestPath",
  );

  const expectedMdRels = new Set(
    manifest.resources.map((resource) => markdownPathToOutputRel(resource.markdownPath)),
  );

  if (!existsSync(realOutputRoot)) {
    mkdirSync(realOutputRoot, { recursive: true });
    realOutputRoot = resolveBoundedRootUnderProject(
      realProjectRoot,
      manifest.outputRoot,
      "outputRoot",
    );
  }

  removeStaleMarkdown(realOutputRoot, expectedMdRels);

  const generated: GeneratedResourceRecord[] = manifest.resources.map((resource) =>
    extractSingleResource(realProjectRoot, realSourceRoot, manifest, resource),
  );

  mkdirSync(realOutputRoot, { recursive: true });
  mkdirSync(dirname(manifestOutAbs), { recursive: true });

  for (const record of generated) {
    const mdRel = outputRelativePath(
      manifest.outputRoot,
      record.path.replace(/^\/+/, ""),
      `markdown output for ${record.id}`,
    );
    const mdAbs = resolveWriteTargetUnderBoundedRoot(
      realOutputRoot,
      mdRel,
      `markdown output for ${record.id}`,
    );
    mkdirSync(dirname(mdAbs), { recursive: true });
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
  const llmsAbs = resolveWriteTargetUnderBoundedRoot(realOutputRoot, "llms.txt", "llms.txt");
  writeFileSync(llmsAbs, llmsTxt, "utf8");

  return {
    projectRoot,
    manifestPath: relative(realProjectRoot, manifestOutAbs).replace(/\\/g, "/"),
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

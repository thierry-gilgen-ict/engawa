import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EngawaManifest, ManifestResource } from "./types.js";
import { assertRelativeSafe } from "./paths.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Manifest field "${key}" must be a non-empty string`);
  }
  return value;
}

function parseResource(raw: unknown, index: number): ManifestResource {
  if (!isRecord(raw)) {
    throw new Error(`Manifest resources[${index}] must be an object`);
  }
  return {
    id: requireString(raw, "id"),
    source: requireString(raw, "source"),
    canonicalPath: requireString(raw, "canonicalPath"),
    markdownPath: requireString(raw, "markdownPath"),
    contentSelector: requireString(raw, "contentSelector"),
  };
}

export function loadManifest(manifestFilePath: string): EngawaManifest {
  const rawText = readFileSync(manifestFilePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Manifest is not valid JSON: ${manifestFilePath}`);
  }
  if (!isRecord(parsed)) {
    throw new Error("Manifest root must be an object");
  }

  const siteRaw = parsed.site;
  if (!isRecord(siteRaw)) {
    throw new Error("Manifest.site must be an object");
  }

  const resourcesRaw = parsed.resources;
  if (!Array.isArray(resourcesRaw) || resourcesRaw.length === 0) {
    throw new Error("Manifest.resources must be a non-empty array");
  }

  const manifest: EngawaManifest = {
    site: {
      name: requireString(siteRaw, "name"),
      canonicalUrl: requireString(siteRaw, "canonicalUrl"),
      description: requireString(siteRaw, "description"),
      language:
        typeof siteRaw.language === "string" && siteRaw.language.trim() ? siteRaw.language : "en",
    },
    sourceRoot: requireString(parsed, "sourceRoot"),
    outputRoot: requireString(parsed, "outputRoot"),
    manifestPath: requireString(parsed, "manifestPath"),
    resources: resourcesRaw.map((r, i) => parseResource(r, i)),
  };

  assertRelativeSafe(manifest.sourceRoot, "sourceRoot");
  assertRelativeSafe(manifest.outputRoot, "outputRoot");
  assertRelativeSafe(manifest.manifestPath, "manifestPath");

  const idSet = new Set<string>();
  const markdownSet = new Set<string>();
  for (const resource of manifest.resources) {
    assertRelativeSafe(resource.source, `resources[${resource.id}].source`);
    if (resource.canonicalPath !== "/" && !resource.canonicalPath.startsWith("/")) {
      throw new Error(`canonicalPath for "${resource.id}" must start with /`);
    }
    if (!resource.markdownPath.startsWith("/")) {
      throw new Error(`markdownPath for "${resource.id}" must start with /`);
    }
    if (idSet.has(resource.id)) {
      throw new Error(`Duplicate resource id "${resource.id}"`);
    }
    idSet.add(resource.id);
    if (markdownSet.has(resource.markdownPath)) {
      throw new Error(`Duplicate markdownPath "${resource.markdownPath}"`);
    }
    markdownSet.add(resource.markdownPath);
  }

  try {
    const origin = new URL(manifest.site.canonicalUrl);
    if (origin.protocol !== "http:" && origin.protocol !== "https:") {
      throw new Error("site.canonicalUrl must use http or https");
    }
  } catch {
    throw new Error("site.canonicalUrl must be a valid absolute URL");
  }

  return manifest;
}

export function defaultManifestPath(projectRoot: string): string {
  return resolve(projectRoot, "engawa.manifest.json");
}

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { InitError } from "../errors.js";
import { initBundleManifestSchema } from "./schema.js";
import { BUNDLE_SCHEMA_VERSION, type InitBundleManifest } from "./types.js";

export const GENERATED_FILES = [
  "engawa-plan.json",
  "ENGAWA_INTEGRATION_PLAN.md",
  "AGENT_PROMPT.md",
] as const;

export function readExistingManifest(outputDir: string): InitBundleManifest | null {
  const manifestPath = join(outputDir, "manifest.json");
  if (!existsSync(manifestPath)) return null;
  try {
    const raw = readFileSync(manifestPath, "utf8");
    return initBundleManifestSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function validateOutputDirectory(outputDir: string, force: boolean): void {
  if (!existsSync(outputDir)) return;

  const entries = readdirSync(outputDir);
  if (entries.length === 0) return;

  const manifest = readExistingManifest(outputDir);
  if (!manifest) {
    throw new InitError(
      `Output directory exists and is not empty without a valid Engawa init manifest: ${outputDir}`,
    );
  }

  if (!force) {
    throw new InitError(
      `Output directory already contains an Engawa init bundle. Use --force to overwrite known files.`,
    );
  }
}

export interface BundleFiles {
  planJson: string;
  planMarkdown: string;
  agentPrompt: string;
}

export function writeInitBundle(
  outputDir: string,
  files: BundleFiles,
  force: boolean,
  dryRun: boolean,
): void {
  validateOutputDirectory(outputDir, force);

  if (dryRun) return;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const manifest: InitBundleManifest = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    generatedFiles: [...GENERATED_FILES],
  };

  const manifestPath = join(outputDir, "manifest.json");
  const existingManifest = readExistingManifest(outputDir);

  if (existingManifest && force) {
    for (const name of existingManifest.generatedFiles) {
      const filePath = join(outputDir, name);
      if (existsSync(filePath)) {
        // only overwrite known generated files
      }
    }
  }

  writeFileSync(join(outputDir, "engawa-plan.json"), files.planJson, "utf8");
  writeFileSync(join(outputDir, "ENGAWA_INTEGRATION_PLAN.md"), files.planMarkdown, "utf8");
  writeFileSync(join(outputDir, "AGENT_PROMPT.md"), files.agentPrompt, "utf8");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

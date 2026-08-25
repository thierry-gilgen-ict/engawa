import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { InitError } from "../errors.js";
import { initBundleManifestSchema } from "./schema.js";
import { BUNDLE_SCHEMA_VERSION, type InitBundleManifest } from "./types.js";

export const GENERATED_FILES = [
  "engawa-plan.json",
  "ENGAWA_INTEGRATION_PLAN.md",
  "AGENT_PROMPT.md",
] as const;

const ALL_BUNDLE_FILES = ["manifest.json", ...GENERATED_FILES] as const;

function assertRealOutputDirectory(outputDir: string): void {
  if (!existsSync(outputDir)) return;
  const stat = lstatSync(outputDir);
  if (stat.isSymbolicLink()) {
    throw new InitError(
      `Output directory must be a real directory, not a symbolic link: ${outputDir}`,
    );
  }
  if (!stat.isDirectory()) {
    throw new InitError(`Output path must be a directory: ${outputDir}`);
  }
}

function assertRegularFileWritable(filePath: string): void {
  if (!existsSync(filePath)) return;
  const stat = lstatSync(filePath);
  if (stat.isSymbolicLink()) {
    throw new InitError(`Refusing to overwrite symlink in output bundle: ${filePath}`);
  }
  if (stat.isDirectory()) {
    throw new InitError(`Refusing to overwrite directory in output bundle: ${filePath}`);
  }
  if (!stat.isFile()) {
    throw new InitError(`Refusing to overwrite non-regular file in output bundle: ${filePath}`);
  }
}

function validateBundleTargets(outputDir: string): void {
  for (const name of ALL_BUNDLE_FILES) {
    assertRegularFileWritable(join(outputDir, name));
  }
}

export function readExistingManifest(outputDir: string): InitBundleManifest | null {
  const manifestPath = join(outputDir, "manifest.json");
  if (!existsSync(manifestPath)) return null;

  const stat = lstatSync(manifestPath);
  if (stat.isSymbolicLink() || stat.isDirectory() || !stat.isFile()) {
    return null;
  }

  try {
    const raw = readFileSync(manifestPath, "utf8");
    return initBundleManifestSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function validateOutputDirectory(outputDir: string, force: boolean): void {
  if (!existsSync(outputDir)) return;

  assertRealOutputDirectory(outputDir);

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

  validateBundleTargets(outputDir);
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
  } else {
    assertRealOutputDirectory(outputDir);
  }

  validateBundleTargets(outputDir);

  const manifest: InitBundleManifest = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    generatedFiles: [...GENERATED_FILES],
  };

  const manifestPath = join(outputDir, "manifest.json");

  writeFileSync(join(outputDir, "engawa-plan.json"), files.planJson, "utf8");
  writeFileSync(join(outputDir, "ENGAWA_INTEGRATION_PLAN.md"), files.planMarkdown, "utf8");
  writeFileSync(join(outputDir, "AGENT_PROMPT.md"), files.agentPrompt, "utf8");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

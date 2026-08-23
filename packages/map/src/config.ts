import { chmod, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { CONFIG_FILE_NAME } from "./constants.js";
import { mapConfigSchema, type MapConfig } from "./schemas.js";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

async function atomicWriteJson(path: string, data: unknown): Promise<void> {
  const tempPath = `${path}.${randomBytes(8).toString("hex")}.tmp`;
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(tempPath, serialized, { encoding: "utf8", flag: "wx" });
  if (process.platform !== "win32") {
    await chmod(tempPath, 0o644);
  }
  await rename(tempPath, path);
}

export async function loadMapConfig(projectRoot: string): Promise<MapConfig> {
  const path = join(projectRoot, CONFIG_FILE_NAME);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new ConfigError(`Missing ${CONFIG_FILE_NAME} in project root`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new ConfigError(`${CONFIG_FILE_NAME} must be valid JSON`);
  }

  try {
    return mapConfigSchema.parse(parsed);
  } catch (error) {
    throw new ConfigError(
      `${CONFIG_FILE_NAME} is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function writeMapConfigSiteId(projectRoot: string, siteId: string): Promise<void> {
  const path = join(projectRoot, CONFIG_FILE_NAME);
  const config = await loadMapConfig(projectRoot);
  const updated = { ...config, siteId };
  await atomicWriteJson(path, updated);
}

export async function removeMapConfigSiteId(projectRoot: string): Promise<void> {
  const path = join(projectRoot, CONFIG_FILE_NAME);
  const config = await loadMapConfig(projectRoot);
  const { siteId, ...rest } = config;
  void siteId;
  await atomicWriteJson(path, rest);
}

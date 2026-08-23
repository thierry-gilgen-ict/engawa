import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONFIG_FILE_NAME } from "./constants.js";
import { mapConfigSchema, type MapConfig } from "./schemas.js";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
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
  await writeFile(path, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
}

// @vitest-environment node
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  CONFIG_FILE_NAME,
  DETECTABLE_ENGAWA_PACKAGE_NAMES,
  REQUIRED_ENGAWA_PACKAGE,
} from "./constants.js";

export interface TestProjectOptions {
  packages?: Partial<Record<string, string>>;
  config?: Record<string, unknown>;
  includeOptionalPackages?: boolean;
}

export async function createTestProject(options: TestProjectOptions = {}): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "engawa-map-test-"));
  const includeOptional = options.includeOptionalPackages ?? true;

  const dependencies: Record<string, string> = {
    [REQUIRED_ENGAWA_PACKAGE]: options.packages?.[REQUIRED_ENGAWA_PACKAGE] ?? "0.1.1",
  };

  if (includeOptional) {
    for (const packageName of DETECTABLE_ENGAWA_PACKAGE_NAMES) {
      if (packageName === REQUIRED_ENGAWA_PACKAGE) {
        continue;
      }
      dependencies[packageName] = options.packages?.[packageName] ?? "0.1.1";
    }
  }

  await writeFile(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "map-test-project",
        private: true,
        dependencies,
      },
      null,
      2,
    ),
    "utf8",
  );

  for (const [packageName, version] of Object.entries(dependencies)) {
    if (/^[\^~>=<]/.test(version) || version.startsWith("workspace:")) {
      continue;
    }
    const pkgDir = join(dir, "node_modules", packageName);
    await mkdir(pkgDir, { recursive: true });
    await writeFile(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: packageName, version }, null, 2),
      "utf8",
    );
  }

  const config = options.config ?? {
    displayName: "Test Site",
    canonicalUrl: "https://example.com",
    hints: { framework: "nextjs", byaEnabled: true, localeCount: 2 },
  };

  await writeFile(join(dir, CONFIG_FILE_NAME), JSON.stringify(config, null, 2), "utf8");
  await writeFile(join(dir, ".gitignore"), "node_modules/\n", "utf8");
  return dir;
}

export async function readLocalStateFile(projectRoot: string): Promise<unknown> {
  const raw = await readFile(join(projectRoot, ".engawa-map.local.json"), "utf8");
  return JSON.parse(raw) as unknown;
}

export async function readMapConfigFile(projectRoot: string): Promise<unknown> {
  const raw = await readFile(join(projectRoot, CONFIG_FILE_NAME), "utf8");
  return JSON.parse(raw) as unknown;
}

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ENGAWA_PACKAGE_NAMES, type EngawaPackageName } from "./constants.js";
import type { EngawaPackages } from "./schemas.js";

export class VersionDetectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VersionDetectionError";
  }
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

async function readJsonFile(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
}

function isExactVersion(value: string): boolean {
  return /^\d+\.\d+\.\d+/.test(value);
}

async function resolveInstalledVersion(
  projectRoot: string,
  packageName: EngawaPackageName,
): Promise<string | undefined> {
  const packageJsonPath = join(projectRoot, "node_modules", packageName, "package.json");
  try {
    const pkg = (await readJsonFile(packageJsonPath)) as { version?: string };
    if (typeof pkg.version === "string" && pkg.version.length > 0) {
      return pkg.version;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function findProjectRoot(startDir: string): Promise<string> {
  let current = startDir;
  while (true) {
    try {
      await readFile(join(current, "package.json"), "utf8");
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) {
        throw new VersionDetectionError("Could not locate package.json in current directory tree");
      }
      current = parent;
    }
  }
}

export async function detectEngawaPackageVersions(projectRoot: string): Promise<EngawaPackages> {
  const rootPackageJson = (await readJsonFile(join(projectRoot, "package.json"))) as PackageJson;
  const declared = {
    ...rootPackageJson.dependencies,
    ...rootPackageJson.devDependencies,
  };

  const packages = {} as EngawaPackages;

  for (const packageName of ENGAWA_PACKAGE_NAMES) {
    const installed = await resolveInstalledVersion(projectRoot, packageName);
    if (installed) {
      packages[packageName] = installed;
      continue;
    }

    const declaredVersion = declared?.[packageName];
    if (declaredVersion && isExactVersion(declaredVersion)) {
      packages[packageName] = declaredVersion;
      continue;
    }

    throw new VersionDetectionError(
      `Could not resolve installed version for ${packageName}; install the package or pin an exact version`,
    );
  }

  return packages;
}

export function getModuleDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

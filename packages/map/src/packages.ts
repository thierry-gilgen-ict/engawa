import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DETECTABLE_ENGAWA_PACKAGE_NAMES,
  REQUIRED_ENGAWA_PACKAGE,
  type EngawaPackageName,
} from "./constants.js";
import type { EngawaPackages } from "./schemas.js";
import { validateExactSemver } from "./semver.js";

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

async function readJsonFile(path: string, context: string): Promise<unknown> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new VersionDetectionError(`${context} not found`);
    }
    throw new VersionDetectionError(
      `Failed to read ${context}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new VersionDetectionError(`${context} must be valid JSON`);
  }
}

async function resolveInstalledVersion(
  projectRoot: string,
  packageName: EngawaPackageName,
): Promise<string | undefined> {
  const packageJsonPath = join(projectRoot, "node_modules", packageName, "package.json");
  let raw: string;
  try {
    raw = await readFile(packageJsonPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw new VersionDetectionError(
      `Failed to read installed ${packageName} package.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let pkg: { version?: string };
  try {
    pkg = JSON.parse(raw) as { version?: string };
  } catch {
    throw new VersionDetectionError(`Malformed JSON in installed ${packageName} package.json`);
  }

  if (typeof pkg.version !== "string" || pkg.version.length === 0) {
    throw new VersionDetectionError(`Missing version in installed ${packageName} package.json`);
  }

  return validateExactSemver(pkg.version, `installed ${packageName} version`);
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
  const rootPackageJson = (await readJsonFile(
    join(projectRoot, "package.json"),
    "package.json",
  )) as PackageJson;
  const declared = {
    ...rootPackageJson.dependencies,
    ...rootPackageJson.devDependencies,
  };

  if (!declared[REQUIRED_ENGAWA_PACKAGE]) {
    throw new VersionDetectionError(
      `${REQUIRED_ENGAWA_PACKAGE} must be declared in package.json dependencies or devDependencies`,
    );
  }

  const packages: Partial<EngawaPackages> = {};

  for (const packageName of DETECTABLE_ENGAWA_PACKAGE_NAMES) {
    if (!declared[packageName]) {
      continue;
    }

    const installed = await resolveInstalledVersion(projectRoot, packageName);
    if (!installed) {
      throw new VersionDetectionError(
        `Could not resolve installed version for ${packageName}; install the package`,
      );
    }

    packages[packageName] = installed;
  }

  if (!packages[REQUIRED_ENGAWA_PACKAGE]) {
    throw new VersionDetectionError(
      `Could not resolve installed version for ${REQUIRED_ENGAWA_PACKAGE}; install the package`,
    );
  }

  return packages as EngawaPackages;
}

export function getModuleDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

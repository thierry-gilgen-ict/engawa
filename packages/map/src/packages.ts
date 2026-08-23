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

async function readJsonFile(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
}

async function resolveInstalledVersion(
  projectRoot: string,
  packageName: EngawaPackageName,
): Promise<string | undefined> {
  const packageJsonPath = join(projectRoot, "node_modules", packageName, "package.json");
  try {
    const pkg = (await readJsonFile(packageJsonPath)) as { version?: string };
    if (typeof pkg.version === "string" && pkg.version.length > 0) {
      return validateExactSemver(pkg.version, `installed ${packageName} version`);
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

  const packages: Partial<EngawaPackages> = {};

  for (const packageName of DETECTABLE_ENGAWA_PACKAGE_NAMES) {
    const declaredVersion = declared?.[packageName];
    const installed = await resolveInstalledVersion(projectRoot, packageName);

    if (installed) {
      packages[packageName] = installed;
      continue;
    }

    if (declaredVersion) {
      try {
        packages[packageName] = validateExactSemver(
          declaredVersion,
          `declared ${packageName} version`,
        );
        continue;
      } catch {
        // fall through to error below
      }
    }

    if (packageName === REQUIRED_ENGAWA_PACKAGE) {
      throw new VersionDetectionError(
        `Could not resolve installed version for ${packageName}; install the package or pin an exact version`,
      );
    }
  }

  if (!packages[REQUIRED_ENGAWA_PACKAGE]) {
    throw new VersionDetectionError(
      `Could not resolve installed version for ${REQUIRED_ENGAWA_PACKAGE}; install the package or pin an exact version`,
    );
  }

  return packages as EngawaPackages;
}

export function getModuleDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

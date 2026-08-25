import type { RepoMetadata } from "./types.js";

const LOCKFILES = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock", "bun.lockb"];

export function extractRepoMetadata(
  repoName: string,
  fileContents: Map<string, string>,
  filePaths: string[],
): RepoMetadata {
  const lockfiles = LOCKFILES.filter((f) => filePaths.includes(f)).sort();

  let packageJsonPresent = false;
  let packageName: string | undefined;
  let enginesNode: string | undefined;
  let packageManager: string | undefined;
  const workspaceHints: string[] = [];
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};

  const pkgContent = fileContents.get("package.json");
  if (pkgContent) {
    packageJsonPresent = true;
    try {
      const pkg = JSON.parse(pkgContent) as Record<string, unknown>;
      if (typeof pkg.name === "string") packageName = pkg.name;
      if (pkg.engines && typeof pkg.engines === "object") {
        const engines = pkg.engines as Record<string, unknown>;
        if (typeof engines.node === "string") enginesNode = engines.node;
      }
      if (typeof pkg.packageManager === "string") packageManager = pkg.packageManager;
      if (Array.isArray(pkg.workspaces)) {
        workspaceHints.push(...pkg.workspaces.filter((w): w is string => typeof w === "string"));
      }
      if (pkg.workspaces && typeof pkg.workspaces === "object" && !Array.isArray(pkg.workspaces)) {
        const ws = pkg.workspaces as { packages?: string[] };
        if (Array.isArray(ws.packages)) {
          workspaceHints.push(...ws.packages);
        }
      }
      if (pkg.dependencies && typeof pkg.dependencies === "object") {
        Object.assign(dependencies, pkg.dependencies as Record<string, string>);
      }
      if (pkg.devDependencies && typeof pkg.devDependencies === "object") {
        Object.assign(devDependencies, pkg.devDependencies as Record<string, string>);
      }
    } catch {
      // malformed package.json — leave fields unset
    }
  }

  if (!packageManager) {
    if (lockfiles.includes("pnpm-lock.yaml")) packageManager = "pnpm";
    else if (lockfiles.includes("yarn.lock")) packageManager = "yarn";
    else if (lockfiles.includes("bun.lock") || lockfiles.includes("bun.lockb"))
      packageManager = "bun";
    else if (lockfiles.includes("package-lock.json")) packageManager = "npm";
  }

  const typescriptPresent =
    filePaths.includes("tsconfig.json") ||
    filePaths.some((p) => p.endsWith(".ts") || p.endsWith(".tsx"));

  return {
    name: repoName,
    packageJsonPresent,
    packageName,
    enginesNode,
    packageManager,
    lockfiles,
    workspaceHints: [...new Set(workspaceHints)].sort(),
    typescriptPresent,
    dependencies,
    devDependencies,
  };
}

export function deriveRepoName(repoRoot: string, metadata: RepoMetadata): string {
  if (metadata.packageName) return metadata.packageName;
  const parts = repoRoot.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "repository";
}

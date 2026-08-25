import { existsSync, lstatSync, readdirSync, realpathSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";

const TRAVERSAL = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

function realpathExisting(path: string): string {
  return realpathSync.native(path);
}

export function assertRelativeSafe(relPath: string, label: string): void {
  if (!relPath || relPath.trim() === "") {
    throw new Error(`${label} must not be empty`);
  }
  if (isAbsolute(relPath)) {
    throw new Error(`${label} must be a relative path`);
  }
  const normalized = relPath.replace(/\\/g, "/");
  if (TRAVERSAL.test(normalized) || normalized.startsWith("/")) {
    throw new Error(`${label} contains path traversal or absolute segments: ${relPath}`);
  }
}

export function isPathInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function resolveRealProjectRoot(projectRoot: string): string {
  return realpathExisting(projectRoot);
}

export function resolveBoundedRootUnderProject(
  projectRoot: string,
  relPath: string,
  label: string,
): string {
  assertRelativeSafe(relPath, label);
  const realProject = resolveRealProjectRoot(projectRoot);
  const configured = resolve(realProject, relPath);

  if (existsSync(configured)) {
    const realBounded = realpathExisting(configured);
    if (!isPathInside(realProject, realBounded)) {
      throw new Error(`${label} escapes project root via symlink: ${relPath}`);
    }
    return realBounded;
  }

  const parent = resolve(configured, "..");
  if (existsSync(parent)) {
    const realParent = realpathExisting(parent);
    if (!isPathInside(realProject, realParent)) {
      throw new Error(`${label} parent escapes project root: ${relPath}`);
    }
    if (existsSync(configured)) {
      const stat = lstatSync(configured);
      if (stat.isSymbolicLink()) {
        const realTarget = realpathExisting(configured);
        if (!isPathInside(realProject, realTarget)) {
          throw new Error(`${label} symlink escapes project root: ${relPath}`);
        }
        return realTarget;
      }
    }
  }

  if (!isPathInside(realProject, configured)) {
    throw new Error(`${label} escapes project root: ${relPath}`);
  }
  return configured;
}

export function resolveExistingUnderBoundedRoot(
  boundedRoot: string,
  relPath: string,
  label: string,
): string {
  assertRelativeSafe(relPath, label);
  const realBounded = realpathExisting(boundedRoot);
  const absTarget = resolve(realBounded, relPath);
  if (!existsSync(absTarget)) {
    throw new Error(`${label} does not exist: ${relPath}`);
  }
  const realTarget = realpathExisting(absTarget);
  if (!isPathInside(realBounded, realTarget)) {
    throw new Error(`${label} escapes bounded root via symlink: ${relPath}`);
  }
  return realTarget;
}

export function resolveWriteTargetUnderBoundedRoot(
  boundedRoot: string,
  relPath: string,
  label: string,
): string {
  assertRelativeSafe(relPath, label);
  const realBounded = realpathExisting(boundedRoot);
  const absTarget = resolve(realBounded, relPath);
  const parent = resolve(absTarget, "..");
  const realParent = existsSync(parent) ? realpathExisting(parent) : realBounded;
  if (!isPathInside(realBounded, realParent)) {
    throw new Error(`${label} write parent escapes bounded root: ${relPath}`);
  }
  if (existsSync(absTarget)) {
    const realTarget = realpathExisting(absTarget);
    if (!isPathInside(realBounded, realTarget)) {
      throw new Error(`${label} write target escapes bounded root via symlink: ${relPath}`);
    }
    return realTarget;
  }
  const rel = relative(realBounded, absTarget);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`${label} escapes bounded root: ${relPath}`);
  }
  return absTarget;
}

export function outputRelativePath(outputRoot: string, relPath: string, label: string): string {
  assertRelativeSafe(relPath, label);
  return relPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function markdownPathToOutputRel(markdownPath: string): string {
  return markdownPath.replace(/^\/+/, "").replace(/\\/g, "/");
}

export function walkMarkdownFiles(
  rootDir: string,
  onFile: (absPath: string, relPath: string) => void,
): void {
  if (!existsSync(rootDir)) return;
  const realRoot = realpathExisting(rootDir);
  for (const absPath of collectMarkdownFiles(realRoot)) {
    const relPath = relative(realRoot, absPath).replace(/\\/g, "/");
    onFile(absPath, relPath);
  }
}

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(absPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(absPath);
    } else if (entry.isSymbolicLink()) {
      const realTarget = realpathExisting(absPath);
      if (realTarget.endsWith(".md")) {
        files.push(realTarget);
      }
    }
  }
  return files;
}

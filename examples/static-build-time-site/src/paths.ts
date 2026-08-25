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
  assertWritePathWithinBoundedRoot(realBounded, absTarget, label, relPath);
  return absTarget;
}

function assertWritePathWithinBoundedRoot(
  realBounded: string,
  absTarget: string,
  label: string,
  relPath: string,
): void {
  const rel = relative(realBounded, absTarget);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`${label} escapes bounded root: ${relPath}`);
  }

  let probe = realBounded;
  const parts = rel.split(/[/\\]/).filter(Boolean);
  for (const part of parts) {
    probe = join(probe, part);
    if (existsSync(probe)) {
      const realProbe = realpathExisting(probe);
      if (!isPathInside(realBounded, realProbe)) {
        throw new Error(`${label} write path escapes bounded root via symlink: ${relPath}`);
      }
    }
  }
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
  for (const absPath of collectMarkdownFiles(realRoot, "outputRoot")) {
    const relPath = relative(realRoot, absPath).replace(/\\/g, "/");
    onFile(absPath, relPath);
  }
}

function collectMarkdownFiles(dir: string, outputRootLabel: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absPath = join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`${outputRootLabel} contains a symlink during stale cleanup: ${entry.name}`);
    }
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(absPath, outputRootLabel));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(absPath);
    }
  }
  return files;
}

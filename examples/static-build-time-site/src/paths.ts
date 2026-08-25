import { resolve, relative, isAbsolute } from "node:path";

const TRAVERSAL = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

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

export function resolveUnderRoot(rootDir: string, relPath: string, label: string): string {
  assertRelativeSafe(relPath, label);
  const absRoot = resolve(rootDir);
  const absTarget = resolve(absRoot, relPath);
  const rel = relative(absRoot, absTarget);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`${label} escapes configured root: ${relPath}`);
  }
  return absTarget;
}

export function outputRelativePath(outputRoot: string, relPath: string, label: string): string {
  assertRelativeSafe(relPath, label);
  const normalized = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized;
}

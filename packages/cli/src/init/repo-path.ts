import { realpathSync } from "node:fs";
import { join, posix } from "node:path";

export function toPosixRelative(repoRoot: string, absolutePath: string): string {
  const rel = absolutePath.slice(repoRoot.length).replace(/\\/g, "/");
  return rel.startsWith("/") ? rel.slice(1) : rel;
}

export function posixJoin(...parts: string[]): string {
  return posix.join(...parts).replace(/\\/g, "/");
}

export function posixNormalize(path: string): string {
  return posix.normalize(path).replace(/\\/g, "/");
}

export function resolveRepoRoot(repoPath: string): string {
  return realpathSync(repoPath);
}

export function isInsideRepo(repoRoot: string, absolutePath: string): boolean {
  const normalizedRoot = repoRoot.endsWith("/") ? repoRoot : `${repoRoot}/`;
  const normalizedPath = absolutePath.endsWith("/") ? absolutePath : `${absolutePath}/`;
  return normalizedPath.startsWith(normalizedRoot) || absolutePath === repoRoot;
}

export function resolveSafePath(repoRoot: string, relativePath: string): string | null {
  const joined = join(repoRoot, relativePath);
  try {
    const resolved = realpathSync(joined);
    if (!isInsideRepo(repoRoot, resolved)) {
      return null;
    }
    return resolved;
  } catch {
    return null;
  }
}

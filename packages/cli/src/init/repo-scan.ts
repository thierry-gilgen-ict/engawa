import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { InitError } from "../errors.js";
import { getSkipReasonForPath, isTextLikelyFile, shouldSkipDirName } from "./repo-exclusions.js";
import { toPosixRelative } from "./repo-path.js";
import {
  MAX_ANALYZED_TEXT_FILES,
  MAX_REPO_FILES,
  MAX_TEXT_FILE_BYTES,
  type RepoScanResult,
} from "./types.js";

export function scanRepository(repoRoot: string): RepoScanResult {
  const filesSkipped: Array<{ path: string; reason: string }> = [];
  const filePaths: string[] = [];
  const fileContents = new Map<string, string>();
  let filesSeen = 0;
  let filesAnalyzed = 0;
  let scanTruncated = false;

  function walk(dirAbs: string): void {
    if (scanTruncated) return;

    let entries: string[];
    try {
      entries = readdirSync(dirAbs);
    } catch {
      return;
    }

    const sorted = [...entries].sort();

    for (const name of sorted) {
      if (scanTruncated) break;

      const absPath = join(dirAbs, name);
      const relPath = toPosixRelative(repoRoot, absPath);

      let stat;
      try {
        stat = lstatSync(absPath);
      } catch {
        filesSkipped.push({ path: relPath, reason: "stat-failed" });
        continue;
      }

      if (stat.isSymbolicLink()) {
        filesSkipped.push({ path: relPath, reason: "symlink-skipped" });
        continue;
      }

      if (stat.isDirectory()) {
        if (shouldSkipDirName(name)) {
          filesSkipped.push({ path: relPath, reason: "excluded-directory" });
          continue;
        }
        const dirSkip = getSkipReasonForPath(relPath);
        if (dirSkip) {
          filesSkipped.push({ path: relPath, reason: dirSkip });
          continue;
        }
        walk(absPath);
        continue;
      }

      if (!stat.isFile()) continue;

      filesSeen++;
      if (filesSeen > MAX_REPO_FILES) {
        scanTruncated = true;
        break;
      }

      const skipReason = getSkipReasonForPath(relPath);
      if (skipReason) {
        filesSkipped.push({ path: relPath, reason: skipReason });
        continue;
      }

      filePaths.push(relPath);

      if (!isTextLikelyFile(relPath)) {
        filesSkipped.push({ path: relPath, reason: "non-text-file" });
        continue;
      }

      if (stat.size > MAX_TEXT_FILE_BYTES) {
        filesSkipped.push({ path: relPath, reason: "file-too-large" });
        continue;
      }

      if (filesAnalyzed >= MAX_ANALYZED_TEXT_FILES) {
        filesSkipped.push({ path: relPath, reason: "analysis-budget-exceeded" });
        scanTruncated = true;
        continue;
      }

      try {
        const content = readFileSync(absPath, "utf8");
        fileContents.set(relPath, content);
        filesAnalyzed++;
      } catch {
        filesSkipped.push({ path: relPath, reason: "read-failed" });
      }
    }
  }

  walk(repoRoot);

  filePaths.sort();
  filesSkipped.sort((a, b) => a.path.localeCompare(b.path));

  return {
    filesSeen,
    filesAnalyzed,
    filesSkipped,
    scanTruncated,
    filePaths,
    fileContents,
  };
}

export function assertRepoDirectory(repoPath: string): void {
  if (!existsSync(repoPath)) {
    throw new InitError(`Repository path does not exist: ${repoPath}`);
  }
  const stat = statSync(repoPath);
  if (!stat.isDirectory()) {
    throw new InitError(`Repository path is not a directory: ${repoPath}`);
  }
}

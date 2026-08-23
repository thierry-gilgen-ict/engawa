import { chmod, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { GITIGNORE_ENTRY, LOCAL_STATE_FILE_NAME } from "./constants.js";
import { localStateSchema, type LocalState } from "./schemas.js";

const execFileAsync = promisify(execFile);

export class LocalStateError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "LocalStateError";
    this.code = code;
  }
}

export interface LocalStateIO {
  readLocalState(projectRoot: string): Promise<LocalState | undefined>;
  writeLocalState(projectRoot: string, state: LocalState): Promise<void>;
  ensureGitignoreGuard(projectRoot: string): Promise<void>;
}

async function isGitRepository(projectRoot: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: projectRoot });
    return true;
  } catch {
    return false;
  }
}

async function isGitTracked(projectRoot: string, fileName: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["ls-files", "--error-unmatch", fileName], {
      cwd: projectRoot,
    });
    return true;
  } catch {
    return false;
  }
}

async function appendGitignoreEntry(projectRoot: string): Promise<void> {
  const gitignorePath = join(projectRoot, ".gitignore");
  let contents = "";
  try {
    contents = await readFile(gitignorePath, "utf8");
  } catch {
    contents = "";
  }

  const lines = contents.split(/\r?\n/);
  const hasEntry = lines.some((line) => line.trim() === GITIGNORE_ENTRY);
  if (!hasEntry) {
    const suffix = contents.length > 0 && !contents.endsWith("\n") ? "\n" : "";
    await writeFile(gitignorePath, `${contents}${suffix}${GITIGNORE_ENTRY}\n`, "utf8");
  }
}

export async function ensureGitignoreGuard(projectRoot: string): Promise<void> {
  await appendGitignoreEntry(projectRoot);
}

async function assertSecretFileNotTracked(projectRoot: string): Promise<void> {
  if (!(await isGitRepository(projectRoot))) {
    process.stderr.write(
      `Warning: ${LOCAL_STATE_FILE_NAME} is being written outside a git repository; ensure it stays secret.\n`,
    );
    return;
  }

  if (await isGitTracked(projectRoot, LOCAL_STATE_FILE_NAME)) {
    throw new LocalStateError(
      `${LOCAL_STATE_FILE_NAME} is tracked by git; remove it from version control before continuing`,
      "SECRET_WRITE",
    );
  }
}

export async function readLocalState(projectRoot: string): Promise<LocalState | undefined> {
  const path = join(projectRoot, LOCAL_STATE_FILE_NAME);
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return localStateSchema.parse(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw new LocalStateError(
      `Failed to read ${LOCAL_STATE_FILE_NAME}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function writeLocalState(projectRoot: string, state: LocalState): Promise<void> {
  await assertSecretFileNotTracked(projectRoot);
  await ensureGitignoreGuard(projectRoot);

  if (await isGitRepository(projectRoot)) {
    if (await isGitTracked(projectRoot, LOCAL_STATE_FILE_NAME)) {
      throw new LocalStateError(
        `${LOCAL_STATE_FILE_NAME} is tracked by git; remove it from version control before continuing`,
        "SECRET_WRITE",
      );
    }
  }

  const path = join(projectRoot, LOCAL_STATE_FILE_NAME);
  const tempPath = `${path}.${randomBytes(8).toString("hex")}.tmp`;
  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  await writeFile(tempPath, serialized, { encoding: "utf8", mode: 0o600, flag: "wx" });
  if (process.platform !== "win32") {
    await chmod(tempPath, 0o600);
  }
  await rename(tempPath, path);
}

export async function clearLocalState(projectRoot: string): Promise<void> {
  const path = join(projectRoot, LOCAL_STATE_FILE_NAME);
  try {
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new LocalStateError(
        `Failed to remove ${LOCAL_STATE_FILE_NAME}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export function resolveSiteToken(
  envToken: string | undefined,
  localState: LocalState | undefined,
): string | undefined {
  if (envToken) {
    return envToken;
  }
  return localState?.registration.siteToken;
}

export function resolveSiteId(
  configSiteId: string | undefined,
  localState: LocalState | undefined,
): string | undefined {
  if (localState?.registration.state === "registered") {
    return localState.registration.siteId;
  }
  return configSiteId;
}

export async function isSecretFileTracked(projectRoot: string): Promise<boolean> {
  if (!(await isGitRepository(projectRoot))) {
    return false;
  }
  return isGitTracked(projectRoot, LOCAL_STATE_FILE_NAME);
}

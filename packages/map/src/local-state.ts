import { chmod, readFile, rename, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { GITIGNORE_ENTRY, LOCAL_STATE_FILE_NAME } from "./constants.js";
import { localStateSchema, type LocalState } from "./schemas.js";

const execFileAsync = promisify(execFile);

export class LocalStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalStateError";
  }
}

export interface LocalStateIO {
  readLocalState(projectRoot: string): Promise<LocalState | undefined>;
  writeLocalState(projectRoot: string, state: LocalState): Promise<void>;
  ensureGitignoreGuard(projectRoot: string): Promise<void>;
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

export async function ensureGitignoreGuard(projectRoot: string): Promise<void> {
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

  if (await isGitTracked(projectRoot, LOCAL_STATE_FILE_NAME)) {
    throw new LocalStateError(
      `${LOCAL_STATE_FILE_NAME} is tracked by git; remove it from version control before continuing`,
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
  await ensureGitignoreGuard(projectRoot);
  const path = join(projectRoot, LOCAL_STATE_FILE_NAME);
  const tempPath = `${path}.tmp`;
  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  await writeFile(tempPath, serialized, { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") {
    await chmod(tempPath, 0o600);
  }
  await rename(tempPath, path);
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

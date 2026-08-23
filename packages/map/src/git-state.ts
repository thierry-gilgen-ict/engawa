import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitRepositoryState =
  | { kind: "REPOSITORY" }
  | { kind: "NOT_REPOSITORY" }
  | { kind: "GIT_UNAVAILABLE" }
  | { kind: "ERROR"; message: string };

export type GitTrackedState =
  | { kind: "TRACKED" }
  | { kind: "UNTRACKED" }
  | { kind: "ERROR"; message: string };

export type ExecRunner = (
  file: string,
  args: string[],
  options: { cwd: string },
) => Promise<{ stdout: string; stderr: string }>;

const defaultExecRunner: ExecRunner = async (file, args, options) => {
  const result = await execFileAsync(file, args, {
    cwd: options.cwd,
    encoding: "utf8",
  });
  return {
    stdout: typeof result.stdout === "string" ? result.stdout : String(result.stdout),
    stderr: typeof result.stderr === "string" ? result.stderr : String(result.stderr),
  };
};

function execErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function detectGitRepositoryState(
  projectRoot: string,
  execRunner: ExecRunner = defaultExecRunner,
): Promise<GitRepositoryState> {
  try {
    await execRunner("git", ["rev-parse", "--git-dir"], { cwd: projectRoot });
    return { kind: "REPOSITORY" };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { code?: number | string; stderr?: string };
    if (err.code === "ENOENT") {
      return { kind: "GIT_UNAVAILABLE" };
    }

    const stderr = typeof err.stderr === "string" ? err.stderr : "";
    const message = execErrorMessage(error);
    const exitCode = typeof err.code === "number" ? err.code : undefined;
    if (
      exitCode === 128 ||
      /not a git repository/i.test(stderr) ||
      /not a git repository/i.test(message)
    ) {
      return { kind: "NOT_REPOSITORY" };
    }

    return { kind: "ERROR", message };
  }
}

export async function detectSecretFileTrackedState(
  projectRoot: string,
  fileName: string,
  execRunner: ExecRunner = defaultExecRunner,
): Promise<GitTrackedState> {
  try {
    await execRunner("git", ["ls-files", "--error-unmatch", fileName], { cwd: projectRoot });
    return { kind: "TRACKED" };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { code?: number | string; stderr?: string };
    const exitCode = typeof err.code === "number" ? err.code : undefined;
    if (exitCode === 1) {
      return { kind: "UNTRACKED" };
    }

    const stderr = typeof err.stderr === "string" ? err.stderr : "";
    const message = execErrorMessage(error);
    if (/did not match any file/i.test(stderr) || /did not match any file/i.test(message)) {
      return { kind: "UNTRACKED" };
    }

    return { kind: "ERROR", message };
  }
}

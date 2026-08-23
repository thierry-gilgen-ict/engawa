// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  detectGitRepositoryState,
  detectSecretFileTrackedState,
  type ExecRunner,
} from "./git-state.js";

describe("git state detection", () => {
  it("classifies repository, untracked, and tracked secret file states", async () => {
    const calls: string[][] = [];
    const execRunner: ExecRunner = async (_file, args) => {
      calls.push(args);
      if (args[0] === "rev-parse") {
        return { stdout: ".git\n", stderr: "" };
      }
      if (args.includes(".engawa-map.local.json")) {
        throw Object.assign(
          new Error("pathspec '.engawa-map.local.json' did not match any file(s) known to git"),
          {
            code: 1,
            stderr: "pathspec '.engawa-map.local.json' did not match any file(s) known to git",
          },
        );
      }
      throw Object.assign(new Error("unexpected"), { code: 99 });
    };

    const repoState = await detectGitRepositoryState("/tmp/project", execRunner);
    expect(repoState).toEqual({ kind: "REPOSITORY" });

    const trackedState = await detectSecretFileTrackedState(
      "/tmp/project",
      ".engawa-map.local.json",
      execRunner,
    );
    expect(trackedState).toEqual({ kind: "UNTRACKED" });
    expect(calls.map((args) => args[0])).toEqual(["rev-parse", "ls-files"]);
  });

  it("returns ERROR when tracked check fails unexpectedly", async () => {
    const execRunner: ExecRunner = async (_file, args) => {
      if (args[0] === "rev-parse") {
        return { stdout: ".git\n", stderr: "" };
      }
      throw Object.assign(new Error("git exploded"), { code: 2 });
    };

    const trackedState = await detectSecretFileTrackedState(
      "/tmp/project",
      ".engawa-map.local.json",
      execRunner,
    );
    expect(trackedState).toEqual({ kind: "ERROR", message: "git exploded" });
  });
});

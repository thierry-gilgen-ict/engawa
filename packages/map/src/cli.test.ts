// @vitest-environment node
import { describe, expect, it } from "vitest";
import { runCli } from "./cli.js";

describe("cli", () => {
  it("rejects --token flag", async () => {
    const code = await runCli(["register", "--token=secret"]);
    expect(code).toBe(1);
  });

  it("prints usage for unknown commands", async () => {
    const code = await runCli(["unknown"]);
    expect(code).toBe(1);
  });
});

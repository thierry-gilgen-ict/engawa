// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateExactSemver, SemverError } from "./semver.js";

describe("exact semver validation", () => {
  it("accepts exact versions with optional prerelease and build", () => {
    expect(validateExactSemver("0.1.1")).toBe("0.1.1");
    expect(validateExactSemver("1.2.3-alpha.1")).toBe("1.2.3-alpha.1");
    expect(validateExactSemver("1.2.3+build.1")).toBe("1.2.3+build.1");
    expect(validateExactSemver("  2.0.0  ")).toBe("2.0.0");
  });

  it("rejects ranges, aliases, and non-semver strings", () => {
    for (const version of [
      "^0.1.1",
      "~0.1.1",
      ">=0.1.1",
      "workspace:*",
      "file:../local",
      "git+https://example.com/pkg.git",
      "latest",
      "not-a-version",
    ]) {
      expect(() => validateExactSemver(version)).toThrow(SemverError);
    }
  });
});

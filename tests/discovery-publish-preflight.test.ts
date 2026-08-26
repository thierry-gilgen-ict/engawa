// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectRegistryMissing } from "../scripts/discovery-publish-preflight.mjs";

describe("expectRegistryMissing", () => {
  it("accepts an absent target version (npm E404)", () => {
    expect(() =>
      expectRegistryMissing("@scope/pkg@0.2.0", () => {
        const err = new Error("npm error code E404\nnpm error 404 Not Found");
        err.stderr = "npm error code E404\nnpm error 404 Not Found";
        throw err;
      }),
    ).not.toThrow();
  });

  it("rejects an existing target version", () => {
    expect(() => expectRegistryMissing("@scope/pkg@0.2.0", () => "0.2.0")).toThrow(
      /Expected unpublished package, found version 0\.2\.0/,
    );
  });

  it("fail-closes on non-404 registry/network failures", () => {
    expect(() =>
      expectRegistryMissing("@scope/pkg@0.2.0", () => {
        const err = new Error("connect ECONNREFUSED");
        err.stderr = "connect ECONNREFUSED 127.0.0.1:443";
        throw err;
      }),
    ).toThrow(/Registry lookup failed/);
  });

  it("published-version failure message is not swallowable as E404", () => {
    try {
      expectRegistryMissing("@scope/pkg@0.2.0", () => "0.2.0");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err.message).not.toMatch(/E404|404 Not Found|is not in this registry/i);
      expect(err.message).toMatch(/Expected unpublished package, found version 0\.2\.0/);
    }
  });
});

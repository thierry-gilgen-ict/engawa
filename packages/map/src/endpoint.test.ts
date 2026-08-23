// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolveRegistryEndpoint, validateRegistryEndpoint } from "./endpoint.js";

describe("registry endpoint rules", () => {
  it("requires https for production endpoints", () => {
    expect(validateRegistryEndpoint("https://registry.example.com")).toBe(
      "https://registry.example.com",
    );
    expect(() => validateRegistryEndpoint("http://evil.example.com")).toThrow(/https/i);
  });

  it("allows loopback http for development", () => {
    expect(validateRegistryEndpoint("http://127.0.0.1:3001")).toBe("http://127.0.0.1:3001");
    expect(validateRegistryEndpoint("http://localhost:3001")).toBe("http://localhost:3001");
  });

  it("rejects credentials in endpoint URL", () => {
    expect(() => validateRegistryEndpoint("https://user:pass@registry.example.com")).toThrow(
      /credentials/i,
    );
  });

  it("resolveRegistryEndpoint reads env override", () => {
    expect(resolveRegistryEndpoint("https://registry.example.com")).toBe(
      "https://registry.example.com",
    );
  });

  it("throws MISSING_ENDPOINT when env is unset", () => {
    expect(() => resolveRegistryEndpoint(undefined)).toThrow(/MISSING_ENDPOINT/);
  });
});

// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_REGISTRY_ENDPOINT,
  resolveRegistryEndpoint,
  validateRegistryEndpoint,
} from "./endpoint.js";

const originalEndpoint = process.env.ENGAWA_MAP_ENDPOINT;

afterEach(() => {
  if (originalEndpoint === undefined) {
    delete process.env.ENGAWA_MAP_ENDPOINT;
  } else {
    process.env.ENGAWA_MAP_ENDPOINT = originalEndpoint;
  }
});

describe("registry endpoint rules", () => {
  it("requires https for remote endpoints", () => {
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

  it("rejects invalid explicit override without falling back to production", () => {
    expect(() => resolveRegistryEndpoint("garbage")).toThrow(/valid URL/i);
    expect(() => resolveRegistryEndpoint("http://example.com")).toThrow(/https/i);
  });

  it("uses production default when env is unset", () => {
    delete process.env.ENGAWA_MAP_ENDPOINT;
    expect(resolveRegistryEndpoint()).toBe(DEFAULT_REGISTRY_ENDPOINT);
    expect(DEFAULT_REGISTRY_ENDPOINT).toBe("https://engawa-map.thierry-gilgen-ict.ch");
  });

  it("uses explicit staging override when set", () => {
    expect(resolveRegistryEndpoint("https://staging-engawa-map.thierry-gilgen-ict.ch")).toBe(
      "https://staging-engawa-map.thierry-gilgen-ict.ch",
    );
  });

  it("reads ENGAWA_MAP_ENDPOINT from process.env when no argument", () => {
    process.env.ENGAWA_MAP_ENDPOINT = "https://custom-registry.example.com";
    expect(resolveRegistryEndpoint()).toBe("https://custom-registry.example.com");
  });

  it("prefers explicit argument over process.env", () => {
    process.env.ENGAWA_MAP_ENDPOINT = "https://ignored.example.com";
    expect(resolveRegistryEndpoint("https://explicit.example.com")).toBe(
      "https://explicit.example.com",
    );
  });
});

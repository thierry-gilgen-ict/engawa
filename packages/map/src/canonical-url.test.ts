// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateAndNormalizeCanonicalUrl, CanonicalUrlError } from "./canonical-url.js";

describe("canonical URL validation", () => {
  it("normalizes https origins without network lookup", () => {
    expect(validateAndNormalizeCanonicalUrl("https://Example.COM/")).toBe("https://example.com");
    expect(validateAndNormalizeCanonicalUrl("https://example.com:443")).toBe("https://example.com");
    expect(validateAndNormalizeCanonicalUrl("https://example.com")).toBe("https://example.com");
  });

  it("accepts ordinary DNS hostnames without misclassifying them as IPv6", () => {
    for (const url of [
      "https://example.com",
      "https://www.example.com",
      "https://staging.example.com",
      "https://z.example.com",
      "https://staging-e2e-123.example.com",
    ]) {
      expect(validateAndNormalizeCanonicalUrl(url)).toBe(url);
    }
  });

  it("accepts a public IPv6 literal", () => {
    expect(validateAndNormalizeCanonicalUrl("https://[2001:4860:4860::8888]")).toBe(
      "https://[2001:4860:4860::8888]",
    );
  });

  it("rejects non-https schemes", () => {
    expect(() => validateAndNormalizeCanonicalUrl("http://example.com")).toThrow(CanonicalUrlError);
  });

  it("rejects credentials, query, and fragment", () => {
    expect(() => validateAndNormalizeCanonicalUrl("https://user:pass@example.com")).toThrow(
      /credentials/i,
    );
    expect(() => validateAndNormalizeCanonicalUrl("https://example.com?x=1")).toThrow(/query/i);
    expect(() => validateAndNormalizeCanonicalUrl("https://example.com#x")).toThrow(/fragment/i);
  });

  it("rejects path components explicitly", () => {
    for (const url of ["https://example.com/admin", "https://example.com/path/"]) {
      expect(() => validateAndNormalizeCanonicalUrl(url)).toThrow(/path/i);
    }
  });

  it("rejects localhost, .local, and private addresses", () => {
    for (const url of [
      "https://localhost",
      "https://foo.localhost",
      "https://app.local",
      "https://127.0.0.1",
      "https://10.0.0.1",
      "https://172.16.0.1",
      "https://192.168.1.1",
      "https://169.254.1.1",
      "https://[::1]",
      "https://[fc00::1]",
      "https://[fd00::1]",
      "https://[fe80::1]",
    ]) {
      expect(() => validateAndNormalizeCanonicalUrl(url)).toThrow(CanonicalUrlError);
    }
  });

  it("rejects link-local IPv6 fe80::/10 (fe80-febf first hextet)", () => {
    for (const hextet of ["fe80", "fea0", "feb0", "febf"]) {
      expect(() => validateAndNormalizeCanonicalUrl(`https://[${hextet}::1]`)).toThrow(
        CanonicalUrlError,
      );
    }
  });
});

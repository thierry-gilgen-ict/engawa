// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateAndNormalizeCanonicalUrl, CanonicalUrlError } from "./canonical-url.js";

describe("canonical URL validation", () => {
  it("normalizes https origins without network lookup", () => {
    expect(validateAndNormalizeCanonicalUrl("https://Example.COM/")).toBe("https://example.com");
    expect(validateAndNormalizeCanonicalUrl("https://example.com:443")).toBe("https://example.com");
    expect(validateAndNormalizeCanonicalUrl("https://example.com")).toBe("https://example.com");
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
      "https://app.local",
      "https://127.0.0.1",
      "https://10.0.0.1",
      "https://192.168.1.1",
      "https://[::1]",
      "https://[fc00::1]",
      "https://[fdff:ffff::1]",
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

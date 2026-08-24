/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { InspectError } from "../errors.js";
import {
  assertFetchTargetAllowed,
  assertResolvablePublicTarget,
  isPrivateOrReservedAddress,
  parseTargetUrl,
} from "./url.js";

describe("url policy", () => {
  it("identifies private IPv4 addresses", () => {
    expect(isPrivateOrReservedAddress("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedAddress("10.0.0.1")).toBe(true);
    expect(isPrivateOrReservedAddress("192.168.1.1")).toBe(true);
    expect(isPrivateOrReservedAddress("8.8.8.8")).toBe(false);
  });

  it("identifies private IPv6 addresses", () => {
    expect(isPrivateOrReservedAddress("::1")).toBe(true);
    expect(isPrivateOrReservedAddress("fc00::1")).toBe(true);
    expect(isPrivateOrReservedAddress("fe80::1")).toBe(true);
  });

  it("rejects literal private IP without allow-local", async () => {
    const url = parseTargetUrl("http://10.0.0.1/");
    await expect(assertResolvablePublicTarget(url, false)).rejects.toThrow(InspectError);
  });

  it("rejects private redirect target without allow-local", async () => {
    const url = parseTargetUrl("http://192.168.1.50/private");
    await expect(assertFetchTargetAllowed(url, { allowLocal: false })).rejects.toThrow(
      InspectError,
    );
  });

  it("blocks cross-origin redirect before fetch when lockOrigin set", async () => {
    const url = parseTargetUrl("https://other.example/path");
    await expect(
      assertFetchTargetAllowed(url, { allowLocal: false, lockOrigin: "https://example.com" }),
    ).rejects.toThrow(/Cross-origin redirect blocked/);
  });
});

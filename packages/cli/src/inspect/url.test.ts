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
    expect(isPrivateOrReservedAddress("1.1.1.1")).toBe(false);
  });

  it("identifies private IPv6 addresses", () => {
    expect(isPrivateOrReservedAddress("::1")).toBe(true);
    expect(isPrivateOrReservedAddress("fc00::1")).toBe(true);
    expect(isPrivateOrReservedAddress("fe80::1")).toBe(true);
  });

  it("blocks IPv4-mapped private IPv6 addresses", () => {
    expect(isPrivateOrReservedAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedAddress("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateOrReservedAddress("::ffff:192.168.1.1")).toBe(true);
    expect(isPrivateOrReservedAddress("::ffff:7f00:1")).toBe(true);
  });

  it("allows IPv4-mapped public IPv6 addresses", () => {
    expect(isPrivateOrReservedAddress("::ffff:8.8.8.8")).toBe(false);
  });

  it("blocks CGNAT, documentation, multicast, and reserved IPv4 ranges", () => {
    const blocked = [
      "100.64.0.1",
      "198.18.0.1",
      "192.0.2.1",
      "198.51.100.1",
      "203.0.113.1",
      "224.0.0.1",
      "240.0.0.1",
      "255.255.255.255",
    ];
    for (const addr of blocked) {
      expect(isPrivateOrReservedAddress(addr)).toBe(true);
    }
  });

  it("blocks IPv6 unspecified, multicast, and documentation ranges", () => {
    expect(isPrivateOrReservedAddress("::")).toBe(true);
    expect(isPrivateOrReservedAddress("ff02::1")).toBe(true);
    expect(isPrivateOrReservedAddress("2001:db8::1")).toBe(true);
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

  it("rejects IPv4-mapped private address without allow-local", async () => {
    const url = parseTargetUrl("http://[::ffff:127.0.0.1]/");
    await expect(assertFetchTargetAllowed(url, { allowLocal: false })).rejects.toThrow(
      InspectError,
    );
  });

  it("allows IPv4-mapped private address with allow-local", async () => {
    const url = parseTargetUrl("http://[::ffff:127.0.0.1]/");
    await expect(assertFetchTargetAllowed(url, { allowLocal: true })).resolves.toBeUndefined();
  });

  it("blocks cross-origin redirect before fetch when lockOrigin set", async () => {
    const url = parseTargetUrl("https://other.example/path");
    await expect(
      assertFetchTargetAllowed(url, { allowLocal: false, lockOrigin: "https://example.com" }),
    ).rejects.toThrow(/Cross-origin redirect blocked/);
  });
});

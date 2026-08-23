// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FROZEN_ERROR_CODES } from "./constants.js";
import {
  errorResponseSchema,
  localStateSchema,
  mapConfigSchema,
  registerResponseSchema,
  registrationPayloadSchema,
  statusResponseSchema,
} from "./schemas.js";

describe("strict schemas reject unknown fields", () => {
  it("rejects unknown config fields", () => {
    expect(() =>
      mapConfigSchema.parse({
        displayName: "x",
        canonicalUrl: "https://example.com",
        enabled: true,
      }),
    ).toThrow();
  });

  it("accepts core-only registration payload", () => {
    expect(
      registrationPayloadSchema.parse({
        displayName: "x",
        canonicalUrl: "https://example.com",
        packages: {
          "@thierry-gilgen-ict/engawa-core": "0.1.1",
        },
      }).packages["@thierry-gilgen-ict/engawa-core"],
    ).toBe("0.1.1");
  });

  it("rejects unknown registration payload fields", () => {
    expect(() =>
      registrationPayloadSchema.parse({
        displayName: "x",
        canonicalUrl: "https://example.com",
        packages: {
          "@thierry-gilgen-ict/engawa-core": "0.1.1",
        },
        nodeVersion: "24",
      }),
    ).toThrow();
  });

  it("rejects unknown response fields", () => {
    expect(() =>
      registerResponseSchema.parse({
        siteId: "550e8400-e29b-41d4-a716-446655440000",
        state: "PENDING",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        siteToken: "secret",
      }),
    ).toThrow();

    expect(() =>
      statusResponseSchema.parse({
        siteId: "550e8400-e29b-41d4-a716-446655440000",
        state: "LISTED",
        displayName: "x",
        canonicalUrl: "https://example.com",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        moderationNotes: "hidden",
      }),
    ).toThrow();

    expect(() =>
      errorResponseSchema.parse({
        error: {
          code: "INVALID_REQUEST",
          message: "bad",
          stack: "trace",
        },
      }),
    ).toThrow();
  });

  it("accepts only frozen v1 error codes", () => {
    for (const code of FROZEN_ERROR_CODES) {
      expect(
        errorResponseSchema.parse({
          error: { code, message: "ok" },
        }).error.code,
      ).toBe(code);
    }

    expect(() =>
      errorResponseSchema.parse({
        error: { code: "NOT_A_REAL_CODE", message: "bad" },
      }),
    ).toThrow();
  });

  it("accepts valid local pending and registered state", () => {
    expect(
      localStateSchema.parse({
        registration: {
          state: "pending-request",
          canonicalUrl: "https://example.com",
          idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
          siteToken: "token",
          payloadHash: "deadbeef",
        },
      }).registration.state,
    ).toBe("pending-request");

    expect(
      localStateSchema.parse({
        registration: {
          state: "registered",
          siteId: "550e8400-e29b-41d4-a716-446655440000",
          canonicalUrl: "https://example.com",
          siteToken: "token",
        },
      }).registration.state,
    ).toBe("registered");
  });
});

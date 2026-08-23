// @vitest-environment node
import { describe, expect, it } from "vitest";
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

  it("rejects unknown registration payload fields", () => {
    expect(() =>
      registrationPayloadSchema.parse({
        displayName: "x",
        canonicalUrl: "https://example.com",
        packages: {
          "@thierry-gilgen-ict/engawa-core": "0.1.1",
          "@thierry-gilgen-ict/engawa-discovery": "0.1.1",
          "@thierry-gilgen-ict/engawa-mcp": "0.1.1",
          "@thierry-gilgen-ict/engawa-react": "0.1.0",
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

  it("accepts valid local pending and registered state", () => {
    expect(
      localStateSchema.parse({
        registration: {
          state: "pending-request",
          canonicalUrl: "https://example.com",
          idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
          siteToken: "token",
        },
      }).registration.state,
    ).toBe("pending-request");
  });
});

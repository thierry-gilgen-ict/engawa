// @vitest-environment node
import { describe, expect, it } from "vitest";
import { RegistryClientError } from "./client.js";
import {
  validateIdempotencyKey,
  validateSiteId,
  validateSiteTokenHash,
} from "./protocol-validation.js";
import { hashSiteToken } from "./token.js";

const VALID_SITE_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_IDEMPOTENCY_KEY = "550e8400-e29b-41d4-a716-446655440001";

describe("protocol validation", () => {
  it("accepts valid UUIDs and token hashes", () => {
    expect(() => validateSiteId(VALID_SITE_ID)).not.toThrow();
    expect(() => validateIdempotencyKey(VALID_IDEMPOTENCY_KEY)).not.toThrow();
    expect(() => validateSiteTokenHash(hashSiteToken("test-token"))).not.toThrow();
  });

  it("rejects invalid siteId values", () => {
    expect(() => validateSiteId("not-a-uuid")).toThrow(RegistryClientError);
    expect(() => validateSiteId("550e8400-e29b-41d4-a716-44665544000")).toThrow(
      RegistryClientError,
    );
  });

  it("rejects invalid idempotency keys", () => {
    expect(() => validateIdempotencyKey("bad-key")).toThrow(RegistryClientError);
  });

  it("rejects invalid site token hashes", () => {
    expect(() => validateSiteTokenHash("abc")).toThrow(RegistryClientError);
    expect(() => validateSiteTokenHash("x".repeat(42))).toThrow(RegistryClientError);
    expect(() => validateSiteTokenHash("x".repeat(44))).toThrow(RegistryClientError);
  });
});

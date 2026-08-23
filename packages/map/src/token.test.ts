// @vitest-environment node
import { describe, expect, it } from "vitest";
import { generateIdempotencyKey, generateSiteToken, hashSiteToken } from "./token.js";

describe("site token model", () => {
  it("generates 256-bit tokens and stable base64url hashes", () => {
    const token = generateSiteToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    const hash = hashSiteToken(token);
    expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hashSiteToken(token)).toBe(hash);
  });

  it("generates UUID idempotency keys", () => {
    expect(generateIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

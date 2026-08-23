import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SITE_TOKEN_BYTES } from "./constants.js";

export function generateSiteToken(): string {
  return randomBytes(SITE_TOKEN_BYTES).toString("base64url");
}

export function hashSiteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

export function generateIdempotencyKey(): string {
  return randomUUID();
}

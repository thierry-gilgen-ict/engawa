import { RegistryClientError } from "./client.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SITE_TOKEN_HASH_RE = /^[A-Za-z0-9_-]{43}$/;

export function validateSiteId(siteId: string): void {
  if (!UUID_RE.test(siteId)) {
    throw new RegistryClientError("Invalid siteId format", "INVALID_REQUEST");
  }
}

export function validateIdempotencyKey(key: string): void {
  if (!UUID_RE.test(key)) {
    throw new RegistryClientError("Invalid Idempotency-Key format", "INVALID_REQUEST");
  }
}

export function validateSiteTokenHash(hash: string): void {
  if (!SITE_TOKEN_HASH_RE.test(hash)) {
    throw new RegistryClientError("Invalid Engawa-Map-Site-Token-Hash format", "INVALID_REQUEST");
  }
}

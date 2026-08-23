import { createHash } from "node:crypto";
import { validateAndNormalizeCanonicalUrl } from "./canonical-url.js";
import { registrationPayloadSchema, type MapConfig } from "./schemas.js";
import type { EngawaPackages, RegistrationPayload } from "./schemas.js";

export function hashRegistrationPayload(payload: RegistrationPayload): string {
  const normalized = registrationPayloadSchema.parse(payload);
  const serialized = JSON.stringify(normalized);
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

export function buildRegistrationPayload(
  config: MapConfig,
  packages: EngawaPackages,
): RegistrationPayload {
  const canonicalUrl = validateAndNormalizeCanonicalUrl(config.canonicalUrl);
  const payload: RegistrationPayload = {
    displayName: config.displayName,
    canonicalUrl,
    packages,
  };

  if (config.hints) {
    payload.hints = config.hints;
  }

  return payload;
}

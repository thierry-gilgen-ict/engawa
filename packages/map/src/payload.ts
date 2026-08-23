import { validateAndNormalizeCanonicalUrl } from "./canonical-url.js";
import type { MapConfig } from "./schemas.js";
import type { EngawaPackages, RegistrationPayload } from "./schemas.js";

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

export const ENGAWA_MAP_VERSION = "0.1.0";

export const REQUIRED_ENGAWA_PACKAGE = "@thierry-gilgen-ict/engawa-core" as const;

export const OPTIONAL_ENGAWA_PACKAGE_NAMES = [
  "@thierry-gilgen-ict/engawa-discovery",
  "@thierry-gilgen-ict/engawa-mcp",
  "@thierry-gilgen-ict/engawa-react",
] as const;

export const DETECTABLE_ENGAWA_PACKAGE_NAMES = [
  REQUIRED_ENGAWA_PACKAGE,
  ...OPTIONAL_ENGAWA_PACKAGE_NAMES,
] as const;

export type EngawaPackageName = (typeof DETECTABLE_ENGAWA_PACKAGE_NAMES)[number];

/** @deprecated Use DETECTABLE_ENGAWA_PACKAGE_NAMES */
export const ENGAWA_PACKAGE_NAMES = DETECTABLE_ENGAWA_PACKAGE_NAMES;

export const CONFIG_FILE_NAME = "engawa-map.config.json";
export const LOCAL_STATE_FILE_NAME = ".engawa-map.local.json";
export const GITIGNORE_ENTRY = ".engawa-map.local.json";

export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_RESPONSE_BYTES = 65_536;
export const MAX_REQUEST_BODY_BYTES = 16_384;

export const SITE_TOKEN_BYTES = 32;
export const API_PATH_PREFIX = "/api/v1";

export const MAX_DISPLAY_NAME_LENGTH = 200;
export const MAX_CANONICAL_URL_LENGTH = 2048;
export const MAX_ERROR_MESSAGE_LENGTH = 500;

export const FROZEN_ERROR_CODES = [
  "INVALID_REQUEST",
  "INVALID_CANONICAL_URL",
  "CANONICAL_URL_ALREADY_REGISTERED",
  "RATE_LIMITED",
  "UNAUTHORIZED",
  "SITE_NOT_FOUND",
  "SITE_DELISTED",
  "IDEMPOTENCY_CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type FrozenErrorCode = (typeof FROZEN_ERROR_CODES)[number];

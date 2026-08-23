export const ENGAWA_MAP_VERSION = "0.1.0";

export const ENGAWA_PACKAGE_NAMES = [
  "@thierry-gilgen-ict/engawa-core",
  "@thierry-gilgen-ict/engawa-discovery",
  "@thierry-gilgen-ict/engawa-mcp",
  "@thierry-gilgen-ict/engawa-react",
] as const;

export type EngawaPackageName = (typeof ENGAWA_PACKAGE_NAMES)[number];

export const CONFIG_FILE_NAME = "engawa-map.config.json";
export const LOCAL_STATE_FILE_NAME = ".engawa-map.local.json";
export const GITIGNORE_ENTRY = ".engawa-map.local.json";

export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_RESPONSE_BYTES = 65_536;
export const MAX_REQUEST_BODY_BYTES = 16_384;

export const SITE_TOKEN_BYTES = 32;
export const API_PATH_PREFIX = "/api/v1";

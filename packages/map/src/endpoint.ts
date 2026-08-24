const LOOPBACK_HTTP_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export const DEFAULT_REGISTRY_ENDPOINT = "https://engawa-map.thierry-gilgen-ict.ch";

export class EndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EndpointError";
  }
}

export function validateRegistryEndpoint(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new EndpointError("ENGAWA_MAP_ENDPOINT must be a valid URL");
  }

  if (parsed.username || parsed.password) {
    throw new EndpointError("ENGAWA_MAP_ENDPOINT must not contain credentials");
  }

  const isLoopbackHttp =
    parsed.protocol === "http:" && LOOPBACK_HTTP_HOSTS.has(parsed.hostname.toLowerCase());

  if (parsed.protocol === "https:") {
    return parsed.origin;
  }

  if (isLoopbackHttp) {
    return parsed.origin;
  }

  throw new EndpointError(
    "ENGAWA_MAP_ENDPOINT must use https, or http only for loopback development",
  );
}

export function resolveRegistryEndpoint(envValue?: string): string {
  const raw = envValue !== undefined ? envValue : process.env.ENGAWA_MAP_ENDPOINT;
  if (raw === undefined) {
    return validateRegistryEndpoint(DEFAULT_REGISTRY_ENDPOINT);
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    throw new EndpointError("ENGAWA_MAP_ENDPOINT must not be empty");
  }

  return validateRegistryEndpoint(trimmed);
}

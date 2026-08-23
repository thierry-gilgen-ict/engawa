const LOOPBACK_HTTP_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

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

export function resolveRegistryEndpoint(envValue = process.env.ENGAWA_MAP_ENDPOINT): string {
  if (!envValue) {
    throw new EndpointError("MISSING_ENDPOINT");
  }
  return validateRegistryEndpoint(envValue);
}

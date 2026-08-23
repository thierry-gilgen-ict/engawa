import { isIP } from "node:net";

export class CanonicalUrlError extends Error {
  readonly code = "INVALID_CANONICAL_URL";

  constructor(message: string) {
    super(message);
    this.name = "CanonicalUrlError";
  }
}

function isPrivateOrReservedIpv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) {
    return false;
  }

  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [a, b] = octets;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  return false;
}

function normalizeIpv6Host(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

function parseFirstIpv6Hextet(host: string): number | undefined {
  const normalized = normalizeIpv6Host(host).toLowerCase();
  if (normalized === "::1" || normalized === "1") {
    return 0;
  }

  const beforeDoubleColon = normalized.split("::")[0];
  if (!beforeDoubleColon) {
    return 0;
  }

  const firstSegment = beforeDoubleColon.split(":")[0];
  if (!firstSegment) {
    return 0;
  }

  const value = Number.parseInt(firstSegment, 16);
  return Number.isNaN(value) ? undefined : value;
}

function isPrivateOrReservedIpv6(host: string): boolean {
  const normalized = normalizeIpv6Host(host).toLowerCase();
  if (normalized === "::1") return true;

  const firstHextet = parseFirstIpv6Hextet(host);
  if (firstHextet === undefined) {
    return true;
  }

  if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) {
    return true;
  }

  if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) {
    return true;
  }

  return false;
}

function rejectUnsafeHostname(hostname: string): void {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) {
    throw new CanonicalUrlError("localhost hostnames are not allowed");
  }
  if (lower.endsWith(".local")) {
    throw new CanonicalUrlError(".local hostnames are not allowed");
  }

  const normalizedHost = normalizeIpv6Host(lower);
  const ipVersion = isIP(normalizedHost);

  if (ipVersion === 4) {
    if (isPrivateOrReservedIpv4(normalizedHost)) {
      throw new CanonicalUrlError("private or reserved IP addresses are not allowed");
    }
    return;
  }

  if (ipVersion === 6) {
    if (isPrivateOrReservedIpv6(normalizedHost)) {
      throw new CanonicalUrlError("private or reserved IP addresses are not allowed");
    }
    return;
  }
}

export function validateAndNormalizeCanonicalUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new CanonicalUrlError("malformed URL");
  }

  if (parsed.protocol !== "https:") {
    throw new CanonicalUrlError("scheme must be https");
  }
  if (parsed.username || parsed.password) {
    throw new CanonicalUrlError("credentials are not allowed");
  }
  if (parsed.search) {
    throw new CanonicalUrlError("query strings are not allowed");
  }
  if (parsed.hash) {
    throw new CanonicalUrlError("fragments are not allowed");
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new CanonicalUrlError("path components are not allowed; use the site root URL only");
  }

  const hostname = parsed.hostname.toLowerCase();
  rejectUnsafeHostname(hostname);

  let port = parsed.port;
  if (port === "443") {
    port = "";
  }

  const portSuffix = port ? `:${port}` : "";
  return `https://${hostname}${portSuffix}`;
}

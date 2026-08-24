import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { InspectError } from "../errors.js";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

export function parseTargetUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new InspectError("URL is required");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InspectError(`Invalid URL: ${trimmed}`);
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new InspectError(
      `Unsupported URL scheme: ${parsed.protocol} (only http and https are allowed)`,
    );
  }
  return parsed;
}

export function normalizeUrlForCrawl(url: URL): string {
  const copy = new URL(url.href);
  copy.hash = "";
  return copy.href;
}

export function pathnameFromUrl(url: URL): string {
  if (!url.pathname || url.pathname === "") {
    return "/";
  }
  return url.pathname.endsWith("/") && url.pathname !== "/"
    ? url.pathname.slice(0, -1)
    : url.pathname;
}

export function isSameOrigin(a: URL, b: URL): boolean {
  return a.origin === b.origin;
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

export function isPrivateOrReservedAddress(address: string): boolean {
  const normalized = normalizeIpv6Host(address).toLowerCase();
  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(normalized);
    if (!match) return true;
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

  if (ipVersion === 6) {
    if (normalized === "::1") return true;
    const firstHextet = parseFirstIpv6Hextet(normalized);
    if (firstHextet === undefined) return true;
    if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) return true;
    if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) return true;
    return false;
  }

  return false;
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local")) return true;

  const normalizedHost = normalizeIpv6Host(host);
  const ipVersion = isIP(normalizedHost);
  if (ipVersion === 4 || ipVersion === 6) {
    return isPrivateOrReservedAddress(normalizedHost);
  }
  return false;
}

export function assertPublicTarget(url: URL, allowLocal: boolean): void {
  if (allowLocal) return;
  if (isPrivateOrLocalHost(url.hostname)) {
    throw new InspectError(
      `Refusing to inspect private or local target ${url.hostname}. Use --allow-local to override.`,
    );
  }
}

export async function assertResolvablePublicTarget(url: URL, allowLocal: boolean): Promise<void> {
  if (allowLocal) return;

  assertPublicTarget(url, false);

  const hostname = url.hostname;
  const ipVersion = isIP(normalizeIpv6Host(hostname));
  if (ipVersion === 4 || ipVersion === 6) {
    return;
  }

  try {
    const records = await lookup(hostname, { all: true });
    for (const record of records) {
      if (isPrivateOrReservedAddress(record.address)) {
        throw new InspectError(
          `Refusing to inspect target ${hostname} (resolves to private address). Use --allow-local to override.`,
        );
      }
    }
  } catch (error) {
    if (error instanceof InspectError) {
      throw error;
    }
    throw new InspectError(`DNS resolution failed for ${hostname}`);
  }
}

export interface FetchTargetPolicy {
  allowLocal: boolean;
  lockOrigin?: string;
}

export async function assertFetchTargetAllowed(url: URL, policy: FetchTargetPolicy): Promise<void> {
  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    throw new InspectError(
      `Unsupported URL scheme: ${url.protocol} (only http and https are allowed)`,
    );
  }
  if (policy.lockOrigin && url.origin !== policy.lockOrigin) {
    throw new InspectError(`Cross-origin redirect blocked: ${url.origin}`);
  }
  await assertResolvablePublicTarget(url, policy.allowLocal);
}

const BINARY_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".bmp",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".mp4",
  ".webm",
  ".mp3",
  ".wav",
  ".ogg",
  ".zip",
  ".gz",
  ".tar",
  ".rar",
  ".7z",
  ".pdf",
  ".exe",
  ".dmg",
  ".apk",
]);

export function isLikelyBinaryPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot === -1) return false;
  const ext = lower.slice(dot);
  return BINARY_EXTENSIONS.has(ext);
}

export function resolveSameOriginLink(base: URL, href: string): URL | null {
  const trimmed = href.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("mailto:")
  ) {
    return null;
  }
  try {
    const resolved = new URL(trimmed, base);
    if (!ALLOWED_SCHEMES.has(resolved.protocol)) {
      return null;
    }
    return resolved;
  } catch {
    return null;
  }
}

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

function parseIpv4Octets(dotted: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(dotted);
  if (!match) return null;
  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return null;
  }
  return octets;
}

function isPrivateOrReservedIpv4Octets(octets: number[]): boolean {
  const [a, b, c] = octets;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && b >= 18 && b <= 19) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224 && a <= 239) return true;
  if (a >= 240) return true;
  return false;
}

function isPrivateOrReservedIpv4(dotted: string): boolean {
  const octets = parseIpv4Octets(dotted);
  if (!octets) return true;
  return isPrivateOrReservedIpv4Octets(octets);
}

function extractIpv4FromMappedIpv6(host: string): string | null {
  const lower = normalizeIpv6Host(host).toLowerCase();
  const dottedTail = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dottedTail) {
    return dottedTail[1];
  }
  const hexTail = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexTail) {
    const hi = Number.parseInt(hexTail[1], 16);
    const lo = Number.parseInt(hexTail[2], 16);
    if (Number.isNaN(hi) || Number.isNaN(lo)) return null;
    const a = (hi >> 8) & 0xff;
    const b = hi & 0xff;
    const c = (lo >> 8) & 0xff;
    const d = lo & 0xff;
    return `${a}.${b}.${c}.${d}`;
  }
  return null;
}

function parseIpv6Hextets(host: string): number[] | null {
  const normalized = normalizeIpv6Host(host).toLowerCase();
  if (!normalized.includes(":")) return null;

  const [head, tail] = normalized.split("::");
  const headParts = head ? head.split(":").filter(Boolean) : [];
  const tailParts = tail ? tail.split(":").filter(Boolean) : [];

  const parsePart = (part: string): number | null => {
    const value = Number.parseInt(part, 16);
    return Number.isNaN(value) ? null : value;
  };

  const hextets: number[] = [];
  for (const part of headParts) {
    const value = parsePart(part);
    if (value === null) return null;
    hextets.push(value);
  }
  for (const part of tailParts) {
    const value = parsePart(part);
    if (value === null) return null;
    hextets.push(value);
  }
  return hextets;
}

function isPrivateOrReservedIpv6Native(host: string): boolean {
  const normalized = normalizeIpv6Host(host).toLowerCase();
  if (normalized === "::" || normalized === "") return true;
  if (normalized === "::1") return true;

  const mappedIpv4 = extractIpv4FromMappedIpv6(normalized);
  if (mappedIpv4) {
    return isPrivateOrReservedIpv4(mappedIpv4);
  }

  const firstHextet = parseFirstIpv6Hextet(normalized);
  if (firstHextet === undefined) return true;
  if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) return true;
  if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) return true;
  if (firstHextet >= 0xff00) return true;

  const hextets = parseIpv6Hextets(normalized);
  if (hextets && hextets.length >= 2 && hextets[0] === 0x2001 && hextets[1] === 0xdb8) {
    return true;
  }

  return false;
}

export function isPrivateOrReservedAddress(address: string): boolean {
  const normalized = normalizeIpv6Host(address).toLowerCase();
  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    return isPrivateOrReservedIpv4(normalized);
  }

  if (ipVersion === 6) {
    return isPrivateOrReservedIpv6Native(normalized);
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

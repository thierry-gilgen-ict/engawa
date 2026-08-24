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

function parseIpv4(host: string): number[] | null {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return null;
  }
  const parts = host.split(".").map((p) => Number(p));
  if (parts.some((p) => p > 255)) {
    return null;
  }
  return parts;
}

function isPrivateIpv4(parts: number[]): boolean {
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 0) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe80")) return true;
  return false;
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local")) return true;
  const ipv4 = parseIpv4(host);
  if (ipv4) return isPrivateIpv4(ipv4);
  if (host.includes(":")) return isPrivateIpv6(host);
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

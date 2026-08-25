export function absolutizeHref(href: string, pageBaseUrl: string): string {
  const trimmed = href.trim();
  if (!trimmed) return trimmed;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("javascript:") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return trimmed;
  }

  const base = linkResolutionBase(pageBaseUrl);

  if (trimmed.startsWith("//")) {
    return `${base.protocol}${trimmed}`;
  }

  try {
    return new URL(trimmed, base).href;
  } catch {
    return trimmed;
  }
}

export function linkResolutionBase(pageBaseUrl: string): URL {
  const url = new URL(pageBaseUrl);
  const path = url.pathname;
  if (path === "/" || path.endsWith("/")) {
    return url;
  }
  if (/\.[a-z0-9]+$/i.test(path)) {
    const parent = path.slice(0, path.lastIndexOf("/"));
    url.pathname = parent === "" ? "/" : `${parent}/`;
    return url;
  }
  if (!path.endsWith("/")) {
    url.pathname = `${path}/`;
  }
  return url;
}

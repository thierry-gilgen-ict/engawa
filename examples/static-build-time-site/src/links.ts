export function absolutizeHref(href: string, siteOrigin: string): string {
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

  const base = new URL(siteOrigin.endsWith("/") ? siteOrigin : `${siteOrigin}/`);

  if (trimmed.startsWith("//")) {
    return `${base.protocol}${trimmed}`;
  }

  try {
    return new URL(trimmed, base).href;
  } catch {
    return trimmed;
  }
}

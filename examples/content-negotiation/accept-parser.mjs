/**
 * EXPERIMENT_ONLY = YES
 * PRODUCTION_READY_ACCEPT_PARSER = NO
 *
 * Minimal Accept selection for text/html vs text/markdown in the content-negotiation experiment.
 * Not an Engawa runtime API.
 */

/** @typedef {"html" | "markdown" | "not-acceptable"} Representation */

/**
 * @param {string | undefined | null} acceptHeader
 * @returns {Representation}
 */
export function selectRepresentation(acceptHeader) {
  if (acceptHeader == null || acceptHeader.trim() === "") {
    return "html";
  }

  const ranges = parseAcceptHeader(acceptHeader);
  const htmlQ = effectiveQuality(ranges, "text/html");
  const markdownQ = effectiveQuality(ranges, "text/markdown");

  const htmlOk = htmlQ > 0;
  const markdownOk = markdownQ > 0;

  if (!htmlOk && !markdownOk) {
    const markdownExcluded = ranges.some(
      (r) => r.type === "text" && r.subtype === "markdown" && r.q === 0,
    );
    if (markdownExcluded && !ranges.some((r) => r.type === "text" && r.subtype === "html")) {
      return "html";
    }
    return "not-acceptable";
  }
  if (!htmlOk && markdownOk) {
    return "markdown";
  }
  if (htmlOk && !markdownOk) {
    return "html";
  }

  if (htmlQ > markdownQ) {
    return "html";
  }
  if (markdownQ > htmlQ) {
    return "markdown";
  }

  // Equal preference — preserve historical human/default representation.
  return "html";
}

/**
 * @param {string} header
 * @returns {Array<{ type: string; subtype: string; q: number }>}
 */
function parseAcceptHeader(header) {
  /** @type {Array<{ type: string; subtype: string; q: number }>} */
  const out = [];
  for (const rawPart of header.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;
    const segments = part.split(";").map((s) => s.trim());
    const [typeRaw, subtypeRaw] = segments[0].split("/");
    if (!typeRaw || !subtypeRaw) continue;
    let q = 1;
    for (const param of segments.slice(1)) {
      const [name, value] = param.split("=").map((s) => s.trim());
      if (name?.toLowerCase() === "q" && value != null) {
        const parsed = Number.parseFloat(value);
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    out.push({
      type: typeRaw.toLowerCase(),
      subtype: subtypeRaw.toLowerCase(),
      q,
    });
  }
  return out;
}

/**
 * @param {Array<{ type: string; subtype: string; q: number }>} ranges
 * @param {string} mediaType
 */
function effectiveQuality(ranges, mediaType) {
  const [type, subtype] = mediaType.toLowerCase().split("/");
  let best = 0;
  for (const range of ranges) {
    const specificity = matchSpecificity(range, type, subtype);
    if (specificity === 0) continue;
    const weighted = range.q * specificity;
    if (weighted > best) best = weighted;
  }
  return best;
}

/** Higher weight = more specific match. q=0 still flows through caller. */
function matchSpecificity(range, type, subtype) {
  if (range.type === type && range.subtype === subtype) return 1;
  if (range.type === type && range.subtype === "*") return 0.5;
  if (range.type === "*" && range.subtype === "*") return 0.1;
  return 0;
}

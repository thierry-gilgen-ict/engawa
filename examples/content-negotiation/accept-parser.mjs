/**
 * EXPERIMENT_ONLY = YES
 * PRODUCTION_READY_ACCEPT_PARSER = NO
 *
 * Minimal Accept selection for text/html vs text/markdown in the content-negotiation experiment.
 * Not an Engawa runtime API.
 *
 * RFC 9110: for each representation, the most specific matching media range
 * takes precedence; that range's q-value is the effective quality.
 * Do NOT multiply q by a specificity weight.
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

  // Experimental policy (not a universal RFC mandate):
  // if no available representation has q > 0 → 406.
  if (htmlQ === 0 && markdownQ === 0) {
    return "not-acceptable";
  }
  if (htmlQ === 0 && markdownQ > 0) {
    return "markdown";
  }
  if (htmlQ > 0 && markdownQ === 0) {
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
 * Effective quality = q of the most specific matching range.
 * Rank: exact type/subtype > type-star > star-star
 * Unmatched representation → 0.
 *
 * @param {Array<{ type: string; subtype: string; q: number }>} ranges
 * @param {string} mediaType
 */
function effectiveQuality(ranges, mediaType) {
  const [type, subtype] = mediaType.toLowerCase().split("/");
  let bestRank = 0;
  let bestQ = 0;
  for (const range of ranges) {
    const rank = matchRank(range, type, subtype);
    if (rank === 0) continue;
    if (rank > bestRank) {
      bestRank = rank;
      bestQ = range.q;
    }
  }
  return bestRank === 0 ? 0 : bestQ;
}

/** @returns {0|1|2|3} */
function matchRank(range, type, subtype) {
  if (range.type === type && range.subtype === subtype) return 3;
  if (range.type === type && range.subtype === "*") return 2;
  if (range.type === "*" && range.subtype === "*") return 1;
  return 0;
}

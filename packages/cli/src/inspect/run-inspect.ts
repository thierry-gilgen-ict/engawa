import { emptyFetchOutcome, fetchPage, safeFetchOptional } from "./fetch.js";
import { detectFrameworkHints } from "./frameworks.js";
import { parseHtmlDocument, detectAgentPageLinks } from "./html.js";
import { parseLlmsTxt } from "./llms.js";
import { isMcpUrl } from "./mcp.js";
import { buildRecommendation } from "./recommend.js";
import { buildRouteEntries, recordDiscoveredUrl, type RouteAccumulator } from "./routes.js";
import { inspectReportSchema } from "./schema.js";
import { computeScore } from "./score.js";
import { extractRobotsSitemapUrls, extractSitemapUrls, isSitemapIndex } from "./sitemap.js";
import {
  MAX_BODY_BYTES,
  MAX_CONCURRENCY,
  MAX_MARKDOWN_SAMPLES,
  MAX_REDIRECTS,
  SCHEMA_VERSION,
  type InspectOptions,
  type InspectReport,
} from "./types.js";
import {
  assertPublicTarget,
  isSameOrigin,
  normalizeUrlForCrawl,
  parseTargetUrl,
  pathnameFromUrl,
  type FetchTargetPolicy,
} from "./url.js";

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function isHtmlContent(contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return lower.includes("text/html") || lower.includes("application/xhtml");
}

function isTextMarkdown(contentType: string, path: string): boolean {
  const lower = contentType.toLowerCase();
  return lower.includes("text/markdown") || path.toLowerCase().endsWith(".md");
}

export async function runInspect(options: InspectOptions): Promise<InspectReport> {
  const input = parseTargetUrl(options.inputUrl);
  assertPublicTarget(input, options.allowLocal);

  const crawlErrors: string[] = [];
  const discovered = new Map<string, RouteAccumulator>();
  const fetchOpts = { timeoutMs: options.timeoutMs, maxBodyBytes: MAX_BODY_BYTES };
  const seedPolicy: FetchTargetPolicy = { allowLocal: options.allowLocal };

  const seedFetch = await fetchPage(input.href, fetchOpts, seedPolicy);
  const finalUrl = new URL(seedFetch.finalUrl);
  const origin = new URL(finalUrl.origin);
  const crawlPolicy: FetchTargetPolicy = {
    allowLocal: options.allowLocal,
    lockOrigin: origin.origin,
  };

  recordDiscoveredUrl(discovered, finalUrl, "seed");

  const siteReachable = seedFetch.status >= 200 && seedFetch.status < 400 && !seedFetch.tooLarge;
  if (seedFetch.error) crawlErrors.push(seedFetch.error);

  let parsedSeed: ReturnType<typeof parseHtmlDocument> | undefined;
  let seedHtml = "";
  if (isHtmlContent(seedFetch.contentType) && seedFetch.body) {
    seedHtml = seedFetch.body;
    parsedSeed = parseHtmlDocument(seedFetch.body, finalUrl);
    for (const link of parsedSeed.links) {
      try {
        const linkUrl = new URL(link);
        if (!isSameOrigin(linkUrl, origin)) continue;
        recordDiscoveredUrl(discovered, linkUrl, "same-origin-link");
      } catch {
        continue;
      }
    }
    if (parsedSeed.canonicalUrl) {
      recordDiscoveredUrl(discovered, new URL(parsedSeed.canonicalUrl), "canonical");
    }
  }

  const robotsUrl = new URL("/robots.txt", origin);
  const sitemapUrl = new URL("/sitemap.xml", origin);
  const llmsUrl = new URL("/llms.txt", origin);

  const [robotsFetch, defaultSitemapFetch, llmsFetch] = await Promise.all([
    safeFetchOptional(robotsUrl.href, "robots.txt", fetchOpts, crawlPolicy, crawlErrors),
    safeFetchOptional(sitemapUrl.href, "sitemap.xml", fetchOpts, crawlPolicy, crawlErrors),
    safeFetchOptional(llmsUrl.href, "llms.txt", fetchOpts, crawlPolicy, crawlErrors),
  ]);

  let sitemapDiscovered = false;
  const sitemapUrlsToFetch: string[] = [];

  if (
    defaultSitemapFetch.status >= 200 &&
    defaultSitemapFetch.status < 300 &&
    defaultSitemapFetch.body
  ) {
    sitemapDiscovered = true;
    sitemapUrlsToFetch.push(defaultSitemapFetch.finalUrl);
  }

  if (robotsFetch.status >= 200 && robotsFetch.status < 300 && robotsFetch.body) {
    const fromRobots = extractRobotsSitemapUrls(robotsFetch.body, origin);
    for (const u of fromRobots) {
      sitemapUrlsToFetch.push(u);
    }
  }

  const sitemapPageUrls: string[] = [];
  const seenSitemaps = new Set<string>();
  for (const sm of sitemapUrlsToFetch) {
    if (seenSitemaps.has(sm)) continue;
    seenSitemaps.add(sm);
    const smFetch =
      sm === defaultSitemapFetch.finalUrl
        ? defaultSitemapFetch
        : await safeFetchOptional(sm, `sitemap ${sm}`, fetchOpts, crawlPolicy, crawlErrors);
    if (smFetch.status < 200 || smFetch.status >= 300 || !smFetch.body) continue;
    sitemapDiscovered = true;
    if (isSitemapIndex(smFetch.body)) {
      const childSitemaps = extractSitemapUrls(smFetch.body, origin, 5);
      for (const child of childSitemaps.slice(0, 3)) {
        if (seenSitemaps.has(child)) continue;
        seenSitemaps.add(child);
        const childFetch = await safeFetchOptional(
          child,
          `sitemap ${child}`,
          fetchOpts,
          crawlPolicy,
          crawlErrors,
        );
        if (childFetch.body) {
          sitemapPageUrls.push(...extractSitemapUrls(childFetch.body, origin, options.maxPages));
        }
      }
    } else {
      sitemapPageUrls.push(...extractSitemapUrls(smFetch.body, origin, options.maxPages));
    }
  }

  for (const pageUrl of sitemapPageUrls) {
    try {
      const url = new URL(pageUrl);
      if (!isSameOrigin(url, origin)) continue;
      recordDiscoveredUrl(discovered, url, "sitemap");
    } catch {
      continue;
    }
  }

  const llmsParsed =
    llmsFetch.status >= 200 && llmsFetch.status < 300 && llmsFetch.body
      ? parseLlmsTxt(llmsFetch.body, origin)
      : { urls: [], mcpReferenced: false, markdownReferenced: false };

  for (const u of llmsParsed.urls) {
    try {
      const url = new URL(u);
      if (!isSameOrigin(url, origin)) continue;
      recordDiscoveredUrl(discovered, url, "llms.txt");
    } catch {
      continue;
    }
  }

  const queue: string[] = [];
  const queued = new Set<string>();
  for (const key of discovered.keys()) {
    if (!queued.has(key)) {
      queued.add(key);
      queue.push(key);
    }
  }

  const fetchedPages: Array<{
    url: string;
    status: number;
    contentType: string;
    body: string;
    headers: Record<string, string>;
    parsed?: ReturnType<typeof parseHtmlDocument>;
  }> = [];

  let pagesFetched = 0;
  const maxPages = options.maxPages;

  while (queue.length > 0 && pagesFetched < maxPages) {
    const remaining = maxPages - pagesFetched;
    const batch = queue.splice(0, Math.min(MAX_CONCURRENCY, remaining, queue.length));
    const batchResults = await mapPool(batch, MAX_CONCURRENCY, async (href) => {
      try {
        const page = await fetchPage(href, fetchOpts, crawlPolicy);
        return { href, page, error: undefined as string | undefined };
      } catch (error) {
        const message = error instanceof Error ? error.message : "fetch failed";
        return {
          href,
          page: emptyFetchOutcome(href, message),
          error: message,
        };
      }
    });

    for (const { href, page, error: batchError } of batchResults) {
      if (pagesFetched >= maxPages) break;
      pagesFetched += 1;
      if (batchError) {
        crawlErrors.push(`${href}: ${batchError}`);
        continue;
      }
      if (page.error) crawlErrors.push(`${href}: ${page.error}`);

      let parsed: ReturnType<typeof parseHtmlDocument> | undefined;
      if (isHtmlContent(page.contentType) && page.body) {
        parsed = parseHtmlDocument(page.body, new URL(page.finalUrl));
        for (const link of parsed.links) {
          try {
            const linkUrl = new URL(link);
            if (!isSameOrigin(linkUrl, origin)) continue;
            const norm = normalizeUrlForCrawl(linkUrl);
            if (!queued.has(norm) && discovered.size + queue.length < maxPages * 2) {
              recordDiscoveredUrl(discovered, linkUrl, "same-origin-link");
              queued.add(norm);
              queue.push(norm);
            }
          } catch {
            continue;
          }
        }
      }

      fetchedPages.push({
        url: page.finalUrl,
        status: page.status,
        contentType: page.contentType,
        body: page.body,
        headers: page.headers,
        parsed,
      });
    }
  }

  const markdownAlternateUrls = new Set<string>();
  if (parsedSeed) {
    for (const u of parsedSeed.markdownAlternates) markdownAlternateUrls.add(u);
  }
  for (const p of fetchedPages) {
    if (p.parsed) {
      for (const u of p.parsed.markdownAlternates) markdownAlternateUrls.add(u);
    }
  }
  for (const u of llmsParsed.urls) {
    if (u.toLowerCase().endsWith(".md")) markdownAlternateUrls.add(u);
  }

  let markdownVerified = 0;
  const markdownSamplePaths: string[] = [];
  const markdownToSample = [...markdownAlternateUrls].slice(0, MAX_MARKDOWN_SAMPLES);
  for (const mdUrl of markdownToSample) {
    const mdFetch = await safeFetchOptional(
      mdUrl,
      `markdown ${mdUrl}`,
      fetchOpts,
      crawlPolicy,
      crawlErrors,
    );
    const path = pathnameFromUrl(new URL(mdUrl));
    if (
      mdFetch.status >= 200 &&
      mdFetch.status < 300 &&
      !mdFetch.tooLarge &&
      mdFetch.body.trim().length > 0 &&
      (isTextMarkdown(mdFetch.contentType, path) || mdFetch.body.trim().startsWith("#"))
    ) {
      markdownVerified += 1;
      markdownSamplePaths.push(path);
    }
  }

  const mcpEvidence: string[] = [];
  let mcpAdvertised = llmsParsed.mcpReferenced;
  if (llmsParsed.urls.some((u) => isMcpUrl(u))) {
    mcpAdvertised = true;
    mcpEvidence.push("llms.txt references /mcp");
  }
  for (const p of fetchedPages) {
    if (p.parsed?.links.some((l) => isMcpUrl(l))) {
      mcpAdvertised = true;
      mcpEvidence.push("same-origin link references MCP");
      break;
    }
  }

  const agentEvidence = parsedSeed ? detectAgentPageLinks(parsedSeed, finalUrl) : [];

  const frameworkHints = detectFrameworkHints(
    parsedSeed ?? { links: [], markdownAlternates: [], hreflang: [] },
    seedFetch.headers,
    seedHtml,
  );

  const locales = new Set<string>();
  if (parsedSeed?.htmlLang) locales.add(parsedSeed.htmlLang);
  for (const h of parsedSeed?.hreflang ?? []) locales.add(h);

  const routes = buildRouteEntries(discovered, origin);
  const candidateRouteCount = routes.filter((r) => r.engawaCandidate).length;

  const canonicalPresent = Boolean(parsedSeed?.canonicalUrl);
  const llmsTxtFull =
    llmsFetch.status >= 200 && llmsFetch.status < 300 && llmsFetch.body.trim().length > 0;
  const markdownScoreFull = markdownVerified > 0;
  const structuredRouteDiscovery = candidateRouteCount > 3 && !sitemapDiscovered;

  const routeDiscoveryEvidence = sitemapDiscovered
    ? ["sitemap.xml or robots.txt sitemap"]
    : structuredRouteDiscovery
      ? [`${candidateRouteCount} same-origin public routes discovered`]
      : [];

  const score = computeScore({
    siteReachable,
    canonicalPresent,
    sitemapOrStructuredDiscovery: sitemapDiscovered || structuredRouteDiscovery,
    llmsTxtFull,
    markdownFull: markdownScoreFull,
    mcpAdvertised,
    agentOnboardingFound: agentEvidence.length > 0,
    evidence: {
      siteReachable: siteReachable ? [`HTTP ${seedFetch.status}`] : [`HTTP ${seedFetch.status}`],
      canonical: canonicalPresent ? ["canonical link"] : [],
      sitemap: routeDiscoveryEvidence,
      llmsTxt: llmsTxtFull ? ["/llms.txt OK"] : [],
      markdown: markdownScoreFull ? [`${markdownVerified} markdown resource(s) verified`] : [],
      mcp: mcpAdvertised ? mcpEvidence : [],
      agentOnboarding: agentEvidence.length > 0 ? agentEvidence : [],
    },
  });

  const report: InspectReport = {
    schemaVersion: SCHEMA_VERSION,
    target: {
      inputUrl: options.inputUrl,
      finalUrl: finalUrl.href,
      origin: origin.origin,
    },
    crawl: {
      maxPages: options.maxPages,
      pagesFetched,
      pagesDiscovered: discovered.size,
      timeoutMs: options.timeoutMs,
      maxBodyBytes: MAX_BODY_BYTES,
      redirectLimit: MAX_REDIRECTS,
      sameOriginOnly: true,
      allowLocal: options.allowLocal,
      errors: crawlErrors,
    },
    site: {
      title: parsedSeed?.title,
      htmlLang: parsedSeed?.htmlLang,
      canonicalUrl: parsedSeed?.canonicalUrl,
      metaDescription: parsedSeed?.metaDescription,
      generator: parsedSeed?.generator,
    },
    frameworkHints,
    locales: [...locales].sort(),
    agentSurfaces: {
      llmsTxt: {
        exists: llmsFetch.status >= 200 && llmsFetch.status < 300,
        status: llmsFetch.status,
        contentType: llmsFetch.contentType,
        urls: llmsParsed.urls,
        mcpReferenced: llmsParsed.mcpReferenced,
        markdownReferenced: llmsParsed.markdownReferenced,
      },
      markdown: {
        alternatesFound: markdownAlternateUrls.size,
        resourcesVerified: markdownVerified,
        samplePaths: markdownSamplePaths,
      },
      mcp: {
        advertised: mcpAdvertised,
        protocolVerified: false,
        evidence: mcpEvidence,
      },
      agentOnboarding: {
        status: agentEvidence.length > 0 ? "FOUND" : "NOT_FOUND",
        evidence: agentEvidence,
      },
    },
    routes,
    score,
    securityAssessment: "NOT_PERFORMED",
    recommendation: buildRecommendation(score, finalUrl.href),
  };

  inspectReportSchema.parse(report);
  return report;
}

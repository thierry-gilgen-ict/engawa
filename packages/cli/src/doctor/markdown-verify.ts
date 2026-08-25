import { fetchPage } from "../inspect/fetch.js";
import type { FetchTargetPolicy } from "../inspect/url.js";
import {
  MAX_BODY_BYTES,
  MAX_MARKDOWN_SAMPLES,
  USER_AGENT,
  type CheckStatus,
  type MarkdownSampleResult,
} from "./types.js";
import {
  contentTypeIsHtml,
  contentTypeIsMarkdown,
  sha256Hex,
  stableSortStrings,
} from "./helpers.js";

export interface MarkdownVerifyResult {
  status: CheckStatus;
  discoveredCount: number;
  sampledCount: number;
  samples: MarkdownSampleResult[];
  bodiesForInternalUse: string[];
  failures: string[];
}

export async function verifyMarkdown(options: {
  origin: string;
  candidateUrls: string[];
  timeoutMs: number;
  policy: FetchTargetPolicy;
}): Promise<MarkdownVerifyResult> {
  const failures: string[] = [];
  const sameOrigin = options.candidateUrls.filter((u) => {
    try {
      return new URL(u).origin === options.origin;
    } catch {
      return false;
    }
  });
  const discovered = stableSortStrings([...new Set(sameOrigin)]);
  const samplesToFetch = discovered.slice(0, MAX_MARKDOWN_SAMPLES);
  const samples: MarkdownSampleResult[] = [];
  const bodies: string[] = [];

  if (discovered.length === 0) {
    failures.push("no same-origin Markdown URLs discovered");
    return {
      status: "FAIL",
      discoveredCount: 0,
      sampledCount: 0,
      samples: [],
      bodiesForInternalUse: [],
      failures,
    };
  }

  for (const url of samplesToFetch) {
    const outcome = await fetchPage(
      url,
      { timeoutMs: options.timeoutMs, maxBodyBytes: MAX_BODY_BYTES, userAgent: USER_AGENT },
      options.policy,
    );
    const byteLength = Buffer.byteLength(outcome.body, "utf8");
    if (outcome.status !== 200) {
      samples.push({
        url,
        status: outcome.status,
        contentType: outcome.contentType,
        byteLength,
        result: "FAIL",
        reason: "non-200",
      });
      failures.push(`Markdown sample failed: ${url}`);
      continue;
    }
    if (contentTypeIsHtml(outcome.contentType)) {
      samples.push({
        url,
        status: outcome.status,
        contentType: outcome.contentType,
        byteLength,
        result: "FAIL",
        reason: "html-masquerade",
      });
      failures.push(`Markdown sample returned HTML: ${url}`);
      continue;
    }
    if (!outcome.body.trim()) {
      samples.push({
        url,
        status: outcome.status,
        contentType: outcome.contentType,
        byteLength,
        result: "FAIL",
        reason: "empty-body",
      });
      failures.push(`Markdown sample empty: ${url}`);
      continue;
    }
    if (!contentTypeIsMarkdown(outcome.contentType) && outcome.contentType) {
      // Prefer text/markdown; text/plain still acceptable for .md agent surfaces
      if (!/text\/plain/i.test(outcome.contentType)) {
        samples.push({
          url,
          status: outcome.status,
          contentType: outcome.contentType,
          byteLength,
          contentSha256: sha256Hex(outcome.body),
          result: "FAIL",
          reason: "unexpected-content-type",
        });
        failures.push(`Markdown unexpected content type: ${url}`);
        continue;
      }
    }

    bodies.push(outcome.body);
    samples.push({
      url,
      status: outcome.status,
      contentType: outcome.contentType,
      byteLength,
      contentSha256: sha256Hex(outcome.body),
      result: "PASS",
    });
  }

  const allPass = samples.length > 0 && samples.every((s) => s.result === "PASS");
  return {
    status: allPass ? "PASS" : "FAIL",
    discoveredCount: discovered.length,
    sampledCount: samples.length,
    samples,
    bodiesForInternalUse: bodies,
    failures,
  };
}

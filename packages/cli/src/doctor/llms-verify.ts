import { fetchPage } from "../inspect/fetch.js";
import { parseLlmsTxt } from "../inspect/llms.js";
import { isMcpUrl } from "../inspect/mcp.js";
import type { FetchTargetPolicy } from "../inspect/url.js";
import { MAX_BODY_BYTES, USER_AGENT, type CheckStatus, type DoctorProfile } from "./types.js";
import {
  contentTypeIsTextLike,
  evidenceText,
  expectedCanonicalRoot,
  llmsContainsCanonicalSiteRoot,
} from "./helpers.js";

export interface LlmsVerifyResult {
  status: CheckStatus;
  httpStatus?: number;
  contentType?: string;
  byteLength?: number;
  canonicalSiteReference: CheckStatus;
  mcpAdvertisement: CheckStatus;
  markdownAdvertisement: CheckStatus;
  urls: string[];
  mcpReferenced: boolean;
  markdownReferenced: boolean;
  bodyForInternalUse: string;
  failures: string[];
}

export async function verifyLlmsTxt(options: {
  origin: string;
  canonicalUrl?: string;
  finalUrl: string;
  profile: DoctorProfile;
  timeoutMs: number;
  policy: FetchTargetPolicy;
  markdownDiscoveredElsewhere?: boolean;
}): Promise<LlmsVerifyResult> {
  const failures: string[] = [];
  const llmsUrl = new URL("/llms.txt", options.origin).href;
  const outcome = await fetchPage(
    llmsUrl,
    { timeoutMs: options.timeoutMs, maxBodyBytes: MAX_BODY_BYTES, userAgent: USER_AGENT },
    options.policy,
  );

  if (outcome.status !== 200 || outcome.tooLarge || outcome.error) {
    failures.push(`llms.txt verification failed (status=${outcome.status})`);
    return {
      status: "FAIL",
      httpStatus: outcome.status,
      contentType: outcome.contentType,
      byteLength: Buffer.byteLength(outcome.body, "utf8"),
      canonicalSiteReference: "FAIL",
      mcpAdvertisement: options.profile === "discovery" ? "NOT_REQUIRED" : "FAIL",
      markdownAdvertisement: "FAIL",
      urls: [],
      mcpReferenced: false,
      markdownReferenced: false,
      bodyForInternalUse: "",
      failures,
    };
  }

  if (!contentTypeIsTextLike(outcome.contentType)) {
    failures.push(`llms.txt unexpected content type: ${evidenceText(outcome.contentType)}`);
  }

  const parsed = parseLlmsTxt(outcome.body, new URL(options.origin));
  const expectedRoot = expectedCanonicalRoot({
    canonicalUrl: options.canonicalUrl,
    finalUrl: options.finalUrl,
    origin: options.origin,
  });
  const canonicalOk = llmsContainsCanonicalSiteRoot(outcome.body, expectedRoot);

  const canonicalSiteReference: CheckStatus = canonicalOk ? "PASS" : "FAIL";
  if (!canonicalOk) {
    failures.push("llms.txt missing exact canonical site URL reference");
  }

  let mcpAdvertisement: CheckStatus;
  if (parsed.mcpReferenced || parsed.urls.some((u) => isMcpUrl(u))) {
    mcpAdvertisement = "PASS";
  } else if (options.profile === "discovery") {
    mcpAdvertisement = "NOT_REQUIRED";
  } else {
    mcpAdvertisement = "FAIL";
    failures.push("llms.txt missing MCP advertisement (full profile)");
  }

  const markdownAdvertisement: CheckStatus =
    parsed.markdownReferenced || parsed.urls.some((u) => u.toLowerCase().endsWith(".md"))
      ? "PASS"
      : options.markdownDiscoveredElsewhere
        ? "PASS"
        : "FAIL";
  if (markdownAdvertisement === "FAIL" && !options.markdownDiscoveredElsewhere) {
    failures.push("llms.txt missing Markdown advertisement");
  }

  const status: CheckStatus =
    failures.length === 0 && canonicalSiteReference === "PASS" ? "PASS" : "FAIL";

  return {
    status,
    httpStatus: outcome.status,
    contentType: outcome.contentType,
    byteLength: Buffer.byteLength(outcome.body, "utf8"),
    canonicalSiteReference,
    mcpAdvertisement,
    markdownAdvertisement,
    urls: parsed.urls,
    mcpReferenced: parsed.mcpReferenced || parsed.urls.some((u) => isMcpUrl(u)),
    markdownReferenced: parsed.markdownReferenced,
    bodyForInternalUse: outcome.body,
    failures,
  };
}

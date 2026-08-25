import { InspectError } from "../errors.js";
import { MAX_REDIRECTS, USER_AGENT } from "./types.js";
import { assertFetchTargetAllowed, type FetchTargetPolicy } from "./url.js";

export interface FetchPageOptions {
  timeoutMs: number;
  maxBodyBytes: number;
  userAgent?: string;
}

export interface FetchPageOutcome {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  body: string;
  headers: Record<string, string>;
  tooLarge: boolean;
  error?: string;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<{ body: string; tooLarge: boolean }> {
  if (!response.body) {
    return { body: "", tooLarge: false };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      return { body: "", tooLarge: true };
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return { body: new TextDecoder("utf-8", { fatal: false }).decode(merged), tooLarge: false };
}

export async function fetchPage(
  url: string,
  options: FetchPageOptions,
  policy: FetchTargetPolicy,
): Promise<FetchPageOutcome> {
  let current = url;
  let redirectCount = 0;

  while (true) {
    const targetUrl = new URL(current);
    await assertFetchTargetAllowed(targetUrl, policy);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": options.userAgent ?? USER_AGENT,
          Accept: "text/html,text/plain,application/xml,text/xml,*/*;q=0.8",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return {
            url: current,
            finalUrl: current,
            status: response.status,
            contentType: response.headers.get("content-type") ?? "",
            body: "",
            headers: headersToRecord(response.headers),
            tooLarge: false,
            error: "redirect without Location header",
          };
        }
        redirectCount += 1;
        if (redirectCount > MAX_REDIRECTS) {
          throw new InspectError("Redirect limit exceeded");
        }
        const nextUrl = new URL(location, current);
        await assertFetchTargetAllowed(nextUrl, policy);
        current = nextUrl.href;
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      const { body, tooLarge } = await readBodyWithLimit(response, options.maxBodyBytes);
      return {
        url: current,
        finalUrl: current,
        status: response.status,
        contentType,
        body: tooLarge ? "" : body,
        headers: headersToRecord(response.headers),
        tooLarge,
        error: tooLarge ? "BODY_TOO_LARGE" : undefined,
      };
    } catch (error) {
      if (error instanceof InspectError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new InspectError(`Request timed out after ${options.timeoutMs}ms`);
        }
        throw new InspectError(error.message);
      }
      throw new InspectError("Request failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function emptyFetchOutcome(url: string, error?: string): FetchPageOutcome {
  return {
    url,
    finalUrl: url,
    status: 0,
    contentType: "",
    body: "",
    headers: {},
    tooLarge: false,
    error,
  };
}

export async function safeFetchOptional(
  url: string,
  label: string,
  options: FetchPageOptions,
  policy: FetchTargetPolicy,
  crawlErrors: string[],
): Promise<FetchPageOutcome> {
  try {
    return await fetchPage(url, options, policy);
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    crawlErrors.push(`${label}: ${message}`);
    return emptyFetchOutcome(url, message);
  }
}

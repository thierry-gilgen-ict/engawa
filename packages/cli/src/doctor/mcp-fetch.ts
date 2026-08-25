import { assertFetchTargetAllowed } from "../inspect/url.js";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

export class McpFetchPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpFetchPolicyError";
  }
}

export interface GuardedMcpFetchOptions {
  lockOrigin: string;
  allowLocal: boolean;
  onRequest?: (url: string) => void;
  underlyingFetch?: typeof fetch;
}

/**
 * Custom fetch for StreamableHTTPClientTransport.
 * Enforces same-origin lock + SSRF policy. v0.1 rejects all redirects (does not follow).
 */
export function createGuardedMcpFetch(options: GuardedMcpFetchOptions): typeof fetch {
  const underlying = options.underlyingFetch ?? globalThis.fetch.bind(globalThis);

  return async (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string"
        ? new URL(input)
        : input instanceof URL
          ? input
          : new URL(input.url);

    if (!ALLOWED_SCHEMES.has(url.protocol)) {
      throw new McpFetchPolicyError(`Unsupported MCP URL scheme: ${url.protocol}`);
    }
    if (url.origin !== options.lockOrigin) {
      throw new McpFetchPolicyError(
        `Cross-origin MCP request blocked: ${url.origin} (locked ${options.lockOrigin})`,
      );
    }

    await assertFetchTargetAllowed(url, {
      allowLocal: options.allowLocal,
      lockOrigin: options.lockOrigin,
    });

    options.onRequest?.(url.href);

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    headers.delete("cookie");
    headers.delete("authorization");

    const response = await underlying(input, {
      ...init,
      headers,
      redirect: "manual",
      credentials: "omit",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location") ?? "";
      throw new McpFetchPolicyError(
        `MCP redirect not followed (status ${response.status}${location ? `: ${location}` : ""})`,
      );
    }

    return response;
  };
}

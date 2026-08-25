import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/client";
import {
  INVALID_HOST_HEADER,
  INVALID_ORIGIN,
  type HostValidation,
  type OriginValidation,
  type RateLimitObservation,
} from "./types.js";

export const MAX_SECURITY_PROBE_BODY_BYTES = 256 * 1024;

function buildMcpInitializeBody(): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "engawa-doctor", version: "0.1.0" },
    },
    id: 1,
  });
}

interface RawProbeResult {
  status: number;
  headers: Record<string, string>;
  body: string;
  error?: string;
}

async function rawRequest(
  targetUrl: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    timeoutMs: number;
    overrideHost?: string;
    maxBodyBytes?: number;
  },
): Promise<RawProbeResult> {
  const parsed = new URL(targetUrl);
  const isHttps = parsed.protocol === "https:";
  const requestFn = isHttps ? httpsRequest : httpRequest;
  const body = options.body ?? "";
  const maxBodyBytes = options.maxBodyBytes ?? MAX_SECURITY_PROBE_BODY_BYTES;

  return new Promise((resolve) => {
    const state: {
      settled: boolean;
      res?: IncomingMessage;
      req?: ReturnType<typeof httpRequest>;
      absoluteTimer?: ReturnType<typeof setTimeout>;
    } = { settled: false };

    const settle = (result: RawProbeResult) => {
      if (state.settled) return;
      state.settled = true;
      if (state.absoluteTimer) clearTimeout(state.absoluteTimer);
      try {
        state.res?.destroy();
      } catch {
        // ignore
      }
      try {
        state.req?.destroy();
      } catch {
        // ignore
      }
      resolve({
        ...result,
        body: result.body.slice(0, 4096),
        error: result.error ? result.error.slice(0, 200) : undefined,
      });
    };

    state.absoluteTimer = setTimeout(() => {
      settle({ status: 0, headers: {}, body: "", error: "timeout" });
    }, options.timeoutMs);

    const headers: Record<string, string> = {
      ...options.headers,
    };
    if (options.overrideHost) {
      headers.Host = options.overrideHost;
    }
    if (body) {
      headers["Content-Length"] = String(Buffer.byteLength(body));
    }

    state.req = requestFn(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: options.method,
        headers,
        timeout: options.timeoutMs,
        servername: isHttps ? parsed.hostname : undefined,
      },
      (incoming) => {
        state.res = incoming;
        const chunks: Buffer[] = [];
        let total = 0;
        incoming.on("data", (c: Buffer) => {
          if (state.settled) return;
          total += c.length;
          if (total > maxBodyBytes) {
            settle({
              status: incoming.statusCode ?? 0,
              headers: {},
              body: "",
              error: "BODY_TOO_LARGE",
            });
            return;
          }
          chunks.push(c);
        });
        incoming.on("end", () => {
          if (state.settled) return;
          const headerRecord: Record<string, string> = {};
          for (const [k, v] of Object.entries(incoming.headers)) {
            if (typeof v === "string") headerRecord[k.toLowerCase()] = v;
            else if (Array.isArray(v)) headerRecord[k.toLowerCase()] = v.join(", ");
          }
          settle({
            status: incoming.statusCode ?? 0,
            headers: headerRecord,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        incoming.on("error", (err) => {
          settle({ status: 0, headers: {}, body: "", error: err.message });
        });
      },
    );
    state.req.on("timeout", () => {
      settle({ status: 0, headers: {}, body: "", error: "timeout" });
    });
    state.req.on("error", (err) => {
      settle({ status: 0, headers: {}, body: "", error: err.message });
    });
    if (body) state.req.write(body);
    state.req.end();
  });
}

function looksLikeSuccessfulMcpOrContent(status: number, body: string): boolean {
  if (status !== 200 && status !== 202) return false;
  if (!body) return true;
  try {
    const parsed = JSON.parse(body) as { result?: unknown; jsonrpc?: string };
    if (parsed.jsonrpc === "2.0" && parsed.result !== undefined) return true;
  } catch {
    // not JSON
  }
  return body.length > 0 && status === 200;
}

export async function probeHostValidation(options: {
  targetUrl: string;
  timeoutMs: number;
}): Promise<HostValidation> {
  const result = await rawRequest(options.targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: buildMcpInitializeBody(),
    timeoutMs: options.timeoutMs,
    overrideHost: INVALID_HOST_HEADER,
  });

  if (result.error) return "UNKNOWN";
  if ([400, 403, 421].includes(result.status)) return "REJECTED_INVALID_HOST";
  if (looksLikeSuccessfulMcpOrContent(result.status, result.body)) {
    return "ACCEPTED_INVALID_HOST";
  }
  return "UNKNOWN";
}

export async function probeOriginValidation(options: {
  mcpUrl: string;
  timeoutMs: number;
}): Promise<OriginValidation> {
  const result = await rawRequest(options.mcpUrl, {
    method: "OPTIONS",
    headers: {
      Origin: INVALID_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
    timeoutMs: options.timeoutMs,
  });

  if (result.error) return "UNKNOWN";

  const allowOrigin = result.headers["access-control-allow-origin"];
  if (allowOrigin === "*" || allowOrigin === INVALID_ORIGIN) {
    return "ACCEPTED_UNTRUSTED_ORIGIN";
  }
  if (!allowOrigin) {
    return "BROWSER_ORIGIN_NOT_EXPOSED";
  }
  if ([400, 403].includes(result.status)) {
    return "REJECTED_UNTRUSTED_ORIGIN";
  }
  return "UNKNOWN";
}

export async function probeRateLimit(options: {
  targetUrl: string;
  count: number;
  timeoutMs: number;
}): Promise<RateLimitObservation> {
  if (options.count <= 0) return "NOT_PROBED";

  const body = buildMcpInitializeBody();
  for (let i = 0; i < options.count; i++) {
    const result = await rawRequest(options.targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body,
      timeoutMs: options.timeoutMs,
    });
    if (result.status === 429) return "OBSERVED";
    if (result.error) return "UNKNOWN";
    await new Promise((r) => setTimeout(r, 25));
  }
  return "NOT_OBSERVED_WITHIN_SAFE_BUDGET";
}

/** Exported for hermetic oversized/timeout tests. */
export const __testRawRequest = rawRequest;

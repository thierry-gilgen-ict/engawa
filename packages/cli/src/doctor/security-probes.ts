import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/client";
import {
  INVALID_HOST_HEADER,
  INVALID_ORIGIN,
  type HostValidation,
  type OriginValidation,
  type RateLimitObservation,
} from "./types.js";

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
  },
): Promise<RawProbeResult> {
  const parsed = new URL(targetUrl);
  const isHttps = parsed.protocol === "https:";
  const requestFn = isHttps ? httpsRequest : httpRequest;
  const body = options.body ?? "";

  return new Promise((resolve) => {
    const headers: Record<string, string> = {
      ...options.headers,
    };
    if (options.overrideHost) {
      headers.Host = options.overrideHost;
    }
    if (body) {
      headers["Content-Length"] = String(Buffer.byteLength(body));
    }

    const req = requestFn(
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
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const headerRecord: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === "string") headerRecord[k.toLowerCase()] = v;
            else if (Array.isArray(v)) headerRecord[k.toLowerCase()] = v.join(", ");
          }
          resolve({
            status: res.statusCode ?? 0,
            headers: headerRecord,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, headers: {}, body: "", error: "timeout" });
    });
    req.on("error", (err) => {
      resolve({ status: 0, headers: {}, body: "", error: err.message });
    });
    if (body) req.write(body);
    req.end();
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

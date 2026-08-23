import {
  API_PATH_PREFIX,
  ENGAWA_MAP_VERSION,
  MAX_REQUEST_BODY_BYTES,
  MAX_RESPONSE_BYTES,
  REQUEST_TIMEOUT_MS,
} from "./constants.js";
import { resolveRegistryEndpoint } from "./endpoint.js";
import { sanitizeTerminalText } from "./sanitize.js";
import {
  errorResponseSchema,
  registerResponseSchema,
  registrationPayloadSchema,
  statusResponseSchema,
  type RegisterResponse,
  type RegistrationPayload,
  type StatusResponse,
} from "./schemas.js";

export type FetchFn = typeof fetch;

export class RegistryClientError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(message: string, code = "REGISTRY_ERROR", status?: number) {
    super(message);
    this.name = "RegistryClientError";
    this.code = code;
    this.status = status;
  }
}

export interface RegistryClientOptions {
  endpoint?: string;
  fetchImpl?: FetchFn;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new RegistryClientError("Response body too large", "RESPONSE_TOO_LARGE", response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      throw new RegistryClientError(
        "Response body too large",
        "RESPONSE_TOO_LARGE",
        response.status,
      );
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

function parseErrorBody(raw: string, status: number): RegistryClientError {
  try {
    const parsed = errorResponseSchema.parse(JSON.parse(raw));
    const message = sanitizeTerminalText(parsed.error.message);
    return new RegistryClientError(message, parsed.error.code, status);
  } catch {
    return new RegistryClientError("Registry request failed", "REGISTRY_ERROR", status);
  }
}

export class RegistryClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchFn;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;

  constructor(options: RegistryClientOptions = {}) {
    this.baseUrl = resolveRegistryEndpoint(options.endpoint);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
    this.maxResponseBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;
  }

  private async request(
    method: string,
    path: string,
    init: {
      body?: string;
      headers?: Record<string, string>;
      authToken?: string;
    } = {},
  ): Promise<{ status: number; body: string }> {
    const url = `${this.baseUrl}${API_PATH_PREFIX}${path}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...init.headers,
    };

    if (init.body) {
      headers["Content-Type"] = "application/json";
      if (Buffer.byteLength(init.body, "utf8") > MAX_REQUEST_BODY_BYTES) {
        throw new RegistryClientError("Request body too large", "REQUEST_TOO_LARGE");
      }
    }

    if (init.authToken) {
      headers.Authorization = `Bearer ${init.authToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        method,
        headers,
        body: init.body,
        redirect: "error",
        signal: controller.signal,
      });

      const body = await readBoundedBody(response, this.maxResponseBytes);

      if (!response.ok) {
        throw parseErrorBody(body, response.status);
      }

      return { status: response.status, body };
    } catch (error) {
      if (error instanceof RegistryClientError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new RegistryClientError("Registry request timed out", "REQUEST_TIMEOUT");
      }
      throw new RegistryClientError(
        error instanceof Error ? error.message : "Registry request failed",
        "REGISTRY_ERROR",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async register(input: {
    payload: RegistrationPayload;
    idempotencyKey: string;
    siteTokenHash: string;
  }): Promise<RegisterResponse> {
    const payload = registrationPayloadSchema.parse(input.payload);
    const body = JSON.stringify(payload);
    const { body: responseBody } = await this.request("POST", "/sites", {
      body,
      headers: {
        "Idempotency-Key": input.idempotencyKey,
        "Engawa-Map-Site-Token-Hash": input.siteTokenHash,
        "Engawa-Map-Client-Version": ENGAWA_MAP_VERSION,
      },
    });

    return registerResponseSchema.parse(JSON.parse(responseBody));
  }

  async getStatus(siteId: string, token: string): Promise<StatusResponse> {
    const { body } = await this.request("GET", `/sites/${siteId}/status`, {
      authToken: token,
    });
    return statusResponseSchema.parse(JSON.parse(body));
  }

  async unregister(siteId: string, token: string): Promise<void> {
    const { status } = await this.request("DELETE", `/sites/${siteId}`, {
      authToken: token,
    });
    if (status !== 204) {
      throw new RegistryClientError("Unexpected unregister response", "REGISTRY_ERROR", status);
    }
  }
}

export function serializeRegistrationPayload(payload: RegistrationPayload): string {
  return JSON.stringify(registrationPayloadSchema.parse(payload), null, 2);
}

// @vitest-environment node
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { RegistryClient, RegistryClientError } from "./client.js";
import type { RegistrationPayload } from "./schemas.js";

const payload: RegistrationPayload = {
  displayName: "Test",
  canonicalUrl: "https://example.com",
  packages: {
    "@thierry-gilgen-ict/engawa-core": "0.1.1",
    "@thierry-gilgen-ict/engawa-discovery": "0.1.1",
    "@thierry-gilgen-ict/engawa-mcp": "0.1.1",
    "@thierry-gilgen-ict/engawa-react": "0.1.0",
  },
};

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  }
});

async function startServer(
  handler: (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
  ) => void,
): Promise<string> {
  server = createServer(handler);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe("registry client", () => {
  it("sends registration headers and parses strict responses", async () => {
    const endpoint = await startServer((req, res) => {
      expect(req.method).toBe("POST");
      expect(req.url).toBe("/api/v1/sites");
      expect(req.headers["idempotency-key"]).toBeTruthy();
      expect(req.headers["engawa-map-site-token-hash"]).toBeTruthy();
      expect(req.headers["engawa-map-client-version"]).toBe("0.1.0");
      expect(req.headers.authorization).toBeUndefined();
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          siteId: "550e8400-e29b-41d4-a716-446655440000",
          state: "PENDING",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      );
    });

    const client = new RegistryClient({ endpoint });
    const response = await client.register({
      payload,
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440001",
      siteTokenHash: "abc",
    });
    expect(response.siteId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects redirect responses", async () => {
    const endpoint = await startServer((_req, res) => {
      res.writeHead(302, { Location: "http://127.0.0.1/evil" });
      res.end();
    });

    const client = new RegistryClient({ endpoint });
    await expect(
      client.register({
        payload,
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440001",
        siteTokenHash: "abc",
      }),
    ).rejects.toBeInstanceOf(RegistryClientError);
  });

  it("rejects oversized response bodies", async () => {
    const endpoint = await startServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("x".repeat(70_000));
    });

    const client = new RegistryClient({ endpoint, maxResponseBytes: 1024 });
    await expect(
      client.getStatus("550e8400-e29b-41d4-a716-446655440000", "token"),
    ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
  });

  it("sanitizes server error messages", async () => {
    const endpoint = await startServer((_req, res) => {
      res.writeHead(409, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: {
            code: "CANONICAL_URL_ALREADY_REGISTERED",
            message: "bad\u0007\u001b[31mmessage",
          },
        }),
      );
    });

    const client = new RegistryClient({ endpoint });
    await expect(
      client.register({
        payload,
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440001",
        siteTokenHash: "abc",
      }),
    ).rejects.toMatchObject({
      code: "CANONICAL_URL_ALREADY_REGISTERED",
      message: "bad[31mmessage",
    });
  });

  it("handles unregister 204 responses", async () => {
    const endpoint = await startServer((req, res) => {
      expect(req.method).toBe("DELETE");
      expect(req.headers.authorization).toBe("Bearer site-token");
      res.writeHead(204);
      res.end();
    });

    const client = new RegistryClient({ endpoint });
    await expect(
      client.unregister("550e8400-e29b-41d4-a716-446655440000", "site-token"),
    ).resolves.toBeUndefined();
  });
});

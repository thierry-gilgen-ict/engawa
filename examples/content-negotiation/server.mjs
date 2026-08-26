#!/usr/bin/env node
/**
 * Local experiment server — localhost only.
 * NETWORK_CALLS = NONE (no outbound requests).
 */

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dedicatedMarkdownAbout, negotiateAbout } from "./negotiate.mjs";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 3848;

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
function handle(req, res) {
  const url = new URL(req.url ?? "/", `http://${HOST}`);
  const accept = req.headers.accept;

  if (url.pathname === "/about.md" && (req.method === "GET" || req.method === "HEAD")) {
    const response = dedicatedMarkdownAbout();
    writeResponse(res, req.method, response);
    return;
  }

  if (url.pathname === "/about" && (req.method === "GET" || req.method === "HEAD")) {
    const response = negotiateAbout(accept);
    writeResponse(res, req.method, response);
    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

/**
 * @param {import("node:http").ServerResponse} res
 * @param {string | undefined} method
 * @param {{ status: number; headers: Record<string, string>; body: string }} response
 */
function writeResponse(res, method, response) {
  res.writeHead(response.status, response.headers);
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(response.body);
}

/** @param {number} [port] */
export function startServer(port = DEFAULT_PORT) {
  const server = createServer(handle);
  server.listen(port, HOST);
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
  startServer(port);
  console.log(`EXPERIMENT_SERVER = http://${HOST}:${port}`);
}

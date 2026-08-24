# Next.js App Router — complete public MCP route

This is the **canonical copy-paste example** for wiring `@thierry-gilgen-ict/engawa-mcp@0.1.1` to a Next.js App Router site. Both [production reference integrations](../production-references.md) use this pattern.

**Requirements:** Node.js 24+, Next.js App Router.

## Install (prerequisites)

Engawa packages plus an **explicit** MCP SDK dependency for host/origin guard helpers. `engawa-mcp` depends on `@modelcontextprotocol/server` transitively, but `mcpGuards.ts` imports it directly — strict package managers (npm, pnpm) require declaring it in your app:

```bash
npm install \
  @thierry-gilgen-ict/engawa-core@0.1.1 \
  @thierry-gilgen-ict/engawa-discovery@0.1.1 \
  @thierry-gilgen-ict/engawa-mcp@0.1.1 \
  @modelcontextprotocol/server@2.0.0
```

Use `@modelcontextprotocol/server@2.0.0` — the version pinned by `engawa-mcp@0.1.1`. Do not add this SDK to generic Engawa installs unless your host route copies the guard code below.

## What you are wiring

| Piece                             | Package            | Role                        |
| --------------------------------- | ------------------ | --------------------------- |
| Config + adapter + `createEngawa` | `engawa-core`      | Public corpus               |
| `generateLlmsTxt`                 | `engawa-discovery` | Discovery index             |
| `createEngawaPublicMcpHandler`    | `engawa-mcp`       | Streamable HTTP MCP handler |

`createEngawaPublicMcpHandler` returns a handler from `@modelcontextprotocol/server` with a **`.fetch(request)`** method. Your route must call `.fetch`, not invoke the handler as a bare function.

Streamable HTTP may use **GET, POST, DELETE, and OPTIONS** on the same path. Export all four through one guarded handler (matches production references).

**Host and origin validation** belong in your application route layer — Engawa does not enforce them for you.

## File layout

```text
lib/engawa/
  config.ts          # validateEngawaConfig (site-specific)
  contentAdapter.ts  # ContentAdapter (see custom adapter example)
  instance.ts        # getEngawa() singleton
  mcpGuards.ts       # Host + Origin checks
  mcpRateLimit.ts    # Rate limit integration point
app/
  llms.txt/route.ts
  mcp/route.ts
  about.md/route.ts  # optional markdown alternate
```

For a complete custom adapter, see [custom ContentAdapter example](custom-content-adapter.md).

---

## `lib/engawa/mcpGuards.ts`

Uses helpers from `@modelcontextprotocol/server` (same dependency as `engawa-mcp`).

```typescript
import {
  hostHeaderValidationResponse,
  localhostAllowedHostnames,
  localhostAllowedOrigins,
  originValidationResponse,
} from "@modelcontextprotocol/server";

function isDevOrTest(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function getMcpAllowedHostnames(canonicalHost: string): string[] {
  const hostnames = [canonicalHost];
  if (isDevOrTest()) {
    hostnames.push(...localhostAllowedHostnames());
  }
  return hostnames;
}

export function getMcpAllowedOriginHostnames(canonicalHost: string): string[] {
  const hostnames = [canonicalHost];
  if (isDevOrTest()) {
    hostnames.push(...localhostAllowedOrigins());
  }
  return hostnames;
}

/** Returns a 403 JSON-RPC response when host or origin checks fail; undefined when allowed. */
export function mcpSecurityRejectedResponse(
  request: Request,
  canonicalHost: string,
): Response | undefined {
  const hostRejected = hostHeaderValidationResponse(request, getMcpAllowedHostnames(canonicalHost));
  if (hostRejected) return hostRejected;

  return originValidationResponse(request, getMcpAllowedOriginHostnames(canonicalHost));
}
```

**Production:** only the canonical host (from `site.canonicalUrl`) is allowed.

**Development / test:** localhost hostnames and origins are also allowed when `NODE_ENV !== "production"`.

---

## `lib/engawa/mcpRateLimit.ts`

Engawa packages do not include rate limiting. This minimal in-memory stub documents the integration point. Replace with your application's rate limiter (Redis, edge middleware, etc.) in production.

```typescript
const buckets = new Map<string, { count: number; resetAt: number }>();

const MCP_RATE = { limit: 120, windowMs: 10 * 60 * 1000 };

export function mcpRateLimitConsume(request: Request): boolean {
  const key = request.headers.get("x-forwarded-for") ?? "local";
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + MCP_RATE.windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= MCP_RATE.limit;
}

export function mcpRateLimitRejectedResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Rate limit exceeded." },
      id: null,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
```

---

## `lib/engawa/instance.ts`

```typescript
import { createEngawa, type Engawa, validateEngawaConfig } from "@thierry-gilgen-ict/engawa-core";
import { siteContentAdapter } from "./contentAdapter";

let engawaInstance: Engawa | null = null;

const siteConfig = validateEngawaConfig({
  site: {
    name: "My Site",
    canonicalUrl: "https://www.example.com",
    description: "Short public description for agents and llms.txt.",
    language: "en",
  },
  agentInterface: { enabled: true, public: true },
  security: { publicDefault: "read-only" },
  metadata: { version: "0.1.1" },
});

export function getEngawa(): Engawa {
  if (!engawaInstance) {
    engawaInstance = createEngawa(siteConfig, siteContentAdapter);
  }
  return engawaInstance;
}
```

Implement `siteContentAdapter` in `contentAdapter.ts` — use [StaticContentAdapter](https://github.com/thierry-gilgen-ict/engawa/blob/main/packages/core/README.md) for demos or the [custom adapter example](custom-content-adapter.md) for production-shaped wiring.

---

## `app/mcp/route.ts`

Complete route handler — no placeholders.

```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { createEngawaPublicMcpHandler } from "@thierry-gilgen-ict/engawa-mcp";
import { getEngawa } from "@/lib/engawa/instance";
import { mcpSecurityRejectedResponse } from "@/lib/engawa/mcpGuards";
import { mcpRateLimitConsume, mcpRateLimitRejectedResponse } from "@/lib/engawa/mcpRateLimit";

const mcpHandler = createEngawaPublicMcpHandler(getEngawa());

async function handle(request: NextRequest): Promise<Response> {
  const engawa = getEngawa();
  const canonicalHost = new URL(engawa.config.site.canonicalUrl).host;

  const securityRejected = mcpSecurityRejectedResponse(request, canonicalHost);
  if (securityRejected) {
    return securityRejected;
  }

  if (!mcpRateLimitConsume(request)) {
    return mcpRateLimitRejectedResponse();
  }

  try {
    return await mcpHandler.fetch(request);
  } catch (error) {
    console.error("[mcp-public] request failed:", error);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "MCP request failed." },
        id: null,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function DELETE(request: NextRequest) {
  return handle(request);
}

export async function OPTIONS(request: NextRequest) {
  return handle(request);
}
```

### Why GET (and DELETE / OPTIONS)?

`@modelcontextprotocol/server` Streamable HTTP transport uses multiple HTTP methods on the same MCP path. Production reference sites export **GET, POST, DELETE, and OPTIONS** through the same guarded handler. Do not expose POST-only unless you have verified your MCP client stack works without the other methods.

---

## `app/llms.txt/route.ts`

```typescript
import { generateLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";
import { getEngawa } from "@/lib/engawa/instance";

export async function GET() {
  const engawa = getEngawa();
  const resources = await engawa.listResources();
  const body = generateLlmsTxt(engawa.config, resources);
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
```

---

## `app/about.md/route.ts` (optional markdown alternate)

```typescript
import { getEngawa } from "@/lib/engawa/instance";

export async function GET() {
  const engawa = getEngawa();
  const resource = await engawa.getResource("about");
  if (!resource) {
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  }
  return new Response(resource.content, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-robots-tag": "noindex",
    },
  });
}
```

---

## Locale middleware

Exclude machine routes (`/llms.txt`, `/mcp`, paths ending in `.md`) from locale redirect middleware so agents get deterministic resources. See [Next.js integration](../integrations/nextjs.md).

---

## Local verification

After `next dev`:

```bash
curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000/llms.txt
curl -sS http://localhost:3000/about.md | head
```

MCP protocol smoke (from Engawa monorepo or your site):

```bash
node path/to/smoke-mcp.mjs http://localhost:3000
```

Run the full [integration acceptance contract](../integration-acceptance.md) before production.

---

## Related

- [Getting started](../getting-started.md)
- [Next.js integration](../integrations/nextjs.md)
- [Custom ContentAdapter example](custom-content-adapter.md)
- [Security model](../security-model.md)
- [@thierry-gilgen-ict/engawa-mcp README](../../packages/mcp/README.md)

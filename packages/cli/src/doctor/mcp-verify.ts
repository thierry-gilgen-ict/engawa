import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { evidenceText, sha256Hex, stableSortStrings } from "./helpers.js";
import {
  GENERIC_SEARCH_QUERY,
  type CheckStatus,
  type ResourceMeta,
  type ResourceReadResult,
} from "./types.js";

export interface McpVerifyResult {
  status: CheckStatus;
  connect: CheckStatus;
  resourcesList: CheckStatus;
  resourceCount?: number;
  resourceLimitExceeded: boolean;
  resources: ResourceMeta[];
  resourcesRead: CheckStatus;
  readSamples: ResourceReadResult[];
  toolsList: CheckStatus;
  toolNames: string[];
  publicTools: CheckStatus;
  extraTools: string[];
  searchSite: CheckStatus;
  searchEmptyQueryRejected: CheckStatus;
  knownQuery: CheckStatus;
  knownQueryResultCount?: number;
  sampledBodies: string[];
  searchTexts: string[];
  dangerousToolInvoked: boolean;
  failures: string[];
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function extractTextContent(result: {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}): string {
  const parts: string[] = [];
  for (const item of result.content ?? []) {
    if (item.type === "text" && typeof item.text === "string") {
      parts.push(item.text);
    }
  }
  if (parts.length === 0 && result.structuredContent !== undefined) {
    parts.push(JSON.stringify(result.structuredContent));
  }
  return parts.join("\n");
}

function parseSearchResultCount(text: string): number | undefined {
  try {
    const parsed = JSON.parse(text) as { results?: unknown[] };
    if (Array.isArray(parsed.results)) return parsed.results.length;
  } catch {
    // fall through
  }
  return undefined;
}

export async function verifyMcp(options: {
  endpoint: string;
  timeoutMs: number;
  maxResources: number;
  maxReads: number;
  knownQuery?: string;
}): Promise<McpVerifyResult> {
  const failures: string[] = [];
  const sampledBodies: string[] = [];
  const searchTexts: string[] = [];
  let dangerousToolInvoked = false;

  const result: McpVerifyResult = {
    status: "FAIL",
    connect: "FAIL",
    resourcesList: "SKIPPED",
    resourceLimitExceeded: false,
    resources: [],
    resourcesRead: "SKIPPED",
    readSamples: [],
    toolsList: "SKIPPED",
    toolNames: [],
    publicTools: "SKIPPED",
    extraTools: [],
    searchSite: "SKIPPED",
    searchEmptyQueryRejected: "SKIPPED",
    knownQuery: options.knownQuery ? "FAIL" : "NOT_REQUIRED",
    sampledBodies,
    searchTexts,
    dangerousToolInvoked,
    failures,
  };

  const transport = new StreamableHTTPClientTransport(new URL(options.endpoint));
  const client = new Client({ name: "engawa-doctor", version: "0.1.0" });

  try {
    await withTimeout(client.connect(transport), options.timeoutMs, "MCP connect");
    result.connect = "PASS";

    const allResources: ResourceMeta[] = [];
    let cursor: string | undefined;
    let limitExceeded = false;
    do {
      const listed = await withTimeout(
        client.listResources(cursor ? { cursor } : undefined),
        options.timeoutMs,
        "resources/list",
      );
      for (const r of listed.resources) {
        allResources.push({
          uri: r.uri,
          name: r.name,
          mimeType: r.mimeType,
        });
        if (allResources.length > options.maxResources) {
          limitExceeded = true;
          break;
        }
      }
      if (limitExceeded) break;
      cursor = listed.nextCursor;
    } while (cursor);

    allResources.sort((a, b) => a.uri.localeCompare(b.uri));
    result.resources = allResources.slice(0, options.maxResources);
    result.resourceCount = allResources.length;
    result.resourceLimitExceeded = limitExceeded;

    if (limitExceeded) {
      result.resourcesList = "FAIL";
      failures.push("RESOURCE_LIMIT_EXCEEDED");
    } else if (allResources.length === 0) {
      result.resourcesList = "FAIL";
      failures.push("resources/list returned zero resources");
    } else {
      result.resourcesList = "PASS";
    }

    const toRead = result.resources.slice(0, options.maxReads);
    const readSamples: ResourceReadResult[] = [];
    for (const meta of toRead) {
      try {
        const read = await withTimeout(
          client.readResource({ uri: meta.uri }),
          options.timeoutMs,
          "resources/read",
        );
        const texts = (read.contents ?? [])
          .map((c) => ("text" in c && typeof c.text === "string" ? c.text : ""))
          .filter(Boolean);
        const body = texts.join("\n");
        const mimeType =
          read.contents?.find((c) => "mimeType" in c && c.mimeType)?.mimeType ?? meta.mimeType;
        if (!body) {
          readSamples.push({
            uri: meta.uri,
            mimeType,
            byteLength: 0,
            contentSha256: sha256Hex(""),
            result: "FAIL",
            reason: "empty-content",
          });
          failures.push(`resources/read empty: ${meta.uri}`);
        } else {
          sampledBodies.push(body);
          readSamples.push({
            uri: meta.uri,
            mimeType,
            byteLength: Buffer.byteLength(body, "utf8"),
            contentSha256: sha256Hex(body),
            result: "PASS",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "read failed";
        readSamples.push({
          uri: meta.uri,
          mimeType: meta.mimeType,
          byteLength: 0,
          contentSha256: sha256Hex(""),
          result: "FAIL",
          reason: evidenceText(msg),
        });
        failures.push(`resources/read failed: ${meta.uri}`);
      }
    }
    result.readSamples = readSamples;
    result.resourcesRead =
      readSamples.length > 0 && readSamples.every((s) => s.result === "PASS") ? "PASS" : "FAIL";
    if (result.resourcesRead === "FAIL" && !failures.some((f) => f.includes("resources/read"))) {
      failures.push("resources/read samples failed");
    }

    const toolsResult = await withTimeout(client.listTools(), options.timeoutMs, "tools/list");
    const toolNames = stableSortStrings(toolsResult.tools.map((t) => t.name));
    result.toolNames = toolNames;
    result.toolsList = "PASS";
    result.extraTools = toolNames.filter((n) => n !== "search_site");

    if (toolNames.length === 1 && toolNames[0] === "search_site") {
      result.publicTools = "PASS";
    } else {
      result.publicTools = "FAIL";
      failures.push(
        toolNames.length === 0
          ? "tools/list missing search_site"
          : `unexpected public tools: ${toolNames.join(", ")}`,
      );
      // Never invoke non-search_site tools
      dangerousToolInvoked = false;
    }

    if (result.publicTools === "PASS") {
      const probe = await withTimeout(
        client.callTool({
          name: "search_site",
          arguments: { query: GENERIC_SEARCH_QUERY, limit: 5 },
        }),
        options.timeoutMs,
        "search_site",
      );
      const probeText = extractTextContent(probe as never);
      searchTexts.push(probeText);
      if (probe.isError) {
        result.searchSite = "FAIL";
        failures.push("search_site protocol probe failed");
      } else {
        result.searchSite = "PASS";
      }

      const empty = await withTimeout(
        client.callTool({
          name: "search_site",
          arguments: { query: "", limit: 5 },
        }),
        options.timeoutMs,
        "search_site empty",
      );
      result.searchEmptyQueryRejected = empty.isError ? "PASS" : "FAIL";
      if (!empty.isError) {
        failures.push("search_site empty query was not rejected");
      }

      if (options.knownQuery) {
        const known = await withTimeout(
          client.callTool({
            name: "search_site",
            arguments: { query: options.knownQuery, limit: 5 },
          }),
          options.timeoutMs,
          "search_site known query",
        );
        const knownText = extractTextContent(known as never);
        searchTexts.push(knownText);
        const count = parseSearchResultCount(knownText);
        result.knownQueryResultCount = count;
        if (known.isError || count === 0 || (count === undefined && !knownText.trim())) {
          result.knownQuery = "FAIL";
          failures.push("known --query returned no results");
        } else {
          result.knownQuery = "PASS";
        }
      } else {
        result.knownQuery = "NOT_REQUIRED";
      }
    } else {
      result.searchSite = "SKIPPED";
      result.searchEmptyQueryRejected = "SKIPPED";
      result.knownQuery = options.knownQuery ? "SKIPPED" : "NOT_REQUIRED";
    }

    const hardFails: CheckStatus[] = [
      result.connect,
      result.resourcesList,
      result.resourcesRead,
      result.publicTools,
      result.searchSite,
      result.searchEmptyQueryRejected,
      result.knownQuery,
    ];
    result.status = hardFails.every((s) => s === "PASS" || s === "NOT_REQUIRED" || s === "SKIPPED")
      ? "PASS"
      : "FAIL";
    // SKIPPED public tools means we failed earlier — overall must be FAIL
    if (result.publicTools !== "PASS") {
      result.status = "FAIL";
    }
    result.dangerousToolInvoked = dangerousToolInvoked;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "MCP verification failed";
    failures.push(evidenceText(msg));
    if (result.connect !== "PASS") {
      result.connect = "FAIL";
    }
    result.status = "FAIL";
  } finally {
    try {
      await client.close();
    } catch {
      // ignore close errors
    }
  }

  return result;
}

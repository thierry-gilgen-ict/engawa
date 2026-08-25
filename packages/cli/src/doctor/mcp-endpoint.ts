import { isMcpUrl } from "../inspect/mcp.js";
import { DoctorError } from "../errors.js";
import type { CheckStatus, DoctorProfile } from "./types.js";
import { stableSortStrings } from "./helpers.js";

export interface McpEndpointResolution {
  endpoint?: string;
  endpointSource: "explicit" | "advertised" | "none";
  status: CheckStatus;
  failures: string[];
}

export function resolveMcpEndpoint(options: {
  origin: string;
  profile: DoctorProfile;
  explicitMcpUrl?: string;
  advertisedUrls: string[];
  mcpReferenced: boolean;
}): McpEndpointResolution {
  const failures: string[] = [];

  if (options.explicitMcpUrl) {
    let parsed: URL;
    try {
      parsed = new URL(options.explicitMcpUrl);
    } catch {
      throw new DoctorError(`Invalid --mcp-url: ${options.explicitMcpUrl}`);
    }
    if (parsed.origin !== options.origin) {
      failures.push("explicit --mcp-url is cross-origin (unsupported in v0.1)");
      return {
        endpointSource: "explicit",
        status: "FAIL",
        failures,
      };
    }
    return {
      endpoint: parsed.href,
      endpointSource: "explicit",
      status: "PASS",
      failures,
    };
  }

  const mcpCandidates = stableSortStrings([
    ...new Set(
      options.advertisedUrls.filter((u) => {
        try {
          return isMcpUrl(u) && new URL(u).origin === options.origin;
        } catch {
          return false;
        }
      }),
    ),
  ]);

  const crossOriginMcp = options.advertisedUrls.filter((u) => {
    try {
      return isMcpUrl(u) && new URL(u).origin !== options.origin;
    } catch {
      return false;
    }
  });
  if (crossOriginMcp.length > 0 && mcpCandidates.length === 0) {
    failures.push("MCP advertised on another origin; cross-origin MCP fetch is not supported");
    return { endpointSource: "none", status: "FAIL", failures };
  }

  if (mcpCandidates.length > 1) {
    failures.push("ambiguous MCP endpoints advertised; supply --mcp-url");
    return { endpointSource: "advertised", status: "FAIL", failures };
  }

  if (mcpCandidates.length === 1) {
    return {
      endpoint: mcpCandidates[0],
      endpointSource: "advertised",
      status: "PASS",
      failures,
    };
  }

  if (options.mcpReferenced) {
    // Referenced but no parseable same-origin URL — try default /mcp under locked origin
    const fallback = new URL("/mcp", options.origin).href;
    return {
      endpoint: fallback,
      endpointSource: "advertised",
      status: "PASS",
      failures,
    };
  }

  if (options.profile === "discovery") {
    return { endpointSource: "none", status: "NOT_REQUIRED", failures };
  }

  failures.push("no MCP endpoint discovered or supplied (full profile)");
  return { endpointSource: "none", status: "FAIL", failures };
}

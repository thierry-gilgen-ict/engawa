import {
  ENGawa_PACKAGES,
  TESTED_PACKAGE_VERSIONS,
  type ExistingEngawaInfo,
  type ExistingEngawaStatus,
} from "./types.js";
import type { RepoMetadata } from "./types.js";

const SURFACE_PATTERNS: Array<{ pattern: RegExp; hint: string }> = [
  { pattern: /llms\.txt/i, hint: "llms-route-or-file" },
  { pattern: /\/mcp/i, hint: "mcp-route-or-file" },
  { pattern: /ContentAdapter/i, hint: "content-adapter-reference" },
  { pattern: /generateLlmsTxt/i, hint: "generate-llms-txt-reference" },
  { pattern: /search_site/i, hint: "search-site-reference" },
  { pattern: /createEngawaPublicMcpHandler/i, hint: "public-mcp-handler-reference" },
  { pattern: /\/agents/i, hint: "agents-route-or-file" },
];

export function detectExistingEngawa(
  metadata: RepoMetadata,
  fileContents: Map<string, string>,
  filePaths: string[],
): ExistingEngawaInfo {
  const allDeps = { ...metadata.dependencies, ...metadata.devDependencies };
  const packages: Array<{ name: string; version: string }> = [];

  for (const pkg of ENGawa_PACKAGES) {
    const version = allDeps[pkg];
    if (version) packages.push({ name: pkg, version });
  }
  packages.sort((a, b) => a.name.localeCompare(b.name));

  const surfaceHints: string[] = [];
  for (const [path, content] of fileContents) {
    for (const { pattern, hint } of SURFACE_PATTERNS) {
      if (pattern.test(path) || pattern.test(content)) {
        surfaceHints.push(`${hint}:${path}`);
      }
    }
  }
  for (const path of filePaths) {
    if (path.includes("llms") || path.endsWith("llms.txt")) {
      surfaceHints.push(`path-hint:llms:${path}`);
    }
    if (path.includes("/mcp") || path.endsWith("mcp.ts") || path.endsWith("mcp/route.ts")) {
      surfaceHints.push(`path-hint:mcp:${path}`);
    }
  }
  const uniqueHints = [...new Set(surfaceHints)].sort();

  let status: ExistingEngawaStatus = "NOT_INSTALLED";
  const corePkgs = [
    "@thierry-gilgen-ict/engawa-core",
    "@thierry-gilgen-ict/engawa-discovery",
    "@thierry-gilgen-ict/engawa-mcp",
  ];

  if (packages.length === 0) {
    status = "NOT_INSTALLED";
  } else if (packages.length < corePkgs.length) {
    status = "PARTIAL";
  } else {
    const allMatch = packages.every((p) => {
      const tested = TESTED_PACKAGE_VERSIONS[p.name];
      if (!tested) return true;
      return p.version.includes(tested) || p.version === tested;
    });
    const coreInstalled = corePkgs.every((c) => packages.some((p) => p.name === c));
    if (allMatch && coreInstalled) {
      status = "TESTED_SET";
    } else {
      status = "VERSION_MISMATCH_REVIEW_REQUIRED";
    }
  }

  return { status, packages, surfaceHints: uniqueHints };
}

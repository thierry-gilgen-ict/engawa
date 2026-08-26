import type { EngawaConfig, EngawaResource } from "@thierry-gilgen-ict/engawa-core";

export type LlmsTxtOverflowPolicy = "error" | "trim-optional";

export type LlmsTxtWarningCode = "MISSING_DESCRIPTION" | "DESCRIPTION_EQUALS_TITLE";

export interface LlmsTxtWarning {
  code: LlmsTxtWarningCode;
  resourceId: string;
}

export interface LlmsTxtBuildResult {
  text: string;
  byteLength: number;
  includedPrimaryResourceIds: string[];
  includedOptionalResourceIds: string[];
  omittedOptionalResourceIds: string[];
  warnings: LlmsTxtWarning[];
}

export interface LlmsTxtOptions {
  mcpPath?: string | false;
  optionalResourceIds?: string[];
  preamble?: string;
  requireDescriptions?: boolean;
  maxBytes?: number;
  overflowPolicy?: LlmsTxtOverflowPolicy;
}

const GENERIC_PROSE_WITH_MCP = [
  "{siteName} provides machine-readable content for AI agents.",
  "",
  "Agents should read this file, follow links to detailed markdown pages, and use the MCP endpoint for structured search.",
] as const;

const GENERIC_PROSE_WITHOUT_MCP = [
  "{siteName} provides machine-readable content for AI agents.",
  "",
  "Agents should read this file and follow links to detailed markdown pages.",
] as const;

function utf8ByteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

function normalizeDescriptionForLine(description: string): string {
  return description.replace(/\s+/g, " ").trim();
}

function normalizeForComparison(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function formatMcpPath(mcpPath: string): string {
  return mcpPath.startsWith("/") ? mcpPath : `/${mcpPath}`;
}

function formatListItem(resource: EngawaResource): string {
  const rawDescription = resource.description?.trim();
  const note = rawDescription ? `: ${normalizeDescriptionForLine(resource.description!)}` : "";
  return `- [${resource.title}](${resource.canonicalUrl})${note}`;
}

function collectDescriptionWarnings(resources: EngawaResource[]): LlmsTxtWarning[] {
  const warnings: LlmsTxtWarning[] = [];
  for (const resource of resources) {
    const raw = resource.description?.trim();
    if (!raw) {
      warnings.push({ code: "MISSING_DESCRIPTION", resourceId: resource.id });
      continue;
    }
    if (normalizeForComparison(raw) === normalizeForComparison(resource.title)) {
      warnings.push({ code: "DESCRIPTION_EQUALS_TITLE", resourceId: resource.id });
    }
  }
  return warnings;
}

function assertRequireDescriptions(resources: EngawaResource[]): void {
  for (const resource of resources) {
    if (!resource.description?.trim()) {
      throw new Error(`llms.txt requires a description for resource: ${resource.id}`);
    }
  }
}

function validatePositiveIntegerMaxBytes(maxBytes: number): void {
  if (!Number.isFinite(maxBytes) || !Number.isInteger(maxBytes) || maxBytes <= 0) {
    throw new Error(`llms.txt maxBytes must be a positive integer: ${maxBytes}`);
  }
}

function validateInputs(resources: EngawaResource[], options: LlmsTxtOptions): Set<string> {
  const seenIds = new Set<string>();
  for (const resource of resources) {
    if (seenIds.has(resource.id)) {
      throw new Error(`duplicate resource id in llms.txt input: ${resource.id}`);
    }
    seenIds.add(resource.id);
  }

  const optionalIdsList = options.optionalResourceIds ?? [];
  const seenOptional = new Set<string>();
  for (const id of optionalIdsList) {
    if (seenOptional.has(id)) {
      throw new Error(`duplicate optionalResourceId in llms.txt options: ${id}`);
    }
    seenOptional.add(id);
    if (!seenIds.has(id)) {
      throw new Error(`unknown optionalResourceId in llms.txt options: ${id}`);
    }
  }

  if (options.overflowPolicy !== undefined && options.maxBytes === undefined) {
    throw new Error("llms.txt overflowPolicy requires maxBytes");
  }

  if (
    options.overflowPolicy !== undefined &&
    options.overflowPolicy !== "error" &&
    options.overflowPolicy !== "trim-optional"
  ) {
    throw new Error(`invalid llms.txt overflowPolicy: ${options.overflowPolicy}`);
  }

  if (options.maxBytes !== undefined) {
    validatePositiveIntegerMaxBytes(options.maxBytes);
  }

  return seenOptional;
}

function buildMcpLines(config: EngawaConfig, mcpPath: string | false | undefined): string[] {
  if (mcpPath === false) {
    return [];
  }
  const path = formatMcpPath(mcpPath ?? "/mcp");
  return [
    `- MCP endpoint: ${config.site.canonicalUrl}${path}`,
    "- Public agent interface is read-only in v0.1.",
  ];
}

function normalizePreambleSurroundingLines(preamble: string): string {
  const lines = preamble.split("\n");
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end).join("\n");
}

function buildBodyLines(
  config: EngawaConfig,
  options: LlmsTxtOptions,
  mcpPath: string | false | undefined,
): string[] {
  const mcpLines = buildMcpLines(config, mcpPath);
  if (options.preamble !== undefined) {
    const preamble = normalizePreambleSurroundingLines(options.preamble);
    if (preamble.length === 0) {
      return mcpLines.length > 0 ? ["", ...mcpLines] : [];
    }
    if (mcpLines.length === 0) {
      return [preamble];
    }
    return [preamble, "", ...mcpLines];
  }

  const genericTemplate = mcpPath === false ? GENERIC_PROSE_WITHOUT_MCP : GENERIC_PROSE_WITH_MCP;
  const generic = genericTemplate.map((line) =>
    line === "{siteName} provides machine-readable content for AI agents."
      ? `${config.site.name} provides machine-readable content for AI agents.`
      : line,
  );
  return [...generic, "", ...mcpLines];
}

function assembleDocument(
  config: EngawaConfig,
  bodyLines: string[],
  primary: EngawaResource[],
  optional: EngawaResource[],
): string {
  const lines: string[] = [
    `# ${config.site.name}`,
    `> ${config.site.description}`,
    "",
    ...bodyLines,
    "",
    "## Pages",
    ...primary.map((r) => formatListItem(r)),
  ];

  if (optional.length > 0) {
    lines.push("", "## Optional", ...optional.map((r) => formatListItem(r)));
  }

  return lines.join("\n").trimEnd() + "\n";
}

function assertWithinMaxBytes(text: string, maxBytes: number): void {
  const byteLength = utf8ByteLength(text);
  if (byteLength > maxBytes) {
    throw new Error(`llms.txt exceeds maxBytes (${byteLength} bytes, limit ${maxBytes})`);
  }
}

export function buildLlmsTxt(
  config: EngawaConfig,
  resources: EngawaResource[],
  options: LlmsTxtOptions = {},
): LlmsTxtBuildResult {
  const optionalIds = validateInputs(resources, options);
  const warnings = collectDescriptionWarnings(resources);

  if (options.requireDescriptions) {
    assertRequireDescriptions(resources);
  }

  const primary = resources.filter((r) => !optionalIds.has(r.id));
  const optionalCandidates = resources.filter((r) => optionalIds.has(r.id));
  const bodyLines = buildBodyLines(config, options, options.mcpPath);

  const includedPrimaryResourceIds = primary.map((r) => r.id);
  let includedOptional: EngawaResource[] = [];
  const omittedOptionalResourceIds: string[] = [];

  if (options.maxBytes !== undefined) {
    const maxBytes = options.maxBytes;
    const overflowPolicy = options.overflowPolicy ?? "error";

    const primaryOnlyText = assembleDocument(config, bodyLines, primary, []);
    if (utf8ByteLength(primaryOnlyText) > maxBytes) {
      throw new Error(
        `llms.txt exceeds maxBytes (${utf8ByteLength(primaryOnlyText)} bytes, limit ${maxBytes})`,
      );
    }

    if (overflowPolicy === "error") {
      const fullText = assembleDocument(config, bodyLines, primary, optionalCandidates);
      assertWithinMaxBytes(fullText, maxBytes);
      includedOptional = optionalCandidates;
    } else {
      for (let i = 0; i < optionalCandidates.length; i++) {
        const resource = optionalCandidates[i];
        const candidateOptional = [...includedOptional, resource];
        const candidateText = assembleDocument(config, bodyLines, primary, candidateOptional);
        if (utf8ByteLength(candidateText) <= maxBytes) {
          includedOptional = candidateOptional;
        } else {
          omittedOptionalResourceIds.push(resource.id);
          for (let j = i + 1; j < optionalCandidates.length; j++) {
            omittedOptionalResourceIds.push(optionalCandidates[j].id);
          }
          break;
        }
      }
    }
  } else {
    includedOptional = optionalCandidates;
  }

  const text = assembleDocument(config, bodyLines, primary, includedOptional);

  return {
    text,
    byteLength: utf8ByteLength(text),
    includedPrimaryResourceIds,
    includedOptionalResourceIds: includedOptional.map((r) => r.id),
    omittedOptionalResourceIds,
    warnings,
  };
}

export function generateLlmsTxt(
  config: EngawaConfig,
  resources: EngawaResource[],
  options: LlmsTxtOptions = {},
): string {
  return buildLlmsTxt(config, resources, options).text;
}

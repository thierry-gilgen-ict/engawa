import { posixJoin, posixNormalize } from "./repo-path.js";
import { LOCAL_IMPORT_DEPTH } from "./types.js";

const IMPORT_REGEX =
  /import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mdx", ".md"];
const INDEX_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

export interface PathAlias {
  prefix: string;
  target: string;
}

function normalizeAliasTarget(target: string): string {
  let normalized = target.replace(/\\/g, "/");
  if (normalized.startsWith("./")) normalized = normalized.slice(2);
  return normalized.replace(/\/$/, "");
}

export function parsePathAliases(fileContents: Map<string, string>): PathAlias[] {
  const aliases: PathAlias[] = [];
  for (const [path, content] of fileContents) {
    if (path !== "tsconfig.json" && path !== "jsconfig.json") continue;
    try {
      const json = JSON.parse(content) as {
        compilerOptions?: { paths?: Record<string, string[]> };
      };
      const paths = json.compilerOptions?.paths;
      if (!paths) continue;
      for (const [key, values] of Object.entries(paths)) {
        if (!values?.[0]) continue;
        const prefix = key.replace(/\*$/, "");
        const target = normalizeAliasTarget(values[0].replace(/\*$/, ""));
        aliases.push({ prefix, target });
      }
    } catch {
      // ignore malformed config
    }
  }
  return aliases;
}

export function extractImports(content: string): string[] {
  const imports: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(IMPORT_REGEX.source, IMPORT_REGEX.flags);
  while ((match = regex.exec(content)) !== null) {
    const spec = match[1] ?? match[2];
    if (spec) imports.push(spec);
  }
  return imports;
}

function candidatePathsForBase(base: string): string[] {
  const normalized = posixNormalize(base);
  const candidates: string[] = [normalized];
  for (const ext of RESOLVE_EXTENSIONS) {
    candidates.push(`${normalized}${ext}`);
  }
  for (const ext of INDEX_EXTENSIONS) {
    candidates.push(`${normalized}/index${ext}`);
  }
  return candidates;
}

function resolveRelativeToExistingPath(
  fromDir: string,
  spec: string,
  filePaths: string[],
  filePathSet: Set<string>,
): string | null {
  const joined = posixNormalize(posixJoin(fromDir, spec));
  for (const candidate of candidatePathsForBase(joined)) {
    if (filePathSet.has(candidate)) return candidate;
  }
  return null;
}

function resolveAliasImport(
  spec: string,
  aliases: PathAlias[],
  filePathSet: Set<string>,
): string | null {
  for (const alias of aliases) {
    if (!spec.startsWith(alias.prefix)) continue;
    const rest = spec.slice(alias.prefix.length);
    const base = posixNormalize(posixJoin(alias.target, rest));
    for (const candidate of candidatePathsForBase(base)) {
      if (filePathSet.has(candidate)) return candidate;
    }
    return null;
  }
  return null;
}

export function resolveImportToPath(
  modulePath: string,
  spec: string,
  aliases: PathAlias[],
  filePaths: string[],
): string | null {
  const filePathSet = new Set(filePaths);

  if (spec.startsWith(".")) {
    const fromDir = modulePath.includes("/")
      ? modulePath.slice(0, modulePath.lastIndexOf("/"))
      : "";
    return resolveRelativeToExistingPath(fromDir, spec, filePaths, filePathSet);
  }

  if (spec.startsWith("@/") || aliases.some((a) => spec.startsWith(a.prefix))) {
    return resolveAliasImport(spec, aliases, filePathSet);
  }

  return null;
}

export interface ResolvedImport {
  path: string;
  depth: number;
}

export function collectLocalImports(
  startModule: string,
  fileContents: Map<string, string>,
  filePaths: string[],
  aliases: PathAlias[],
  maxDepth = LOCAL_IMPORT_DEPTH,
): { resolved: ResolvedImport[]; unresolved: string[] } {
  const resolved: ResolvedImport[] = [];
  const unresolved: string[] = [];
  const visited = new Set<string>();
  const queue: Array<{ path: string; depth: number }> = [{ path: startModule, depth: 0 }];

  while (queue.length > 0) {
    const { path, depth } = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);

    const content = fileContents.get(path);
    if (!content) continue;

    if (depth > 0) {
      resolved.push({ path, depth });
    }

    if (depth >= maxDepth) continue;

    const imports = extractImports(content);
    for (const spec of imports) {
      if (
        !spec.startsWith(".") &&
        !spec.startsWith("@/") &&
        !aliases.some((a) => spec.startsWith(a.prefix))
      ) {
        continue;
      }
      const resolvedPath = resolveImportToPath(path, spec, aliases, filePaths);
      if (resolvedPath) {
        if (!visited.has(resolvedPath)) {
          queue.push({ path: resolvedPath, depth: depth + 1 });
        }
      } else if (spec.startsWith(".") || spec.startsWith("@")) {
        unresolved.push(`${path}: ${spec}`);
      }
    }
  }

  resolved.sort((a, b) => a.path.localeCompare(b.path));
  unresolved.sort();
  return { resolved, unresolved };
}

import { posixJoin, posixNormalize } from "./repo-path.js";
import { LOCAL_IMPORT_DEPTH } from "./types.js";

const IMPORT_REGEX =
  /import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

export interface PathAlias {
  prefix: string;
  target: string;
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
        const target = values[0].replace(/\*$/, "");
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

function resolveRelativeImport(fromDir: string, spec: string): string {
  const joined = posixNormalize(posixJoin(fromDir, spec));
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mdx", ".md"];
  if (joined.includes(".")) return joined;
  for (const ext of exts) {
    return `${joined}${ext}`;
  }
  return `${joined}.ts`;
}

function resolveAliasImport(
  spec: string,
  aliases: PathAlias[],
  filePaths: string[],
): string | null {
  for (const alias of aliases) {
    if (!spec.startsWith(alias.prefix)) continue;
    const rest = spec.slice(alias.prefix.length);
    const base = posixNormalize(`${alias.target}${rest}`);
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.js`,
      `${base}.jsx`,
      `${base}/index.ts`,
      `${base}/index.tsx`,
    ];
    for (const c of candidates) {
      if (filePaths.includes(c)) return c;
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
  if (spec.startsWith(".")) {
    const fromDir = modulePath.includes("/")
      ? modulePath.slice(0, modulePath.lastIndexOf("/"))
      : "";
    const resolved = resolveRelativeImport(fromDir, spec);
    if (filePaths.includes(resolved)) return resolved;
    const withoutExt = resolved.replace(/\.(tsx?|jsx?|mdx?)$/, "");
    const indexCandidates = [
      `${withoutExt}/index.ts`,
      `${withoutExt}/index.tsx`,
      `${withoutExt}.ts`,
      `${withoutExt}.tsx`,
    ];
    for (const c of indexCandidates) {
      if (filePaths.includes(c)) return c;
    }
    return null;
  }

  if (spec.startsWith("@/") || aliases.some((a) => spec.startsWith(a.prefix))) {
    return resolveAliasImport(spec, aliases, filePaths);
  }

  return null;
}

export function collectLocalImports(
  startModule: string,
  fileContents: Map<string, string>,
  filePaths: string[],
  aliases: PathAlias[],
  maxDepth = LOCAL_IMPORT_DEPTH,
): { resolved: string[]; unresolved: string[] } {
  const resolved: string[] = [];
  const unresolved: string[] = [];
  const visited = new Set<string>();
  const queue: Array<{ path: string; depth: number }> = [{ path: startModule, depth: 0 }];

  while (queue.length > 0) {
    const { path, depth } = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);

    const content = fileContents.get(path);
    if (!content) continue;

    if (depth > 0) resolved.push(path);

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

  resolved.sort();
  unresolved.sort();
  return { resolved, unresolved };
}

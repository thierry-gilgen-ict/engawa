const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".cache",
  ".ssh",
  ".aws",
]);

const SENSITIVE_FILE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /^\.env$/, reason: "sensitive-file-policy" },
  { pattern: /^\.env\./, reason: "sensitive-file-policy" },
  { pattern: /\.pem$/, reason: "sensitive-file-policy" },
  { pattern: /\.key$/, reason: "sensitive-file-policy" },
  { pattern: /\.p12$/, reason: "sensitive-file-policy" },
  { pattern: /\.pfx$/, reason: "sensitive-file-policy" },
  { pattern: /\.jks$/, reason: "sensitive-file-policy" },
  { pattern: /^id_rsa$/, reason: "sensitive-file-policy" },
  { pattern: /^id_ed25519$/, reason: "sensitive-file-policy" },
  { pattern: /^\.npmrc$/, reason: "sensitive-file-policy" },
  { pattern: /^\.pypirc$/, reason: "sensitive-file-policy" },
  { pattern: /^credentials/i, reason: "sensitive-file-policy" },
  { pattern: /^secret/i, reason: "sensitive-file-policy" },
  { pattern: /^secrets/i, reason: "sensitive-file-policy" },
];

const SKIP_DIR_PREFIXES = [".git/", ".ssh/", ".aws/"];

export function shouldSkipDirName(name: string): boolean {
  return SKIP_DIR_NAMES.has(name);
}

export function getSkipReasonForPath(posixPath: string): string | null {
  for (const prefix of SKIP_DIR_PREFIXES) {
    if (posixPath.startsWith(prefix) || posixPath === prefix.slice(0, -1)) {
      return "excluded-directory";
    }
  }
  const parts = posixPath.split("/");
  for (const part of parts) {
    if (SKIP_DIR_NAMES.has(part)) {
      return "excluded-directory";
    }
  }
  const basename = parts[parts.length - 1] ?? posixPath;
  for (const { pattern, reason } of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(basename)) {
      return reason;
    }
  }
  return null;
}

export function isTextLikelyFile(posixPath: string): boolean {
  const ext = posixPath.includes(".") ? posixPath.split(".").pop()?.toLowerCase() : "";
  const textExts = new Set([
    "ts",
    "tsx",
    "js",
    "jsx",
    "mjs",
    "cjs",
    "json",
    "md",
    "mdx",
    "yaml",
    "yml",
    "toml",
    "html",
    "css",
    "scss",
    "svg",
    "txt",
    "xml",
    "env",
    "config",
  ]);
  if (ext && textExts.has(ext)) return true;
  const basename = posixPath.split("/").pop() ?? "";
  const configNames = new Set([
    "package.json",
    "tsconfig.json",
    "jsconfig.json",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "middleware.ts",
    "middleware.js",
  ]);
  return configNames.has(basename) || basename.startsWith("next.config.");
}

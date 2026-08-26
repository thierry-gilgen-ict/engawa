/**
 * engawa-discovery persistent packed-artifact smoke.
 * Stages discovery-only tarball, inspects contents, and verifies packed API
 * in an isolated npm consumer (registry core + file tarball). Post-publish safe:
 * does not assert registry absence of the source discovery version. No npm publish.
 *
 * Usage: node scripts/discovery-release-candidate-smoke.mjs
 *        pnpm smoke:discovery-rc
 */
import { createHash } from "node:crypto";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const scope = "@thierry-gilgen-ict";
const scopeCore = `${scope}/engawa-core`;
const scopeDiscovery = `${scope}/engawa-discovery`;
const expectedDiscoveryVersion = JSON.parse(
  readFileSync(join(root, "packages/discovery/package.json"), "utf8"),
).version;
const expectedCoreVersion = JSON.parse(
  readFileSync(join(root, "packages/core/package.json"), "utf8"),
).version;

const FORBIDDEN_TARBALL_PATTERNS = [
  /^src\//,
  /\.test\./,
  /test-helpers/,
  /fixture/i,
  /tsconfig/,
  /\.tsbuildinfo$/,
  /\.env/,
  /credential/i,
  /secret/i,
  /private-key/i,
  /id_rsa/,
  /id_ed25519/,
  /\.pem$/,
  /\.p12$/,
  /^\.git\//,
  /^\.github\//,
  /\.tgz$/,
];

const ABSOLUTE_PATH_PATTERNS = [
  /[A-Za-z]:\\(?:[^\\]|\\[^\\])+/,
  /\/Users\/[^\s"'`]+/,
  /\/home\/[^\s"'`]+/,
  /E:\\_Development\\/i,
];

function expectedTarballName(name, version) {
  return `${name.replace("@", "").replace("/", "-")}-${version}.tgz`;
}

function listTarballEntries(tarballPath) {
  const listing = execSync(`tar -tzf "${tarballPath}"`, { encoding: "utf8" });
  return listing
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^package\//, ""));
}

function isAllowedTarballEntry(entry) {
  if (entry === "package.json" || entry === "README.md" || entry === "LICENSE") return true;
  return entry.startsWith("dist/");
}

function verifyTarballContents(tarballPath) {
  const entries = listTarballEntries(tarballPath);

  for (const entry of entries) {
    if (!isAllowedTarballEntry(entry)) {
      throw new Error(`Unexpected tarball entry (not allowlisted): ${entry}`);
    }
    for (const pattern of FORBIDDEN_TARBALL_PATTERNS) {
      if (pattern.test(entry)) {
        throw new Error(`Forbidden tarball entry: ${entry}`);
      }
    }
  }

  const required = ["package.json", "README.md", "LICENSE", "dist/index.js"];
  for (const path of required) {
    if (!entries.includes(path)) {
      throw new Error(`Required tarball entry missing: ${path}`);
    }
  }

  return entries;
}

function scanTarballTextForAbsolutePaths(tarballPath, entries) {
  const textEntries = entries.filter(
    (e) => e === "package.json" || e === "README.md" || e.endsWith(".md"),
  );
  for (const entry of textEntries) {
    const raw = execSync(`tar -xOf "${tarballPath}" "package/${entry}"`, {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
    });
    for (const pattern of ABSOLUTE_PATH_PATTERNS) {
      if (pattern.test(raw)) {
        throw new Error(`Absolute local path pattern in tarball ${entry}`);
      }
    }
  }
}

async function main() {
  if (!existsSync(join(root, "packages/discovery/dist/index.js"))) {
    console.error("Run pnpm build first");
    process.exit(1);
  }

  execSync("node scripts/stage-npm-tarballs.mjs --discovery-only", {
    cwd: root,
    stdio: "inherit",
  });

  const tarballPath = join(
    root,
    ".npm-staging/discovery",
    expectedTarballName(scopeDiscovery, expectedDiscoveryVersion),
  );
  if (!existsSync(tarballPath)) {
    throw new Error(`Expected tarball missing: ${tarballPath}`);
  }

  const entries = verifyTarballContents(tarballPath);
  scanTarballTextForAbsolutePaths(tarballPath, entries);

  const tarballBytes = readFileSync(tarballPath);
  const sha256 = createHash("sha256").update(tarballBytes).digest("hex");
  let shasum = "";
  try {
    shasum = execSync(`shasum -a 256 "${tarballPath}"`, { encoding: "utf8" }).trim();
  } catch {
    try {
      shasum = execSync(`openssl dgst -sha256 "${tarballPath}"`, { encoding: "utf8" }).trim();
    } catch {
      shasum = `sha256:${sha256}`;
    }
  }

  console.log(`TARBALL_PATH = ${tarballPath}`);
  console.log(`TARBALL_SIZE = ${tarballBytes.length}`);
  console.log(`TARBALL_SHA256 = ${sha256}`);
  console.log(`TARBALL_SHASUM = ${shasum}`);
  console.log("DISCOVERY_RC_TARBALL_ALLOWLIST = PASS");
  console.log("DISCOVERY_RC_SECRET_SCAN = PASS");
  console.log("DISCOVERY_RC_PATH_SCAN = PASS");

  const stagedDir = join(root, ".npm-staging/discovery");
  execSync("npm pack --dry-run --json", { cwd: stagedDir, stdio: "inherit" });

  const smokeDir = await mkdtemp(join(tmpdir(), "engawa-discovery-rc-smoke-"));
  try {
    await writeFile(
      join(smokeDir, "package.json"),
      JSON.stringify(
        {
          name: "engawa-discovery-rc-consumer",
          private: true,
          type: "module",
          dependencies: {
            [scopeDiscovery]: `file:${tarballPath}`,
            [scopeCore]: expectedCoreVersion,
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    execSync("npm install --no-package-lock", {
      cwd: smokeDir,
      stdio: "inherit",
      env: { ...process.env, npm_config_registry: "https://registry.npmjs.org" },
    });

    const installedDiscovery = JSON.parse(
      await readFile(join(smokeDir, "node_modules", scopeDiscovery, "package.json"), "utf8"),
    );
    const installedCore = JSON.parse(
      await readFile(join(smokeDir, "node_modules", scopeCore, "package.json"), "utf8"),
    );

    if (installedDiscovery.version !== expectedDiscoveryVersion) {
      throw new Error(`installed discovery version mismatch: ${installedDiscovery.version}`);
    }
    if (installedDiscovery.dependencies?.[scopeCore] !== expectedCoreVersion) {
      throw new Error(
        `installed discovery core dep mismatch: ${installedDiscovery.dependencies?.[scopeCore]}`,
      );
    }
    if (installedDiscovery.dependencies?.[scopeCore]?.startsWith("workspace:")) {
      throw new Error("workspace:* leaked into packed discovery dependencies");
    }
    if (installedCore.version !== expectedCoreVersion) {
      throw new Error(`installed core version mismatch: ${installedCore.version}`);
    }

    const smokeCode = `
import { validateEngawaConfig } from "${scopeCore}";
import { buildLlmsTxt, generateLlmsTxt } from "${scopeDiscovery}";

const config = validateEngawaConfig({
  site: {
    name: "Discovery RC Smoke",
    canonicalUrl: "http://127.0.0.1:3847",
    description: "RC smoke site description.",
    language: "en",
  },
  agentInterface: { enabled: true, public: true },
  content: {
    maxResourceBytes: 65536,
    maxSearchResults: 10,
    maxSearchQueryLength: 200,
  },
  security: { publicDefault: "read-only" },
  metadata: { version: "${expectedCoreVersion}" },
});

const resources = [
  {
    id: "primary",
    uri: "engawa://127.0.0.1:3847/r/primary",
    title: "Primary",
    description: "Primary page",
    mimeType: "text/markdown",
    content: "body",
    canonicalUrl: "http://127.0.0.1:3847/primary.md",
  },
  {
    id: "opt-a",
    uri: "engawa://127.0.0.1:3847/r/opt-a",
    title: "Optional A",
    description: "First optional resource",
    mimeType: "text/markdown",
    content: "body",
    canonicalUrl: "http://127.0.0.1:3847/opt-a.md",
  },
  {
    id: "opt-b",
    uri: "engawa://127.0.0.1:3847/r/opt-b",
    title: "Optional B",
    description: "Second optional with more text",
    mimeType: "text/markdown",
    content: "body",
    canonicalUrl: "http://127.0.0.1:3847/opt-b.md",
  },
  {
    id: "jp",
    uri: "engawa://127.0.0.1:3847/r/jp",
    title: "縁側",
    description: "Japanese title example",
    mimeType: "text/markdown",
    content: "body",
    canonicalUrl: "http://127.0.0.1:3847/jp.md",
  },
];

const legacy = generateLlmsTxt(config, resources);
if (typeof legacy !== "string" || !legacy.includes("Discovery RC Smoke")) {
  throw new Error("generateLlmsTxt legacy compatibility failed");
}

const preamble = "Curated preamble for RC smoke.";
const curated = buildLlmsTxt(config, resources, {
  preamble,
  mcpPath: false,
});
if (!curated.text.includes(preamble)) {
  throw new Error("buildLlmsTxt preamble missing");
}

const trimResources = [resources[0], resources[1], resources[2]];
const trimmed = buildLlmsTxt(config, trimResources, {
  optionalResourceIds: ["opt-a", "opt-b"],
  mcpPath: false,
  maxBytes: 360,
  overflowPolicy: "trim-optional",
});
if (trimmed.includedOptionalResourceIds?.[0] !== "opt-a") {
  throw new Error("trim-optional prefix inclusion failed");
}
if (!trimmed.omittedOptionalResourceIds?.includes("opt-b")) {
  throw new Error("trim-optional tail omission failed");
}

const unicode = buildLlmsTxt(config, [resources[3]]);
if (unicode.byteLength !== Buffer.byteLength(unicode.text, "utf8")) {
  throw new Error("UTF-8 byteLength mismatch");
}
if (Buffer.byteLength("縁側", "utf8") !== 6) {
  throw new Error("UTF-8 fixture byte count unexpected");
}

console.log("ENGAWA_DISCOVERY_RELEASE_CANDIDATE_SMOKE = PASS");
`;

    await writeFile(join(smokeDir, "smoke.mjs"), smokeCode, "utf8");
    execSync("node smoke.mjs", { cwd: smokeDir, stdio: "inherit" });
    console.log("DISCOVERY_RC_PACK_INSTALL_SMOKE = PASS");
  } finally {
    await rm(smokeDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * v0.1.1 release-candidate smoke test.
 * Builds staged tarballs, installs them in an isolated npm project (outside the pnpm workspace),
 * plus registry engawa-react@0.1.0, and verifies imports and metadata.
 *
 * Does NOT call npm publish.
 *
 * Usage: node scripts/v011-release-candidate-smoke.mjs
 */
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const scope = "@thierry-gilgen-ict";
const scopeCore = `${scope}/engawa-core`;
const expectedCoreVersion = JSON.parse(
  readFileSync(join(root, "packages/core/package.json"), "utf8"),
).version;
const expectedReactVersion = "0.1.0";

function expectedTarballName(name, version) {
  return `${name.replace("@", "").replace("/", "-")}-${version}.tgz`;
}

function resolveTarball(dir, name, version) {
  const filename = expectedTarballName(name, version);
  const path = join(dir, filename);
  if (!existsSync(path)) {
    throw new Error(`Expected tarball missing: ${path}`);
  }
  return path;
}

function assertVersion(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} version mismatch: expected ${expected}, got ${actual}`);
  }
}

function assertCoreDep(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} ${scopeCore} dep mismatch: expected ${expected}, got ${actual}`);
  }
}

async function main() {
  if (!existsSync(join(root, "packages/core/dist/index.js"))) {
    console.error("Run pnpm build first");
    process.exit(1);
  }

  execSync("node scripts/stage-npm-tarballs.mjs", { cwd: root, stdio: "inherit" });

  const discoveryPkg = JSON.parse(
    readFileSync(join(root, "packages/discovery/package.json"), "utf8"),
  );
  const mcpPkg = JSON.parse(readFileSync(join(root, "packages/mcp/package.json"), "utf8"));

  assertVersion(discoveryPkg.version, expectedCoreVersion, "discovery source");
  assertVersion(mcpPkg.version, expectedCoreVersion, "mcp source");

  const coreTarball = resolveTarball(join(root, "packages/core"), scopeCore, expectedCoreVersion);
  const discoveryTarball = resolveTarball(
    join(root, ".npm-staging/discovery"),
    `${scope}/engawa-discovery`,
    expectedCoreVersion,
  );
  const mcpTarball = resolveTarball(
    join(root, ".npm-staging/mcp"),
    `${scope}/engawa-mcp`,
    expectedCoreVersion,
  );

  const smokeDir = await mkdtemp(join(tmpdir(), "engawa-v011-rc-smoke-"));
  try {
    const pkg = {
      name: "engawa-v011-rc-consumer",
      private: true,
      type: "module",
      dependencies: {
        [scopeCore]: `file:${coreTarball}`,
        [`${scope}/engawa-discovery`]: `file:${discoveryTarball}`,
        [`${scope}/engawa-mcp`]: `file:${mcpTarball}`,
        [`${scope}/engawa-react`]: expectedReactVersion,
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
    };

    await writeFile(join(smokeDir, "package.json"), JSON.stringify(pkg, null, 2));

    execSync("npm install --no-package-lock", {
      cwd: smokeDir,
      stdio: "inherit",
      env: { ...process.env, npm_config_registry: "https://registry.npmjs.org" },
    });

    const installedCore = JSON.parse(
      await readFile(join(smokeDir, "node_modules", scopeCore, "package.json"), "utf8"),
    );
    const installedDiscovery = JSON.parse(
      await readFile(
        join(smokeDir, "node_modules/@thierry-gilgen-ict/engawa-discovery/package.json"),
        "utf8",
      ),
    );
    const installedMcp = JSON.parse(
      await readFile(
        join(smokeDir, "node_modules/@thierry-gilgen-ict/engawa-mcp/package.json"),
        "utf8",
      ),
    );
    const installedReact = JSON.parse(
      await readFile(
        join(smokeDir, "node_modules/@thierry-gilgen-ict/engawa-react/package.json"),
        "utf8",
      ),
    );

    assertVersion(installedCore.version, expectedCoreVersion, "installed core");
    assertVersion(installedDiscovery.version, expectedCoreVersion, "installed discovery");
    assertVersion(installedMcp.version, expectedCoreVersion, "installed mcp");
    assertVersion(installedReact.version, expectedReactVersion, "installed react");
    assertCoreDep(
      installedDiscovery.dependencies?.[scopeCore],
      expectedCoreVersion,
      "installed discovery",
    );
    assertCoreDep(installedMcp.dependencies?.[scopeCore], expectedCoreVersion, "installed mcp");

    const smokeCode = `
import {
  createEngawa,
  StaticContentAdapter,
  validateEngawaConfig,
} from "${scopeCore}";
import { generateLlmsTxt } from "${scope}/engawa-discovery";
import { createEngawaPublicMcpServer } from "${scope}/engawa-mcp";
import { AskYourAgent } from "${scope}/engawa-react";

const config = validateEngawaConfig({
  site: {
    name: "v0.1.1 RC Smoke",
    canonicalUrl: "https://example.com",
    description: "RC Smoke",
    language: "en",
  },
  agentInterface: { enabled: true, public: true },
  security: { publicDefault: "read-only" },
  metadata: { version: "${expectedCoreVersion}" },
});

const adapter = new StaticContentAdapter(config.site.canonicalUrl, [
  { id: "test", title: "Test", content: "Test content", path: "/test.md" },
]);

const engawa = createEngawa(config, adapter);
const resources = await engawa.listResources();
if (resources.length < 1) throw new Error("no resources");

const llms = generateLlmsTxt(engawa.config, resources);
if (!llms.includes("v0.1.1 RC Smoke")) throw new Error("llms.txt missing site name");

const server = await createEngawaPublicMcpServer(engawa);
if (!server) throw new Error("mcp server missing");

if (typeof AskYourAgent !== "function") throw new Error("React export missing");

console.log("ENGAWA_V011_RELEASE_CANDIDATE_SMOKE = PASS");
`;

    await writeFile(join(smokeDir, "smoke.mjs"), smokeCode);
    execSync("node smoke.mjs", { cwd: smokeDir, stdio: "inherit" });
  } finally {
    await rm(smokeDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

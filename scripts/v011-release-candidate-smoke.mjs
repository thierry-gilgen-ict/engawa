/**
 * v0.1.1 release-candidate smoke test.
 * Builds staged tarballs, installs them in an isolated npm project (outside the pnpm workspace),
 * plus registry engawa-react@0.1.0, and verifies imports and metadata.
 *
 * Does NOT call npm publish.
 *
 * Usage: node scripts/v011-release-candidate-smoke.mjs
 */
import { mkdtemp, rm, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const scope = "@thierry-gilgen-ict";

async function findTarball(dir) {
  const files = await readdir(dir);
  const tgz = files.find((f) => f.endsWith(".tgz"));
  if (!tgz) throw new Error(`No .tgz found in ${dir}`);
  return join(dir, tgz);
}

async function main() {
  if (!existsSync(join(root, "packages/core/dist/index.js"))) {
    console.error("Run pnpm build first");
    process.exit(1);
  }

  execSync("node scripts/stage-npm-tarballs.mjs", { cwd: root, stdio: "inherit" });

  const coreTarball = await findTarball(join(root, "packages/core"));
  const discoveryTarball = await findTarball(join(root, ".npm-staging/discovery"));
  const mcpTarball = await findTarball(join(root, ".npm-staging/mcp"));

  const smokeDir = await mkdtemp(join(tmpdir(), "engawa-v011-rc-smoke-"));
  try {
    const pkg = {
      name: "engawa-v011-rc-consumer",
      private: true,
      type: "module",
      dependencies: {
        [`${scope}/engawa-core`]: `file:${coreTarball}`,
        [`${scope}/engawa-discovery`]: `file:${discoveryTarball}`,
        [`${scope}/engawa-mcp`]: `file:${mcpTarball}`,
        [`${scope}/engawa-react`]: "0.1.0",
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

    const discoveryPkg = JSON.parse(
      await readFile(
        join(smokeDir, "node_modules/@thierry-gilgen-ict/engawa-discovery/package.json"),
        "utf8",
      ),
    );
    const mcpPkg = JSON.parse(
      await readFile(
        join(smokeDir, "node_modules/@thierry-gilgen-ict/engawa-mcp/package.json"),
        "utf8",
      ),
    );

    const discoveryCoreDep = discoveryPkg.dependencies?.[`${scope}/engawa-core`];
    const mcpCoreDep = mcpPkg.dependencies?.[`${scope}/engawa-core`];

    if (!discoveryCoreDep || discoveryCoreDep.startsWith("workspace:")) {
      throw new Error(
        `engawa-discovery still has workspace: dependency: ${discoveryCoreDep ?? "missing"}`,
      );
    }
    if (!mcpCoreDep || mcpCoreDep.startsWith("workspace:")) {
      throw new Error(`engawa-mcp still has workspace: dependency: ${mcpCoreDep ?? "missing"}`);
    }

    const smokeCode = `
import {
  createEngawa,
  StaticContentAdapter,
  validateEngawaConfig,
} from "${scope}/engawa-core";
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
  metadata: { version: "0.1.1" },
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

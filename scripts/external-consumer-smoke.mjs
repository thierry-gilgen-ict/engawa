/**
 * External npm consumer smoke test.
 * Installs published packages from registry.npmjs.org in an isolated temp project.
 * Does NOT use the Engawa pnpm workspace.
 *
 * Usage: node scripts/external-consumer-smoke.mjs [version]
 * Default version: 0.1.0 (registry packages until 0.1.1 is published)
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

const version = process.argv[2] ?? "0.1.0";
const scope = "@thierry-gilgen-ict";

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "engawa-external-smoke-"));
  try {
    const pkg = {
      name: "engawa-external-smoke",
      private: true,
      type: "module",
      dependencies: {
        [`${scope}/engawa-core`]: version,
        [`${scope}/engawa-discovery`]: version,
        [`${scope}/engawa-mcp`]: version,
        [`${scope}/engawa-react`]: "0.1.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
    };

    await import("node:fs/promises").then((fs) =>
      fs.writeFile(join(dir, "package.json"), JSON.stringify(pkg, null, 2)),
    );

    execSync("npm install --no-package-lock", {
      cwd: dir,
      stdio: "inherit",
      env: { ...process.env, npm_config_registry: "https://registry.npmjs.org" },
    });

    const smokePath = join(dir, "smoke.mjs");
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
    name: "Smoke",
    canonicalUrl: "https://example.com",
    description: "External consumer smoke",
    language: "en",
  },
  agentInterface: { enabled: true, public: true },
  security: { publicDefault: "read-only" },
  metadata: { version: "${version}" },
});

const adapter = new StaticContentAdapter(config.site.canonicalUrl, [
  { id: "about", title: "About", content: "# About", path: "/about.md" },
]);

const engawa = createEngawa(config, adapter);
const resources = await engawa.listResources();
if (resources.length < 1) throw new Error("no resources");

const llms = generateLlmsTxt(engawa.config, resources);
if (!llms.includes("Smoke")) throw new Error("llms.txt missing site name");

const server = await createEngawaPublicMcpServer(engawa);
if (!server) throw new Error("mcp server missing");

if (typeof AskYourAgent !== "function") throw new Error("react export missing");

console.log("ENGAWA_EXTERNAL_CONSUMER_SMOKE = PASS");
`;
    await import("node:fs/promises").then((fs) => fs.writeFile(smokePath, smokeCode));

    execSync("node smoke.mjs", { cwd: dir, stdio: "inherit" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

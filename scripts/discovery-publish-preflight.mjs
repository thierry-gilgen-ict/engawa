/**
 * engawa-discovery pre-publication registry gate.
 * Run immediately before npm publish — not in CI. Fails if the source discovery
 * version is already on the registry or the required core version is missing.
 *
 * Usage: node scripts/discovery-publish-preflight.mjs
 *        pnpm smoke:discovery-publish-preflight
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const scope = "@thierry-gilgen-ict";
const scopeCore = `${scope}/engawa-core`;
const scopeDiscovery = `${scope}/engawa-discovery`;

const discoveryVersion = JSON.parse(
  readFileSync(join(root, "packages/discovery/package.json"), "utf8"),
).version;
const coreVersion = JSON.parse(
  readFileSync(join(root, "packages/core/package.json"), "utf8"),
).version;

const npmEnv = { ...process.env, npm_config_registry: "https://registry.npmjs.org" };

function expectRegistryMissing(packageSpec) {
  try {
    const out = execSync(`npm view ${packageSpec} version`, {
      encoding: "utf8",
      env: npmEnv,
    }).trim();
    throw new Error(`Expected E404 for ${packageSpec}, found version ${out}`);
  } catch (err) {
    const combined = `${err.stderr ?? ""}${err.message ?? ""}`;
    if (!/E404|404 Not Found|is not in this registry/i.test(combined)) {
      throw new Error(`Expected E404 for ${packageSpec}: ${combined}`);
    }
  }
}

function expectRegistryVersion(packageSpec, version) {
  const out = execSync(`npm view ${packageSpec} version`, {
    encoding: "utf8",
    env: npmEnv,
  }).trim();
  if (out !== version) {
    throw new Error(
      `Registry version mismatch for ${packageSpec}: expected ${version}, got ${out}`,
    );
  }
}

console.log(`DISCOVERY_SOURCE_VERSION = ${discoveryVersion}`);
console.log(`CORE_REQUIRED_VERSION = ${coreVersion}`);

expectRegistryMissing(`${scopeDiscovery}@${discoveryVersion}`);
expectRegistryVersion(`${scopeCore}@${coreVersion}`, coreVersion);

console.log("ENGAWA_DISCOVERY_PUBLISH_PREFLIGHT = PASS");

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
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const root = process.cwd();
const scope = "@thierry-gilgen-ict";
const scopeCore = `${scope}/engawa-core`;
const scopeDiscovery = `${scope}/engawa-discovery`;

const npmEnv = { ...process.env, npm_config_registry: "https://registry.npmjs.org" };

function defaultViewVersion(packageSpec) {
  return execSync(`npm view ${packageSpec} version`, {
    encoding: "utf8",
    env: npmEnv,
  }).trim();
}

function isNpmNotFoundError(err) {
  const combined = `${err.stderr ?? ""}${err.message ?? ""}${err.stdout ?? ""}`;
  return /E404|404 Not Found|is not in this registry/i.test(combined);
}

/**
 * Assert the package version is not on the registry.
 * @param {string} packageSpec
 * @param {(spec: string) => string} [viewVersion]
 */
export function expectRegistryMissing(packageSpec, viewVersion = defaultViewVersion) {
  let out;
  try {
    out = viewVersion(packageSpec);
  } catch (err) {
    if (isNpmNotFoundError(err)) {
      return;
    }
    const combined = `${err.stderr ?? ""}${err.message ?? ""}`;
    throw new Error(`Registry lookup failed for ${packageSpec}: ${combined}`);
  }
  throw new Error(`Expected unpublished package, found version ${out}`);
}

function expectRegistryVersion(packageSpec, version) {
  const out = defaultViewVersion(packageSpec);
  if (out !== version) {
    throw new Error(
      `Registry version mismatch for ${packageSpec}: expected ${version}, got ${out}`,
    );
  }
}

function main() {
  const discoveryVersion = JSON.parse(
    readFileSync(join(root, "packages/discovery/package.json"), "utf8"),
  ).version;
  const coreVersion = JSON.parse(
    readFileSync(join(root, "packages/core/package.json"), "utf8"),
  ).version;

  console.log(`DISCOVERY_SOURCE_VERSION = ${discoveryVersion}`);
  console.log(`CORE_REQUIRED_VERSION = ${coreVersion}`);

  expectRegistryMissing(`${scopeDiscovery}@${discoveryVersion}`);
  expectRegistryVersion(`${scopeCore}@${coreVersion}`, coreVersion);

  console.log("ENGAWA_DISCOVERY_PUBLISH_PREFLIGHT = PASS");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

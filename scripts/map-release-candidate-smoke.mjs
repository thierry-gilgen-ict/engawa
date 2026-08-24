/**
 * engawa-map release-candidate pack smoke (DM3B).
 * Packs @thierry-gilgen-ict/engawa-map without npm publish.
 */
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const scope = "@thierry-gilgen-ict/engawa-map";
const mapDir = join(root, "packages/map");

const REQUIRED_TARBALL_PATHS = [
  "package.json",
  "README.md",
  "LICENSE",
  "dist/cli.js",
  "dist/index.js",
  "dist/index.d.ts",
];

const FORBIDDEN_TARBALL_PATTERNS = [
  /\.test\.js$/,
  /\.test\.js\.map$/,
  /\.test\.d\.ts$/,
  /\.test\.d\.ts\.map$/,
  /test-helpers/,
];

function listTarballEntries(tarballPath) {
  const listing = execSync(`tar -tzf "${tarballPath}"`, { encoding: "utf8" });
  return listing
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^package\//, ""));
}

function verifyTarballContents(tarballPath) {
  const entries = listTarballEntries(tarballPath);

  for (const required of REQUIRED_TARBALL_PATHS) {
    if (!entries.includes(required)) {
      throw new Error(`Required tarball entry missing: ${required}`);
    }
  }

  for (const entry of entries) {
    for (const pattern of FORBIDDEN_TARBALL_PATTERNS) {
      if (pattern.test(entry)) {
        throw new Error(`Forbidden test artifact in tarball: ${entry}`);
      }
    }
  }

  console.log("MAP_RC_RUNTIME_FILES_PRESENT = YES");
  console.log("MAP_RC_TEST_ARTIFACTS_INCLUDED = NO");
}

async function main() {
  if (!existsSync(join(mapDir, "dist/cli.js"))) {
    console.error("Run pnpm build first");
    process.exit(1);
  }

  const packDir = await mkdtemp(join(tmpdir(), "engawa-map-pack-"));
  try {
    execSync(`pnpm pack --pack-destination "${packDir}"`, { cwd: mapDir, stdio: "inherit" });

    const pkgJson = JSON.parse(readFileSync(join(mapDir, "package.json"), "utf8"));
    const tarballName = `thierry-gilgen-ict-engawa-map-${pkgJson.version}.tgz`;
    const tarballPath = join(packDir, tarballName);
    if (!existsSync(tarballPath)) {
      throw new Error(`Expected tarball missing: ${tarballPath}`);
    }
    if (pkgJson.version !== "0.1.0") {
      throw new Error(`Unexpected map version: ${pkgJson.version}`);
    }

    verifyTarballContents(tarballPath);

    const smokeDir = await mkdtemp(join(tmpdir(), "engawa-map-rc-smoke-"));
    try {
      await writeFile(
        join(smokeDir, "package.json"),
        JSON.stringify({
          name: "engawa-map-rc-consumer",
          private: true,
          type: "module",
          dependencies: { [scope]: `file:${tarballPath}` },
        }),
        "utf8",
      );

      execSync("npm install --no-package-lock", {
        cwd: smokeDir,
        stdio: "inherit",
        env: { ...process.env, npm_config_registry: "https://registry.npmjs.org" },
      });

      const installed = JSON.parse(
        await readFile(join(smokeDir, "node_modules", scope, "package.json"), "utf8"),
      );
      if (installed.version !== "0.1.0") {
        throw new Error(`installed version mismatch: ${installed.version}`);
      }
      if (!existsSync(join(smokeDir, "node_modules", scope, "dist/cli.js"))) {
        throw new Error("dist/cli.js missing from packed artifact");
      }

      const smokeCode = `
import { DEFAULT_REGISTRY_ENDPOINT, resolveRegistryEndpoint } from "${scope}";
if (DEFAULT_REGISTRY_ENDPOINT !== "https://engawa-map.thierry-gilgen-ict.ch") {
  throw new Error("DEFAULT_REGISTRY_ENDPOINT mismatch");
}
if (resolveRegistryEndpoint() !== DEFAULT_REGISTRY_ENDPOINT) {
  throw new Error("resolveRegistryEndpoint default mismatch");
}
console.log("ENGAWA_MAP_RELEASE_CANDIDATE_PACK_SMOKE = PASS");
`;
      await writeFile(join(smokeDir, "smoke.mjs"), smokeCode, "utf8");
      const smokeEnv = { ...process.env, npm_config_registry: "https://registry.npmjs.org" };
      delete smokeEnv.ENGAWA_MAP_ENDPOINT;
      execSync("node smoke.mjs", { cwd: smokeDir, stdio: "inherit", env: smokeEnv });
      console.log("MAP_RC_PACK_INSTALL_SMOKE = PASS");
    } finally {
      await rm(smokeDir, { recursive: true, force: true });
    }
  } finally {
    await rm(packDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

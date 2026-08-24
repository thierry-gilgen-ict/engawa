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
      execSync("node smoke.mjs", { cwd: smokeDir, stdio: "inherit" });
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

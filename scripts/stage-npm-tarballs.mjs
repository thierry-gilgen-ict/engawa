/**
 * Stage discovery/mcp packages for npm publish tarballs.
 * Rewrites workspace:* @thierry-gilgen-ict/engawa-core to the published core semver
 * from packages/core/package.json before packing.
 * Run from engawa root after pnpm build.
 *
 * Usage:
 *   node scripts/stage-npm-tarballs.mjs              # core + discovery + mcp (default)
 *   node scripts/stage-npm-tarballs.mjs --discovery-only  # discovery tarball only
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const staging = join(root, ".npm-staging");
const scopeCore = "@thierry-gilgen-ict/engawa-core";
const discoveryOnly = process.argv.includes("--discovery-only");

function expectedTarballName(name, version) {
  return `${name.replace("@", "").replace("/", "-")}-${version}.tgz`;
}

function cleanTarballsInDir(dir) {
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".tgz")) {
      rmSync(join(dir, file), { force: true });
    }
  }
}

function cleanReleaseArtifacts() {
  cleanTarballsInDir(join(root, "packages/core"));
  cleanTarballsInDir(join(root, "packages/react"));
  for (const name of ["discovery", "mcp"]) {
    const dest = join(staging, name);
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true, force: true });
    }
  }
}

function cleanDiscoveryOnlyArtifacts() {
  const dest = join(staging, "discovery");
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
}

function assertTarballExists(dir, name, version) {
  const filename = expectedTarballName(name, version);
  const path = join(dir, filename);
  if (!existsSync(path)) {
    throw new Error(`Expected tarball missing: ${path}`);
  }
  return path;
}

function isPublishDistEntry(name) {
  return !/\.test\.(js|d\.ts)(\.map)?$/.test(name);
}

function copyPublishDist(srcDist, destDist) {
  mkdirSync(destDist, { recursive: true });
  for (const entry of readdirSync(srcDist)) {
    if (!isPublishDistEntry(entry)) continue;
    const srcPath = join(srcDist, entry);
    const destPath = join(destDist, entry);
    if (statSync(srcPath).isDirectory()) {
      copyPublishDist(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

function stagePackage(name, coreVersion) {
  const src = join(root, "packages", name);
  const dest = join(staging, name);
  mkdirSync(dest, { recursive: true });
  copyPublishDist(join(src, "dist"), join(dest, "dist"));
  cpSync(join(src, "README.md"), join(dest, "README.md"));
  if (existsSync(join(src, "LICENSE"))) {
    cpSync(join(src, "LICENSE"), join(dest, "LICENSE"));
  }
  const pkg = JSON.parse(readFileSync(join(src, "package.json"), "utf8"));
  if (pkg.dependencies?.[scopeCore]?.startsWith("workspace:")) {
    pkg.dependencies[scopeCore] = coreVersion;
  }
  delete pkg.scripts;
  writeFileSync(join(dest, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  execSync("npm pack", { cwd: dest, stdio: "inherit" });
  return assertTarballExists(dest, pkg.name, pkg.version);
}

const corePkg = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8"));
const coreVersion = corePkg.version;

if (discoveryOnly) {
  if (!existsSync(join(root, "packages/discovery/dist/index.js"))) {
    console.error("Run pnpm build first");
    process.exit(1);
  }

  cleanDiscoveryOnlyArtifacts();
  mkdirSync(staging, { recursive: true });

  const discoveryTarball = stagePackage("discovery", coreVersion);
  const discoveryStaged = JSON.parse(readFileSync(join(staging, "discovery/package.json"), "utf8"));

  console.log("Discovery-only tarball ready:");
  console.log(`  discovery: ${discoveryTarball}`);
  console.log("Verification summary:");
  console.log(`  discovery version: ${discoveryStaged.version}`);
  console.log(`  discovery ${scopeCore} dep: ${discoveryStaged.dependencies[scopeCore]}`);
} else {
  if (!existsSync(join(root, "packages/core/dist/index.js"))) {
    console.error("Run pnpm build first");
    process.exit(1);
  }

  cleanReleaseArtifacts();
  mkdirSync(staging, { recursive: true });

  execSync("npm pack", { cwd: join(root, "packages/core"), stdio: "inherit" });
  const coreTarball = assertTarballExists(join(root, "packages/core"), corePkg.name, coreVersion);

  const discoveryTarball = stagePackage("discovery", coreVersion);
  const mcpTarball = stagePackage("mcp", coreVersion);

  if (existsSync(join(root, "packages/react/dist/index.js"))) {
    execSync("npm pack", { cwd: join(root, "packages/react"), stdio: "inherit" });
  }

  const discoveryStaged = JSON.parse(readFileSync(join(staging, "discovery/package.json"), "utf8"));
  const mcpStaged = JSON.parse(readFileSync(join(staging, "mcp/package.json"), "utf8"));

  console.log("Tarballs ready:");
  console.log(`  core: ${coreTarball}`);
  console.log(`  discovery: ${discoveryTarball}`);
  console.log(`  mcp: ${mcpTarball}`);
  console.log("Verification summary:");
  console.log(`  core version: ${coreVersion}`);
  console.log(`  discovery ${scopeCore} dep: ${discoveryStaged.dependencies[scopeCore]}`);
  console.log(`  mcp ${scopeCore} dep: ${mcpStaged.dependencies[scopeCore]}`);
}

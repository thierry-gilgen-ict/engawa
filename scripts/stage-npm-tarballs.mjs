/**
 * Stage discovery/mcp packages for npm publish tarballs.
 * Rewrites workspace:* @thierry-gilgen-ict/engawa-core to the published core semver
 * from packages/core/package.json before packing.
 * Run from engawa root after pnpm build.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const staging = join(root, ".npm-staging");

function stagePackage(name) {
  const src = join(root, "packages", name);
  const dest = join(staging, name);
  mkdirSync(dest, { recursive: true });
  cpSync(join(src, "dist"), join(dest, "dist"), { recursive: true });
  cpSync(join(src, "README.md"), join(dest, "README.md"));
  if (existsSync(join(src, "LICENSE"))) {
    cpSync(join(src, "LICENSE"), join(dest, "LICENSE"));
  }
  const pkg = JSON.parse(readFileSync(join(src, "package.json"), "utf8"));
  if (pkg.dependencies?.["@thierry-gilgen-ict/engawa-core"]?.startsWith("workspace:")) {
    const corePkg = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8"));
    pkg.dependencies["@thierry-gilgen-ict/engawa-core"] = corePkg.version;
  }
  delete pkg.scripts;
  writeFileSync(join(dest, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  execSync("npm pack", { cwd: dest, stdio: "inherit" });
}

if (!existsSync(join(root, "packages/core/dist/index.js"))) {
  console.error("Run pnpm build first");
  process.exit(1);
}

mkdirSync(staging, { recursive: true });
execSync("npm pack", { cwd: join(root, "packages/core"), stdio: "inherit" });
stagePackage("discovery");
stagePackage("mcp");

if (existsSync(join(root, "packages/react/dist/index.js"))) {
  execSync("npm pack", { cwd: join(root, "packages/react"), stdio: "inherit" });
}

const corePkg = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8"));
const discoveryStaged = JSON.parse(readFileSync(join(staging, "discovery/package.json"), "utf8"));
const mcpStaged = JSON.parse(readFileSync(join(staging, "mcp/package.json"), "utf8"));

console.log("Tarballs ready in packages/core, packages/react and .npm-staging/*/");
console.log("Verification summary:");
console.log(`  core version: ${corePkg.version}`);
console.log(
  `  discovery @thierry-gilgen-ict/engawa-core dep: ${discoveryStaged.dependencies["@thierry-gilgen-ict/engawa-core"]}`,
);
console.log(
  `  mcp @thierry-gilgen-ict/engawa-core dep: ${mcpStaged.dependencies["@thierry-gilgen-ict/engawa-core"]}`,
);

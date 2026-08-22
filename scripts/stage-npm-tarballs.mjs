/**
 * Stage discovery/mcp packages with 0.1.0 semver deps for npm publish tarballs.
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
  const pkg = JSON.parse(readFileSync(join(src, "package.json"), "utf8"));
  if (pkg.dependencies?.["@thierry-gilgen-ict/engawa-core"]?.startsWith("workspace:")) {
    pkg.dependencies["@thierry-gilgen-ict/engawa-core"] = "0.1.0";
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

console.log("Tarballs ready in packages/core and .npm-staging/*/");

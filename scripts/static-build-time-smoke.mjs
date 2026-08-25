/**
 * Smoke test for examples/static-build-time-site build-time extraction.
 * Runs entirely locally — no network.
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const exampleRoot = join(repoRoot, "examples/static-build-time-site");
const SENTINEL = "ENGAWA_PRIVATE_SENTINEL_DO_NOT_PUBLISH";

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function copyFixtureToTemp() {
  const dir = mkdtempSync(join(tmpdir(), "static-build-smoke-"));
  cpSync(join(exampleRoot, "html"), join(dir, "html"), { recursive: true });
  cpSync(join(exampleRoot, "engawa.manifest.json"), join(dir, "engawa.manifest.json"));
  return dir;
}

function runExtract(tempRoot) {
  execSync("node dist/build.js", {
    cwd: exampleRoot,
    stdio: "inherit",
    env: { ...process.env, STATIC_BUILD_ROOT: tempRoot },
  });
}

const temp = copyFixtureToTemp();
runExtract(temp);

const manifestPath = join(temp, "generated/engawa/resources.json");
const llmsPath = join(temp, "dist/llms.txt");
const servicesMd = join(temp, "dist/services.md");

for (const path of [manifestPath, llmsPath, servicesMd]) {
  if (!existsSync(path)) {
    console.error(`Missing expected output: ${path}`);
    process.exit(1);
  }
}

const manifestText = readFileSync(manifestPath, "utf8");
const llmsText = readFileSync(llmsPath, "utf8");
const servicesText = readFileSync(servicesMd, "utf8");

if (
  manifestText.includes(SENTINEL) ||
  llmsText.includes(SENTINEL) ||
  servicesText.includes(SENTINEL)
) {
  console.error("Private sentinel leaked into generated output");
  process.exit(1);
}

if (!servicesText.includes("Original service sentence")) {
  console.error("Expected services markdown content missing");
  process.exit(1);
}

const hash1 = hashFile(manifestPath);
const hash2 = hashFile(llmsPath);
runExtract(temp);
if (hashFile(manifestPath) !== hash1 || hashFile(llmsPath) !== hash2) {
  console.error("Deterministic rebuild failed in smoke");
  process.exit(1);
}

console.log("static-build-time smoke: PASS");

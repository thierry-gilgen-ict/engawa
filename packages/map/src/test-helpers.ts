// @vitest-environment node
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ENGAWA_PACKAGE_NAMES } from "./constants.js";

export async function createTestProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "engawa-map-test-"));
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "map-test-project",
        private: true,
        dependencies: Object.fromEntries(ENGAWA_PACKAGE_NAMES.map((name) => [name, "0.1.1"])),
      },
      null,
      2,
    ),
    "utf8",
  );

  for (const packageName of ENGAWA_PACKAGE_NAMES) {
    const pkgDir = join(dir, "node_modules", packageName);
    await mkdir(pkgDir, { recursive: true });
    await writeFile(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: packageName, version: "0.1.1" }, null, 2),
      "utf8",
    );
  }

  await writeFile(
    join(dir, "engawa-map.config.json"),
    JSON.stringify(
      {
        displayName: "Test Site",
        canonicalUrl: "https://example.com",
        hints: { framework: "nextjs", byaEnabled: true, localeCount: 2 },
      },
      null,
      2,
    ),
    "utf8",
  );

  await writeFile(join(dir, ".gitignore"), "node_modules/\n", "utf8");
  return dir;
}

export async function readLocalStateFile(projectRoot: string): Promise<unknown> {
  const raw = await readFile(join(projectRoot, ".engawa-map.local.json"), "utf8");
  return JSON.parse(raw) as unknown;
}

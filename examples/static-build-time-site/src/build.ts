import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runExtractAsync } from "./extract.js";

const projectRoot = process.env.STATIC_BUILD_ROOT
  ? resolve(process.env.STATIC_BUILD_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  const result = await runExtractAsync(projectRoot);
  console.log(
    `Engawa static build-time extraction complete: ${result.resources.length} resources → ${result.outputRoot}`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Engawa extraction failed: ${message}`);
  process.exitCode = 1;
}

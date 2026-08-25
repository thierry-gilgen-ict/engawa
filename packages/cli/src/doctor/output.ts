import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { DoctorError } from "../errors.js";
import type { EngawaDoctorReport } from "./types.js";
import { formatDoctorMarkdownReport } from "./format-markdown.js";

export async function writeDoctorOutput(
  report: EngawaDoctorReport,
  outputPath: string,
): Promise<void> {
  const lower = outputPath.toLowerCase();
  if (!lower.endsWith(".json") && !lower.endsWith(".md")) {
    throw new DoctorError("--output must use .json or .md extension");
  }
  if (existsSync(outputPath)) {
    throw new DoctorError(`Output file already exists: ${outputPath}`);
  }
  if (lower.endsWith(".json")) {
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  } else {
    await writeFile(outputPath, `${formatDoctorMarkdownReport(report)}\n`, "utf8");
  }
}

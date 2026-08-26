/**
 * Local-only aggregator for Engawa agent-surface observation NDJSON.
 * Reads a file path argument or stdin. NETWORK_CALLS = NONE.
 *
 * Usage:
 *   node examples/observability/analyze.mjs examples/observability/fixtures/agent-surface-requests.ndjson
 *   cat fixtures/agent-surface-requests.ndjson | node examples/observability/analyze.mjs
 */
import { readFileSync } from "node:fs";
import { stdin } from "node:process";

function readInput() {
  const pathArg = process.argv[2];
  if (pathArg) {
    return readFileSync(pathArg, "utf8");
  }
  return readFileSync(stdin.fd, "utf8");
}

function parseRecords(raw) {
  const records = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    records.push(JSON.parse(trimmed));
  }
  return records;
}

function countBy(records, key) {
  const counts = new Map();
  for (const r of records) {
    const value = String(r[key] ?? "");
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function printSection(title, rows) {
  console.log(title);
  for (const [value, n] of rows) {
    console.log(`  ${n}\t${value || "(empty)"}`);
  }
  console.log("");
}

const records = parseRecords(readInput());
console.log(`RECORDS = ${records.length}`);
console.log("");
printSection("BY_SURFACE", countBy(records, "surface"));
printSection("BY_STATUS", countBy(records, "status"));
printSection("BY_PATH", countBy(records, "path"));
printSection("BY_USER_AGENT", countBy(records, "user_agent"));
printSection("BY_ACCEPT", countBy(records, "accept"));

const llms = records.filter((r) => r.path === "/llms.txt").length;
const markdown = records.filter((r) => r.surface === "MARKDOWN").length;
const mcp = records.filter((r) => r.surface === "MCP").length;
console.log(`COUNT_LLMS_TXT_PATH = ${llms}`);
console.log(`COUNT_MARKDOWN_SURFACE = ${markdown}`);
console.log(`COUNT_MCP_SURFACE = ${mcp}`);
console.log("NETWORK_CALLS = NONE");

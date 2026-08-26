// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const docPath = join(root, "docs/observability.md");
const fixturePath = join(root, "examples/observability/fixtures/agent-surface-requests.ndjson");
const analyzePath = join(root, "examples/observability/analyze.mjs");

const FORBIDDEN_LOG_KEYS = [
  "prompt",
  "body",
  "request_body",
  "response_body",
  "cookie",
  "cookies",
  "authorization",
  "auth",
  "session",
  "session_id",
  "user_id",
  "ip",
  "query",
  "search",
];

describe("observability recipe", () => {
  it("canonical doc and example exist", () => {
    expect(existsSync(docPath)).toBe(true);
    expect(existsSync(fixturePath)).toBe(true);
    expect(existsSync(analyzePath)).toBe(true);
    expect(existsSync(join(root, "examples/observability/README.md"))).toBe(true);
  });

  it("locks operator-local invariants and surface schema", () => {
    const doc = readFileSync(docPath, "utf8");
    expect(doc).toMatch(/ENGAWA_RUNTIME_PHONE_HOME\s*=\s*NO/);
    expect(doc).toMatch(/MCP_REQUEST_BODY_LOGGING\s*=\s*NO/);
    expect(doc).toMatch(
      /USER_AGENT\s*==\s*MODEL_CONSUMPTION\s*=\s*NEVER|USER_AGENT == MODEL_CONSUMPTION/,
    );
    expect(doc).toMatch(/OBSERVED_REQUEST/);
    expect(doc).toMatch(/DECLARED_USER_AGENT/);
    expect(doc).toMatch(/Do \*\*not\*\* introduce:[\s\S]*`engawa-analytics`/);
    expect(doc).not.toMatch(/npm install.*engawa-analytics/i);
    expect(doc).toContain("LLMS_TXT");
    expect(doc).toContain("MARKDOWN");
    expect(doc).toContain("MCP");
    expect(doc).toContain("CANONICAL_HTML");
    expect(doc).toContain("OTHER");
    for (const field of [
      "timestamp",
      "surface",
      "method",
      "path",
      "status",
      "bytes",
      "duration_ms",
      "accept",
      "user_agent",
    ]) {
      expect(doc).toContain(field);
    }
  });

  it("fixtures omit sensitive fields", () => {
    const raw = readFileSync(fixturePath, "utf8");
    for (const line of raw.split(/\r?\n/).filter(Boolean)) {
      const obj = JSON.parse(line);
      for (const key of Object.keys(obj)) {
        expect(FORBIDDEN_LOG_KEYS).not.toContain(key.toLowerCase());
      }
      expect(obj).toHaveProperty("surface");
      expect(obj).toHaveProperty("path");
      expect(obj).toHaveProperty("user_agent");
      expect(obj).not.toHaveProperty("body");
      expect(obj).not.toHaveProperty("query");
    }
  });

  it("nginx example preserves native duration unit and documents ms conversion", () => {
    const doc = readFileSync(docPath, "utf8");
    expect(doc).toContain("duration_ms");
    expect(doc).not.toContain('"duration_ms":$request_time');
    expect(doc).toContain('"duration_seconds":$request_time');
    expect(doc).toMatch(/\$request_time.*seconds|seconds.*\$request_time/i);
    expect(doc).toMatch(/duration_seconds\s*\*\s*1000|1000.*duration_ms/i);
  });

  it("analyze.mjs is local-only and aggregates fixture surfaces", () => {
    const source = readFileSync(analyzePath, "utf8");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/from ["']node:http["']/);
    expect(source).not.toMatch(/from ["']node:https["']/);
    expect(source).not.toMatch(/from ["']node:net["']/);
    expect(source).not.toMatch(/https?:\/\//);

    const out = execFileSync(process.execPath, [analyzePath, fixturePath], {
      encoding: "utf8",
      cwd: root,
    });
    expect(out).toContain("COUNT_LLMS_TXT_PATH = 3");
    expect(out).toContain("COUNT_MARKDOWN_SURFACE = 3");
    expect(out).toContain("COUNT_MCP_SURFACE = 2");
    expect(out).toContain("NETWORK_CALLS = NONE");
  });

  it("docs index and roadmap link the recipe", () => {
    const index = readFileSync(join(root, "docs/README.md"), "utf8");
    expect(index).toContain("observability.md");
    const roadmap = readFileSync(join(root, "docs/roadmap.md"), "utf8");
    expect(roadmap).toMatch(/Observability recipe.*implemented/i);
    expect(roadmap).toContain("observability.md");
  });
});

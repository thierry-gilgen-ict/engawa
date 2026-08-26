// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const docPath = join(root, "docs/third-reference-static-sme.md");
const roadmapPath = join(root, "docs/roadmap.md");

describe("third-reference static SME qualification", () => {
  it("canonical qualification doc exists", () => {
    expect(existsSync(docPath)).toBe(true);
  });

  it("locks extraction and crawling invariants", () => {
    const doc = readFileSync(docPath, "utf8");
    expect(doc).toContain("RUNTIME_CRAWLING = NO");
    expect(doc).toContain("BUILD_TIME_EXTRACTION = YES");
    expect(doc).toContain("HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE");
    expect(doc).toContain("ROUTE_ALLOWLIST = YES");
    expect(doc).toContain("PRIVATE_ROUTE_EXCLUSION = BEFORE_PUBLICATION");
    expect(doc).toContain("DECISION = NEEDS_CANDIDATE");
    expect(doc).toContain("REFERENCE_3_CANDIDATE = NONE_CONFIRMED");
    expect(doc).toContain("PRODUCTION_INTEGRATION_STARTED = NO");
    expect(doc).toContain("NEW_ENGAWA_PACKAGE = NO");
    expect(doc).toMatch(/Do \*\*not\*\*:[\s\S]*engawa-static/);
    expect(doc).toMatch(/Create a new Engawa package/);
  });

  it("roadmap does not falsely mark Reference 3 production complete", () => {
    const roadmap = readFileSync(roadmapPath, "utf8");
    expect(roadmap).toContain("third-reference-static-sme.md");
    expect(roadmap).toMatch(/qualification complete/i);
    expect(roadmap).toMatch(/integration pending/i);
    expect(roadmap).toMatch(/NEEDS_CANDIDATE/);
    expect(roadmap).toMatch(/do not treat as Reference 3 complete/i);
    expect(roadmap).not.toMatch(/Reference 3 (implemented|live)/i);
    expect(roadmap).not.toMatch(/third production reference[^*]*implemented/i);
  });
});

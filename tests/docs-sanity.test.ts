import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredDocs = [
  "AGENTS.md",
  "docs/integrating-an-existing-site.md",
  "docs/integration-acceptance.md",
  "docs/agent-integration-playbook.md",
  "docs/upgrading.md",
  "docs/compatibility.md",
  "docs/migrations/README.md",
  "docs/prompts/integrate-engawa.md",
  "docs/prompts/upgrade-engawa.md",
];

describe("documentation sanity", () => {
  it("required onboarding and upgrade docs exist", () => {
    for (const path of requiredDocs) {
      expect(existsSync(join(root, path)), `missing ${path}`).toBe(true);
    }
  });

  it("README links to key onboarding paths", () => {
    const readme = readFileSync(join(root, "README.md"), "utf8");
    expect(readme).toContain("docs/integrating-an-existing-site.md");
    expect(readme).toContain("docs/agent-integration-playbook.md");
    expect(readme).toContain("docs/upgrading.md");
    expect(readme).toContain("docs/compatibility.md");
    expect(readme).toContain("AGENTS.md");
  });

  it("docs/README links to key paths", () => {
    const index = readFileSync(join(root, "docs/README.md"), "utf8");
    expect(index).toContain("integrating-an-existing-site.md");
    expect(index).toContain("agent-integration-playbook.md");
    expect(index).toContain("upgrading.md");
    expect(index).toContain("compatibility.md");
  });

  it("compatibility.md documents current tested package set", () => {
    const compat = readFileSync(join(root, "docs/compatibility.md"), "utf8");
    expect(compat).toContain("ENGAWA_RELEASE_SET = 2026-08-v0.1.1");
    expect(compat).toContain("@thierry-gilgen-ict/engawa-core");
    expect(compat).toContain("| 0.1.1");
    expect(compat).toContain("@thierry-gilgen-ict/engawa-react");
    expect(compat).toContain("| 0.1.0");
  });

  it("README quick start pins core/discovery/mcp to 0.1.1 not 0.1.0", () => {
    const readme = readFileSync(join(root, "README.md"), "utf8");
    const installBlock = readme.match(/npm install[\s\S]*?engawa-mcp@[\d.]+/);
    expect(installBlock).not.toBeNull();
    const block = installBlock![0];
    expect(block).toContain("engawa-core@0.1.1");
    expect(block).toContain("engawa-discovery@0.1.1");
    expect(block).toContain("engawa-mcp@0.1.1");
    expect(block).not.toMatch(/engawa-core@0\.1\.0/);
    expect(block).not.toMatch(/engawa-discovery@0\.1\.0/);
    expect(block).not.toMatch(/engawa-mcp@0\.1\.0/);
  });
});

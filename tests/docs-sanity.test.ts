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

  it("integrate prompt uses canonical Engawa GitHub URLs", () => {
    const prompt = readFileSync(join(root, "docs/prompts/integrate-engawa.md"), "utf8");
    expect(prompt).toContain("https://github.com/thierry-gilgen-ict/engawa");
    expect(prompt).toContain("ENGAWA_CANONICAL_DOCS_UNAVAILABLE");
    expect(prompt).not.toContain("vendored copy");
  });

  it("upgrade prompt uses canonical Engawa GitHub URLs", () => {
    const prompt = readFileSync(join(root, "docs/prompts/upgrade-engawa.md"), "utf8");
    expect(prompt).toContain("https://github.com/thierry-gilgen-ict/engawa");
    expect(prompt).toContain("ENGAWA_CANONICAL_DOCS_UNAVAILABLE");
  });

  it("existing-site guide documents ContentAdapter search()", () => {
    const guide = readFileSync(join(root, "docs/integrating-an-existing-site.md"), "utf8");
    expect(guide).toContain("EngawaResource");
    expect(guide).toMatch(/async search\(query/);
    expect(guide).toContain("search_site");
  });

  it("acceptance and playbook forbid production PASS with missing host/rate limit", () => {
    const acceptance = readFileSync(join(root, "docs/integration-acceptance.md"), "utf8");
    const playbook = readFileSync(join(root, "docs/agent-integration-playbook.md"), "utf8");
    expect(acceptance).toContain("NOT_APPLICABLE_DEV_ONLY");
    expect(acceptance).toContain("PRODUCTION_SECURITY_UNKNOWN_OR_MISSING");
    expect(playbook).toContain("NOT_APPLICABLE_DEV_ONLY");
    expect(playbook).toContain("PRODUCTION_SECURITY_UNKNOWN_OR_MISSING");
    expect(playbook).toContain("PASS_EDGE");
  });

  it("CHANGELOG compare link uses v0.1.0 baseline not engawa-core-v0.1.0", () => {
    const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
    expect(changelog).toContain("v0.1.0...engawa-core-v0.1.1");
    expect(changelog).not.toContain("engawa-core-v0.1.0");
  });

  it("headless CMS integration docs exist and hub states key rules", () => {
    const headlessDocs = [
      "docs/integrations/headless-cms.md",
      "docs/integrations/headless-wordpress.md",
      "docs/integrations/strapi.md",
      "docs/integrations/sanity.md",
      "docs/integrations/contentful.md",
    ];
    for (const path of headlessDocs) {
      expect(existsSync(join(root, path)), `missing ${path}`).toBe(true);
    }

    const hub = readFileSync(join(root, "docs/integrations/headless-cms.md"), "utf8");
    expect(hub).toContain("HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE");
    expect(hub).toMatch(/CMS_PUBLISHED.*AUTOMATICALLY_ENGAWA_PUBLIC/i);
    expect(hub).toMatch(/SEARCH_CORPUS|search\(query\)|public corpus/i);
    expect(hub).toContain("content-publication.md");
    expect(hub).toContain("security-model.md");
    expect(hub).toContain("integrating-an-existing-site.md");

    const docsIndex = readFileSync(join(root, "docs/README.md"), "utf8");
    expect(docsIndex).toContain("headless-cms.md");
  });

  it("headless CMS recipes link to hub and emphasize human-route loaders", () => {
    const recipes = [
      "docs/integrations/headless-wordpress.md",
      "docs/integrations/strapi.md",
      "docs/integrations/sanity.md",
      "docs/integrations/contentful.md",
    ];
    for (const path of recipes) {
      const content = readFileSync(join(root, path), "utf8");
      expect(content).toContain("headless-cms.md");
      expect(content).toMatch(/HUMAN_PUBLIC_SOURCE|human.route|human-route|human routes/i);
    }

    const strapi = readFileSync(join(root, "docs/integrations/strapi.md"), "utf8");
    const sanity = readFileSync(join(root, "docs/integrations/sanity.md"), "utf8");
    expect(strapi).toMatch(/human.route|human-route|site loader|existing loader/i);
    expect(sanity).toMatch(/human.route|human-route|human routes|public.loader/i);

    const contentful = readFileSync(join(root, "docs/integrations/contentful.md"), "utf8");
    expect(contentful).toMatch(/switch Engawa to Preview API credentials/i);
    expect(contentful).toMatch(/Never use preview loader for public Engawa/i);
  });

  it("distribution map policy exists with opt-in and security boundaries", () => {
    expect(existsSync(join(root, "docs/distribution-map.md"))).toBe(true);

    const readme = readFileSync(join(root, "README.md"), "utf8");
    const docsIndex = readFileSync(join(root, "docs/README.md"), "utf8");
    expect(readme).toContain("distribution-map.md");
    expect(docsIndex).toContain("distribution-map.md");

    const policy = readFileSync(join(root, "docs/distribution-map.md"), "utf8");
    expect(policy).toMatch(/voluntary|opt.in|NOT_REGISTERED/i);
    expect(policy).toMatch(/phone home|telemetry|not telemetry/i);
    expect(policy).toMatch(/OUT_OF_BAND|out-of-band|MAP_REGISTRATION_FROM_RUNTIME/i);
    expect(policy).toMatch(/REGISTER_REQUEST_REMOTE_FETCH|must not.*fetch/i);

    const playbook = readFileSync(join(root, "docs/agent-integration-playbook.md"), "utf8");
    expect(playbook).toContain("DISTRIBUTION_MAP_REGISTRATION_REQUIRES_EXPLICIT_USER_REQUEST");
    expect(playbook).toMatch(/not.*auto.?register|never auto-register/i);

    const acceptance = readFileSync(join(root, "docs/integration-acceptance.md"), "utf8");
    expect(acceptance).toMatch(/NOT GATING|NOT_REQUESTED/i);
  });

  it("distribution map DM1A API contract and threat model exist with security rules", () => {
    expect(existsSync(join(root, "docs/distribution-map-api.md"))).toBe(true);
    expect(existsSync(join(root, "docs/distribution-map-threat-model.md"))).toBe(true);

    const api = readFileSync(join(root, "docs/distribution-map-api.md"), "utf8");
    expect(api).toMatch(/UNKNOWN_REQUEST_FIELDS.*REJECT|UNKNOWN_FIELDS.*REJECT/i);
    expect(api).toMatch(/PENDING/);
    expect(api).toMatch(/Bearer.*site-token|site-scoped|SITE_TOKEN_SCOPED/i);
    expect(api).toMatch(/IDEMPOTENCY_REQUIRED_FOR_REGISTER|Idempotency-Key/i);
    expect(api).toMatch(/API_REDIRECT_FOLLOWING.*NO|redirect.*error|FOLLOW_REDIRECTS.*NO/i);
    expect(api).toMatch(/ENGAWA_CI_REGISTRY_NETWORK.*NO|no live network/i);

    const threat = readFileSync(join(root, "docs/distribution-map-threat-model.md"), "utf8");
    expect(threat).toMatch(/ENGAWA_MAP_EXECUTES_APPLICATION_CODE.*NO|executes application code/i);
    expect(threat).toMatch(/malicious registry|Malicious registry/i);
    expect(threat).toMatch(/WWW_WRITE_API_FOR_MAP.*NO|WWW_RUNTIME_REGISTRY_CALL.*NO/i);
    expect(threat).toMatch(/WEBSITE_DEPENDENCY_ON_REGISTRY.*NONE|no runtime dependency/i);

    const policy = readFileSync(join(root, "docs/distribution-map.md"), "utf8");
    expect(policy).toContain("distribution-map-api.md");
    expect(policy).toContain("distribution-map-threat-model.md");

    expect(api).toMatch(/SITE_TOKEN_GENERATED_BY.*CLI/i);
    expect(api).toMatch(/IDEMPOTENCY_REPLAY_RETURNS_RAW_TOKEN.*NO/i);
    expect(api).toMatch(/UNREGISTER_REVOKES_SITE_TOKEN.*YES/i);
    expect(api).toMatch(/TOKEN_ROTATION_V1.*DEFERRED/i);
  });
});

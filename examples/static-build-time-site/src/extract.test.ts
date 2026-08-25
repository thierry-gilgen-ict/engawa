import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";
import { createEngawaFromExtractResult, resourceUriFor, runExtractAsync } from "./extract.js";
import { loadManifest } from "./manifest.js";
import { htmlMainToMarkdown } from "./html-to-markdown.js";
import { parse } from "node-html-parser";

const EXAMPLE_ROOT = resolve(import.meta.dirname, "..");
const SENTINEL = "ENGAWA_PRIVATE_SENTINEL_DO_NOT_PUBLISH";

function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function copyFixtureToTemp(): string {
  const dir = mkdtempSync(join(tmpdir(), "static-build-time-"));
  cpSync(EXAMPLE_ROOT, dir, {
    recursive: true,
    filter: (src) =>
      !src.includes("node_modules") &&
      !src.includes("dist") &&
      !src.includes("generated") &&
      !src.includes(".build"),
  });
  return dir;
}

describe("static build-time extraction", () => {
  let tempDir: string | undefined;

  afterEach(() => {
    tempDir = undefined;
    vi.restoreAllMocks();
  });

  it("extracts allowlisted public HTML into manifest, markdown, and llms.txt", async () => {
    tempDir = copyFixtureToTemp();
    const result = await runExtractAsync(tempDir);

    expect(result.resources.length).toBe(5);
    const manifestJson = readFileSync(join(tempDir, result.manifestPath), "utf8");
    expect(manifestJson).not.toContain(SENTINEL);
    expect(manifestJson).not.toContain("Unlisted public HTML");

    const llms = readFileSync(join(tempDir, result.llmsTxtPath), "utf8");
    expect(llms).toContain("Static Example Co");
    expect(llms).toContain("https://example.invalid/index.md");
    expect(llms).not.toContain(SENTINEL);

    const servicesMd = readFileSync(join(tempDir, "dist/services.md"), "utf8");
    expect(servicesMd).toContain("Original service sentence");
    expect(servicesMd).toContain("[Example.org docs](https://example.org/docs)");
    expect(servicesMd).toContain("[+41 00 000 00 00](tel:+41000000000)");
  });

  it("enforces allowlist — unlisted HTML never extracted", async () => {
    tempDir = copyFixtureToTemp();
    const result = await runExtractAsync(tempDir);
    const ids = result.resources.map((r) => r.id);
    expect(ids).not.toContain("unlisted");
    const allOutput = result.resources.map((r) => r.content).join("\n");
    expect(allOutput).not.toContain("Unlisted public HTML file");
  });

  it("excludes private admin sentinel from all generated output", async () => {
    tempDir = copyFixtureToTemp();
    const result = await runExtractAsync(tempDir);
    for (const record of result.resources) {
      expect(record.content).not.toContain(SENTINEL);
    }
    const llms = readFileSync(join(tempDir, result.llmsTxtPath), "utf8");
    expect(llms).not.toContain(SENTINEL);
    expect(result.resources.some((r) => r.id === "admin")).toBe(false);
  });

  it("fails when allowlisted source file is missing", async () => {
    tempDir = copyFixtureToTemp();
    writeFileSync(
      join(tempDir, "engawa.manifest.json"),
      readFileSync(join(tempDir, "engawa.manifest.json")),
    );
    const manifest = loadManifest(join(tempDir, "engawa.manifest.json"));
    manifest.resources.push({
      id: "missing",
      source: "missing.html",
      canonicalPath: "/missing.html",
      markdownPath: "/missing.md",
      contentSelector: "main",
    });
    writeFileSync(join(tempDir, "engawa.manifest.json"), JSON.stringify(manifest, null, 2));
    await expect(runExtractAsync(tempDir)).rejects.toThrow(/missing\.html|ENOENT|missing/i);
  });

  it("fails when content selector matches nothing", async () => {
    tempDir = copyFixtureToTemp();
    const manifest = loadManifest(join(tempDir, "engawa.manifest.json"));
    manifest.resources[0].contentSelector = "section#nonexistent";
    writeFileSync(join(tempDir, "engawa.manifest.json"), JSON.stringify(manifest, null, 2));
    await expect(runExtractAsync(tempDir)).rejects.toThrow(/matched nothing/i);
  });

  it("fails on duplicate resource id in manifest", () => {
    tempDir = copyFixtureToTemp();
    const manifest = loadManifest(join(tempDir, "engawa.manifest.json"));
    manifest.resources.push({ ...manifest.resources[0], markdownPath: "/dup.md" });
    writeFileSync(join(tempDir, "engawa.manifest.json"), JSON.stringify(manifest, null, 2));
    expect(() => loadManifest(join(tempDir!, "engawa.manifest.json"))).toThrow(
      /Duplicate resource id/i,
    );
  });

  it("fails on duplicate markdownPath in manifest", () => {
    tempDir = copyFixtureToTemp();
    const manifest = loadManifest(join(tempDir, "engawa.manifest.json"));
    manifest.resources.push({
      ...manifest.resources[1],
      id: "dup-path",
      source: "about.html",
    });
    writeFileSync(join(tempDir, "engawa.manifest.json"), JSON.stringify(manifest, null, 2));
    expect(() => loadManifest(join(tempDir!, "engawa.manifest.json"))).toThrow(
      /Duplicate markdownPath/i,
    );
  });

  it("blocks path traversal in source paths", async () => {
    tempDir = copyFixtureToTemp();
    const manifest = loadManifest(join(tempDir, "engawa.manifest.json"));
    manifest.resources[0].source = "../../html/private/admin.html";
    writeFileSync(join(tempDir, "engawa.manifest.json"), JSON.stringify(manifest, null, 2));
    await expect(runExtractAsync(tempDir)).rejects.toThrow(/traversal|escapes/i);
  });

  it("blocks output path escape via manifest traversal", async () => {
    tempDir = copyFixtureToTemp();
    const manifest = loadManifest(join(tempDir, "engawa.manifest.json"));
    manifest.resources[0].markdownPath = "/../escape.md";
    writeFileSync(join(tempDir, "engawa.manifest.json"), JSON.stringify(manifest, null, 2));
    await expect(runExtractAsync(tempDir)).rejects.toThrow(/traversal|absolute/i);
  });

  it("converts headings, paragraphs, lists, and links", () => {
    const html = parse(
      `<main><h1>Title</h1><p>Para <strong>bold</strong></p><ul><li>one</li></ul></main>`,
    ).querySelector("main")!;
    const md = htmlMainToMarkdown(html, "https://example.invalid");
    expect(md).toContain("# Title");
    expect(md).toContain("**bold**");
    expect(md).toContain("- one");
  });

  it("absolutizes relative internal links", async () => {
    tempDir = copyFixtureToTemp();
    const result = await runExtractAsync(tempDir);
    const home = result.resources.find((r) => r.id === "home");
    expect(home?.content).toContain("[services](https://example.invalid/services.html)");
    expect(home?.content).toContain("mailto:hello@example.invalid");
  });

  it("propagates HTML changes to Engawa output without hand-written markdown", async () => {
    tempDir = copyFixtureToTemp();
    const servicesPath = join(tempDir, "html/public/services.html");
    const original = readFileSync(servicesPath, "utf8");
    writeFileSync(
      servicesPath,
      original.replace("Original service sentence", "Changed service sentence"),
    );
    const result = await runExtractAsync(tempDir);
    const services = result.resources.find((r) => r.id === "services");
    expect(services?.content).toContain("Changed service sentence");
    expect(services?.content).not.toContain("Original service sentence");
  });

  it("produces deterministic rebuild output", async () => {
    tempDir = copyFixtureToTemp();
    await runExtractAsync(tempDir);
    const manifest1 = hashFile(join(tempDir, "generated/engawa/resources.json"));
    const llms1 = hashFile(join(tempDir, "dist/llms.txt"));
    const md1 = hashFile(join(tempDir, "dist/services.md"));

    await runExtractAsync(tempDir);
    expect(hashFile(join(tempDir, "generated/engawa/resources.json"))).toBe(manifest1);
    expect(hashFile(join(tempDir, "dist/llms.txt"))).toBe(llms1);
    expect(hashFile(join(tempDir, "dist/services.md"))).toBe(md1);
  });

  it("tracks stable source hashes that change when HTML changes", async () => {
    tempDir = copyFixtureToTemp();
    const first = await runExtractAsync(tempDir);
    const services = first.resources.find((r) => r.id === "services");
    const hash1 = services?.trace.sourceSha256;

    const servicesPath = join(tempDir, "html/public/services.html");
    writeFileSync(servicesPath, readFileSync(servicesPath, "utf8") + "\n");
    const second = await runExtractAsync(tempDir);
    const hash2 = second.resources.find((r) => r.id === "services")?.trace.sourceSha256;
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash2).not.toBe(hash1);
  });

  it("passes Engawa core list, get, and search on generated adapter", async () => {
    tempDir = copyFixtureToTemp();
    const result = await runExtractAsync(tempDir);
    const engawa = createEngawaFromExtractResult(result, "https://example.invalid");
    const listed = await engawa.listResources();
    expect(listed.length).toBe(5);

    const about = await engawa.getResource("about");
    expect(about?.title).toContain("About");

    const uri = resourceUriFor("https://example.invalid", "services");
    const byUri = await engawa.getResource(uri);
    expect(byUri?.id).toBe("services");

    const search = await engawa.search("Original service");
    expect(search.some((r) => r.id === "services")).toBe(true);
  });

  it("generates llms.txt from the same corpus via engawa-discovery", async () => {
    tempDir = copyFixtureToTemp();
    const result = await runExtractAsync(tempDir);
    const engawa = createEngawaFromExtractResult(result, "https://example.invalid");
    const resources = await engawa.listResources();
    const llms = generateLlmsTxt(engawa.config, resources);
    const written = readFileSync(join(tempDir, result.llmsTxtPath), "utf8");
    expect(written).toBe(llms);
    expect(written).toContain("Welcome to Static Example Co");
  });

  it("removes stale markdown when a resource is removed from the allowlist", async () => {
    tempDir = copyFixtureToTemp();
    await runExtractAsync(tempDir);
    expect(existsSync(join(tempDir, "dist/services.md"))).toBe(true);

    const manifest = loadManifest(join(tempDir, "engawa.manifest.json"));
    manifest.resources = manifest.resources.filter((r) => r.id !== "services");
    writeFileSync(join(tempDir, "engawa.manifest.json"), JSON.stringify(manifest, null, 2));

    await runExtractAsync(tempDir);
    expect(existsSync(join(tempDir, "dist/services.md"))).toBe(false);

    const manifestJson = readFileSync(join(tempDir, "generated/engawa/resources.json"), "utf8");
    expect(manifestJson).not.toMatch(/"id": "services"/);
    const llms = readFileSync(join(tempDir, "dist/llms.txt"), "utf8");
    expect(llms).not.toContain("/services.md");
    expect(llms).not.toContain("Services");
  });

  it("preserves inline whitespace around emphasis and links", () => {
    const pageBase = "https://example.invalid/about.html";
    const bold = parse("<main><p>Text <strong>bold</strong> text</p></main>").querySelector(
      "main",
    )!;
    expect(htmlMainToMarkdown(bold, pageBase)).toContain("Text **bold** text");

    const italic = parse("<main><p>Text <em>italic</em> text</p></main>").querySelector("main")!;
    expect(htmlMainToMarkdown(italic, pageBase)).toContain("Text *italic* text");

    const link = parse(
      '<main><p>Text <a href="/about.html">link</a> text</p></main>',
    ).querySelector("main")!;
    expect(htmlMainToMarkdown(link, pageBase)).toContain(
      "Text [link](https://example.invalid/about.html) text",
    );

    const punct = parse("<main><p><strong>Hello</strong>, world.</p></main>").querySelector(
      "main",
    )!;
    expect(htmlMainToMarkdown(punct, pageBase)).toBe("**Hello**, world.");
  });

  it("resolves nested relative links against the human page URL", async () => {
    tempDir = copyFixtureToTemp();
    const result = await runExtractAsync(tempDir);
    const guides = result.resources.find((r) => r.id === "guides-start");
    expect(guides?.content).toContain("[Next](https://example.invalid/guides/next.html)");
    expect(guides?.content).toContain("[Services](https://example.invalid/services.html)");
  });

  it("blocks source file symlink escaping sourceRoot", async () => {
    tempDir = copyFixtureToTemp();
    const outsideDir = mkdtempSync(join(tmpdir(), "static-outside-"));
    const outsideFile = join(outsideDir, "secret.html");
    writeFileSync(outsideFile, `<!DOCTYPE html><html><body><main>${SENTINEL}</main></body></html>`);
    const linkPath = join(tempDir, "html/public/leak.html");
    try {
      symlinkSync(outsideFile, linkPath);
    } catch {
      return;
    }

    const manifest = loadManifest(join(tempDir, "engawa.manifest.json"));
    manifest.resources.push({
      id: "leak",
      source: "leak.html",
      canonicalPath: "/leak.html",
      markdownPath: "/leak.md",
      contentSelector: "main",
    });
    writeFileSync(join(tempDir, "engawa.manifest.json"), JSON.stringify(manifest, null, 2));
    await expect(runExtractAsync(tempDir)).rejects.toThrow(/escapes bounded root/i);
  });

  it("blocks outputRoot symlink escaping project root", async () => {
    tempDir = copyFixtureToTemp();
    const outsideDir = mkdtempSync(join(tmpdir(), "static-out-dist-"));
    try {
      symlinkSync(outsideDir, join(tempDir, "dist"));
    } catch {
      return;
    }
    await expect(runExtractAsync(tempDir)).rejects.toThrow(/escapes project root/i);
  });

  it("does not use network during extraction", async () => {
    tempDir = copyFixtureToTemp();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network forbidden"));
    await runExtractAsync(tempDir);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

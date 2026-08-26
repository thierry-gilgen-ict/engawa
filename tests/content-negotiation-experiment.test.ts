// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { selectRepresentation } from "../examples/content-negotiation/accept-parser.mjs";
import {
  dedicatedMarkdownAbout,
  negotiateAbout,
} from "../examples/content-negotiation/negotiate.mjs";
import { markdownBody } from "../examples/content-negotiation/content.mjs";
import { startServer } from "../examples/content-negotiation/server.mjs";

const root = process.cwd();
const docPath = join(root, "docs/content-negotiation-experiment.md");
const exampleDir = join(root, "examples/content-negotiation");
const vectorsPath = join(exampleDir, "fixtures/accept-vectors.json");

describe("content negotiation experiment", () => {
  it("canonical doc and example exist", () => {
    expect(existsSync(docPath)).toBe(true);
    expect(existsSync(join(exampleDir, "README.md"))).toBe(true);
    expect(existsSync(join(exampleDir, "server.mjs"))).toBe(true);
    expect(existsSync(join(exampleDir, "cache-demo.mjs"))).toBe(true);
    expect(existsSync(vectorsPath)).toBe(true);
  });

  it("locks experiment boundaries and decision block in doc", () => {
    const doc = readFileSync(docPath, "utf8");
    expect(doc).toContain("EXPERIMENT_ONLY = YES");
    expect(doc).toContain("PRODUCTION_READY_ACCEPT_PARSER = NO");
    expect(doc).toContain("HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE");
    expect(doc).toContain("DEDICATED_MD_STILL_SUPPORTED = YES");
    expect(doc).toContain("REFERENCE_SITE_ACCEPT_EVIDENCE = NOT_YET_MEASURED");
    expect(doc).toContain("VENDOR_SUPPORT = ESTABLISHED_EXAMPLE");
    expect(doc).toContain("BROAD_CLIENT_ADOPTION = NOT_ESTABLISHED");
    expect(doc).toContain("NEXTJS_PAGE_ROUTE_COLOCATION = INVALID");
    expect(doc).toContain("NEXTJS_NEGOTIATION_PATTERN = EXPERIMENTAL_ONLY");
    expect(doc).toMatch(/does \*\*not\*\* allow `page\.tsx` and `route\.ts` to coexist/i);
    expect(doc).toContain("CONTENT_NEGOTIATION_EXPERIMENT = COMPLETE");
    expect(doc).toMatch(/DECISION = (ADOPT|DEFER|REJECT)/);
    expect(doc).not.toMatch(/npm install.*engawa-nextjs/i);
    expect(doc).toContain("RFC 9110");
    expect(doc).toContain("RFC 7763");
    expect(doc).toMatch(/Dedicated.*`\.md`.*Same-URL negotiation/);
    const criteriaIdx = doc.indexOf("## Decision criteria");
    const secondDecisionIdx = doc.indexOf("## Decision", criteriaIdx + 1);
    expect(criteriaIdx).toBeGreaterThan(-1);
    expect(secondDecisionIdx).toBeGreaterThan(criteriaIdx);
  });

  it("accept vectors select expected representations", () => {
    const vectors = JSON.parse(readFileSync(vectorsPath, "utf8"));
    expect(vectors.length).toBeGreaterThanOrEqual(14);
    for (const vector of vectors) {
      expect(selectRepresentation(vector.accept)).toBe(vector.expected);
    }
  });

  it("q=0, wildcard, and equal-weight policies hold", () => {
    expect(selectRepresentation("*/*")).toBe("html");
    expect(selectRepresentation("text/html;q=1, text/markdown;q=1")).toBe("html");
    expect(selectRepresentation("text/markdown;q=0, text/html")).toBe("html");
    expect(selectRepresentation("text/html;q=0, text/markdown;q=0")).toBe("not-acceptable");
  });

  it("most-specific Accept range overrides broader wildcards", () => {
    expect(selectRepresentation("text/*;q=1, text/html;q=0")).toBe("markdown");
    expect(selectRepresentation("text/*;q=0.8, text/html;q=0.1")).toBe("markdown");
    expect(selectRepresentation("*/*;q=0.8, text/markdown;q=0.1")).toBe("html");
    expect(selectRepresentation("text/markdown;q=0")).toBe("not-acceptable");
  });

  it("negotiated responses set Content-Type and Vary on both branches", () => {
    const html = negotiateAbout("text/html");
    const md = negotiateAbout("text/markdown");
    expect(html.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(html.headers.vary).toBe("Accept");
    expect(md.headers["content-type"]).toBe("text/markdown; charset=utf-8");
    expect(md.headers.vary).toBe("Accept");
  });

  it("406 when no representation is acceptable", () => {
    const bothZero = negotiateAbout("text/html;q=0, text/markdown;q=0");
    expect(bothZero.status).toBe(406);
    expect(bothZero.headers.vary).toBe("Accept");
    const markdownZeroOnly = negotiateAbout("text/markdown;q=0");
    expect(markdownZeroOnly.status).toBe(406);
  });

  it("negotiated markdown matches dedicated .md body", () => {
    const negotiated = negotiateAbout("text/markdown");
    const dedicated = dedicatedMarkdownAbout();
    expect(negotiated.body).toBe(dedicated.body);
    expect(negotiated.body).toBe(markdownBody);
  });

  it("experiment sources have no external network calls", () => {
    for (const file of readdirSync(exampleDir)) {
      if (!file.endsWith(".mjs")) continue;
      const source = readFileSync(join(exampleDir, file), "utf8");
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/from ["']node:https["']/);
      if (file === "server.mjs") continue;
      expect(source).not.toMatch(/https?:\/\//);
    }
  });

  it("cache demo proves Vary requirement locally", () => {
    const out = execFileSync(process.execPath, [join(exampleDir, "cache-demo.mjs")], {
      encoding: "utf8",
      cwd: root,
    });
    expect(out).toContain("CACHE_VARIANT_KEY_REQUIRED = YES");
    expect(out).toContain("CACHE_POISONING_WITHOUT_VARY = YES");
    expect(out).toContain("VARY_ACCEPT_SEPARATES_REPRESENTATIONS = YES");
    expect(out).toContain("NETWORK_CALLS = NONE");
  });

  it("localhost server honors Accept and HEAD", async () => {
    const server = startServer(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("expected port");
    const base = `http://127.0.0.1:${addr.port}`;

    try {
      const htmlRes = await fetch(`${base}/about`, { headers: { Accept: "text/html" } });
      expect(htmlRes.status).toBe(200);
      expect(htmlRes.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(htmlRes.headers.get("vary")).toBe("Accept");

      const mdRes = await fetch(`${base}/about`, { headers: { Accept: "text/markdown" } });
      expect(mdRes.status).toBe(200);
      expect(mdRes.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
      expect(await mdRes.text()).toBe(markdownBody);

      const headRes = await fetch(`${base}/about`, {
        method: "HEAD",
        headers: { Accept: "text/markdown" },
      });
      expect(headRes.status).toBe(200);
      expect(headRes.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
      expect(headRes.headers.get("vary")).toBe("Accept");

      const dedicated = await fetch(`${base}/about.md`);
      expect(dedicated.status).toBe(200);
      expect(await dedicated.text()).toBe(markdownBody);
    } finally {
      server.close();
    }
  });
});

// @vitest-environment node
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED_ENGAWA_PACKAGE } from "./constants.js";
import { detectEngawaPackageVersions, VersionDetectionError } from "./packages.js";
import { createTestProject } from "./test-helpers.js";

describe("package version detection", () => {
  it("reads installed versions for declared core and optional packages", async () => {
    const projectRoot = await createTestProject();
    const versions = await detectEngawaPackageVersions(projectRoot);
    expect(versions["@thierry-gilgen-ict/engawa-core"]).toBe("0.1.1");
    expect(versions["@thierry-gilgen-ict/engawa-react"]).toBe("0.1.1");
  });

  it("returns core only when optional packages are not declared", async () => {
    const projectRoot = await createTestProject({ includeOptionalPackages: false });
    const versions = await detectEngawaPackageVersions(projectRoot);
    expect(versions["@thierry-gilgen-ict/engawa-core"]).toBe("0.1.1");
    expect(versions["@thierry-gilgen-ict/engawa-discovery"]).toBeUndefined();
    expect(versions["@thierry-gilgen-ict/engawa-mcp"]).toBeUndefined();
    expect(versions["@thierry-gilgen-ict/engawa-react"]).toBeUndefined();
  });

  it("does not report undeclared optional packages present in node_modules", async () => {
    const projectRoot = await createTestProject({ includeOptionalPackages: false });
    const undeclaredPackage = "@thierry-gilgen-ict/engawa-react";
    const pkgDir = join(projectRoot, "node_modules", undeclaredPackage);
    await mkdir(pkgDir, { recursive: true });
    await writeFile(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: undeclaredPackage, version: "0.1.1" }, null, 2),
      "utf8",
    );

    const versions = await detectEngawaPackageVersions(projectRoot);
    expect(versions[undeclaredPackage]).toBeUndefined();
  });

  it("fails when a declared optional package is not installed", async () => {
    const projectRoot = await createTestProject();
    await rm(join(projectRoot, "node_modules", "@thierry-gilgen-ict/engawa-react"), {
      recursive: true,
      force: true,
    });

    await expect(detectEngawaPackageVersions(projectRoot)).rejects.toBeInstanceOf(
      VersionDetectionError,
    );
  });

  it("reports installed exact version when a semver range is declared", async () => {
    const projectRoot = await createTestProject({ includeOptionalPackages: false });
    await writeFile(
      join(projectRoot, "package.json"),
      JSON.stringify(
        {
          name: "map-test-project",
          dependencies: {
            [REQUIRED_ENGAWA_PACKAGE]: "^0.1.1",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const versions = await detectEngawaPackageVersions(projectRoot);
    expect(versions[REQUIRED_ENGAWA_PACKAGE]).toBe("0.1.1");
  });

  it("does not fabricate versions from semver ranges without installation", async () => {
    const projectRoot = await createTestProject();
    await rm(join(projectRoot, "node_modules"), { recursive: true, force: true });
    await writeFile(
      join(projectRoot, "package.json"),
      JSON.stringify(
        {
          name: "map-test-project",
          dependencies: {
            "@thierry-gilgen-ict/engawa-core": "^0.1.1",
            "@thierry-gilgen-ict/engawa-discovery": "^0.1.1",
            "@thierry-gilgen-ict/engawa-mcp": "^0.1.1",
            "@thierry-gilgen-ict/engawa-react": "^0.1.0",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    await expect(detectEngawaPackageVersions(projectRoot)).rejects.toBeInstanceOf(
      VersionDetectionError,
    );
  });

  it("throws VersionDetectionError for malformed package.json", async () => {
    const projectRoot = await createTestProject();
    await writeFile(join(projectRoot, "package.json"), "{not-json", "utf8");

    await expect(detectEngawaPackageVersions(projectRoot)).rejects.toBeInstanceOf(
      VersionDetectionError,
    );
  });
});

import type { SourceCandidateKind } from "./types.js";

const CMS_PACKAGES = [
  "@sanity/client",
  "next-sanity",
  "contentful",
  "@contentful",
  "@strapi",
  "@wordpress",
  "@prismicio/client",
];

const DB_PACKAGES = [
  "@prisma/client",
  "prisma",
  "drizzle-orm",
  "mongoose",
  "pg",
  "mysql2",
  "better-sqlite3",
];

const HTTP_PACKAGES = ["axios", "node-fetch", "got", "undici"];

export function classifyFileKind(
  path: string,
  importSpec?: string,
  dependencies?: Record<string, string>,
): { kind: SourceCandidateKind; evidence: string[] } {
  const evidence: string[] = [];
  const ext = path.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "md") {
    evidence.push("file-extension:md");
    return { kind: "MARKDOWN", evidence };
  }
  if (ext === "mdx") {
    evidence.push("file-extension:mdx");
    return { kind: "MDX", evidence };
  }

  if (importSpec) {
    evidence.push(`import-spec:${importSpec}`);
    for (const pkg of CMS_PACKAGES) {
      if (importSpec.includes(pkg) || importSpec.startsWith(pkg)) {
        evidence.push(`import-hint:cms:${pkg}`);
        return { kind: "HEADLESS_CMS", evidence };
      }
    }
    for (const pkg of DB_PACKAGES) {
      if (importSpec.includes(pkg)) {
        evidence.push(`import-hint:database:${pkg}`);
        return { kind: "DATABASE_ORM", evidence };
      }
    }
    for (const pkg of HTTP_PACKAGES) {
      if (importSpec.includes(pkg)) {
        evidence.push(`import-hint:http:${pkg}`);
        return { kind: "HTTP_API", evidence };
      }
    }
  }

  if (dependencies) {
    for (const pkg of CMS_PACKAGES) {
      if (dependencies[pkg]) {
        evidence.push(`package-dependency:${pkg}`);
        return { kind: "HEADLESS_CMS", evidence };
      }
    }
    for (const pkg of DB_PACKAGES) {
      if (dependencies[pkg]) {
        evidence.push(`package-dependency:${pkg}`);
        return { kind: "DATABASE_ORM", evidence };
      }
    }
  }

  evidence.push("static-module-inference");
  return { kind: "STATIC_MODULE", evidence };
}

export function classifyDependencies(
  dependencies: Record<string, string>,
): Array<{ kind: SourceCandidateKind; package: string; evidence: string }> {
  const hints: Array<{ kind: SourceCandidateKind; package: string; evidence: string }> = [];
  const all = { ...dependencies };

  for (const [pkg] of Object.entries(all)) {
    if (CMS_PACKAGES.some((c) => pkg === c || pkg.startsWith(c))) {
      hints.push({
        kind: "HEADLESS_CMS",
        package: pkg,
        evidence: `package-dependency:${pkg}`,
      });
    } else if (DB_PACKAGES.some((d) => pkg === d || pkg.startsWith(d))) {
      hints.push({
        kind: "DATABASE_ORM",
        package: pkg,
        evidence: `package-dependency:${pkg}`,
      });
    }
  }

  return hints.sort((a, b) => a.package.localeCompare(b.package));
}

import type { FrameworkInfo, FrameworkId } from "../types.js";
import type { RepoMetadata } from "../types.js";

export function detectFramework(metadata: RepoMetadata, filePaths: string[]): FrameworkInfo {
  const evidence: string[] = [];
  const allDeps = { ...metadata.dependencies, ...metadata.devDependencies };

  const hasNext = "next" in allDeps;
  const hasAppRouter =
    filePaths.some((p) => p === "app" || p.startsWith("app/")) ||
    filePaths.some((p) => p === "src/app" || p.startsWith("src/app/"));
  const hasPagesRouter =
    filePaths.some((p) => p === "pages" || p.startsWith("pages/")) ||
    filePaths.some((p) => p === "src/pages" || p.startsWith("src/pages/"));

  let id: FrameworkId = "unknown";

  if (hasNext) {
    id = "nextjs";
    evidence.push("package-dependency:next");
  } else if ("astro" in allDeps) {
    id = "astro";
    evidence.push("package-dependency:astro");
  } else if ("nuxt" in allDeps || "@nuxt/kit" in allDeps) {
    id = "nuxt";
    evidence.push("package-dependency:nuxt");
  } else if ("@sveltejs/kit" in allDeps) {
    id = "sveltekit";
    evidence.push("package-dependency:@sveltejs/kit");
  } else if ("@remix-run/node" in allDeps || "@remix-run/react" in allDeps) {
    id = "remix";
    evidence.push("package-dependency:remix");
  } else if ("vite" in allDeps && "react" in allDeps) {
    id = "vite-react";
    evidence.push("package-dependency:vite+react");
  } else if (metadata.packageJsonPresent) {
    id = "generic-node";
    evidence.push("package.json-present");
  } else if (filePaths.some((p) => p.endsWith(".html"))) {
    id = "static";
    evidence.push("html-files-present");
  }

  if (hasAppRouter) evidence.push("directory:app-router");
  if (hasPagesRouter) evidence.push("directory:pages-router");

  return {
    id,
    nextjsAppRouter: hasNext && hasAppRouter,
    nextjsPagesRouter: hasNext && hasPagesRouter,
    evidence: [...new Set(evidence)].sort(),
  };
}

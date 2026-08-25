import { mkdirSync, readFileSync, writeFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";

export const SECRET_SENTINEL = "ENGAWA_TEST_SECRET_SENTINEL_DO_NOT_LEAK";

export function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function createNextAppRouterFixture(root: string): void {
  writeJson(join(root, "package.json"), {
    name: "fixture-next-app-router",
    engines: { node: ">=24" },
    dependencies: { next: "15.0.0", react: "19.0.0" },
  });
  writeFileSync(join(root, "pnpm-lock.yaml"), "# lock\n", "utf8");
  writeFileSync(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { paths: { "@/*": ["./src/*"] } },
    }),
    "utf8",
  );

  const aboutPage = join(root, "src", "app", "about", "page.tsx");
  mkdirSync(join(root, "src", "app", "about"), { recursive: true });
  writeFileSync(
    aboutPage,
    `import { aboutContent } from "../../lib/content/about";
export default function About() { return <div>{aboutContent.title}</div>; }`,
    "utf8",
  );

  mkdirSync(join(root, "src", "lib", "content"), { recursive: true });
  writeFileSync(
    join(root, "src", "lib", "content", "about.ts"),
    `export const aboutContent = { title: "About us" };`,
    "utf8",
  );

  const blogSlug = join(root, "src", "app", "blog", "[slug]", "page.tsx");
  mkdirSync(join(root, "src", "app", "blog", "[slug]"), { recursive: true });
  writeFileSync(blogSlug, `export default function BlogPost() { return <div>post</div>; }`, "utf8");

  const groupPage = join(root, "src", "app", "(marketing)", "services", "page.tsx");
  mkdirSync(join(root, "src", "app", "(marketing)", "services"), { recursive: true });
  writeFileSync(
    groupPage,
    `export default function Services() { return <div>services</div>; }`,
    "utf8",
  );

  writeFileSync(join(root, "middleware.ts"), `export function middleware() {}`, "utf8");
}

export function createNextPagesRouterFixture(root: string): void {
  writeJson(join(root, "package.json"), {
    name: "fixture-next-pages-router",
    engines: { node: ">=24" },
    dependencies: { next: "14.0.0", react: "18.0.0" },
  });
  writeFileSync(join(root, "package-lock.json"), "{}", "utf8");

  mkdirSync(join(root, "pages"), { recursive: true });
  writeFileSync(join(root, "pages", "about.tsx"), `export default () => <div>About</div>`, "utf8");
  mkdirSync(join(root, "pages", "blog"), { recursive: true });
  writeFileSync(
    join(root, "pages", "blog", "[slug].tsx"),
    `export default () => <div>Post</div>`,
    "utf8",
  );
  mkdirSync(join(root, "pages", "api"), { recursive: true });
  writeFileSync(join(root, "pages", "api", "hello.ts"), `export default () => null`, "utf8");
  writeFileSync(join(root, "pages", "_app.tsx"), `export default () => null`, "utf8");
}

export function createGenericNodeFixture(root: string): void {
  writeJson(join(root, "package.json"), {
    name: "fixture-generic-node",
    dependencies: { express: "4.18.0" },
  });
  writeFileSync(join(root, "index.js"), `console.log("hello");`, "utf8");
}

export function createExistingEngawaFixture(root: string): void {
  createNextAppRouterFixture(root);
  const pkgPath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.dependencies = {
    ...pkg.dependencies,
    "@thierry-gilgen-ict/engawa-core": "0.1.1",
    "@thierry-gilgen-ict/engawa-discovery": "0.1.1",
    "@thierry-gilgen-ict/engawa-mcp": "0.1.1",
  };
  writeJson(pkgPath, pkg);

  mkdirSync(join(root, "src", "app", "llms.txt"), { recursive: true });
  writeFileSync(
    join(root, "src", "app", "llms.txt", "route.ts"),
    `import { generateLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";
export async function GET() { return generateLlmsTxt({}); }`,
    "utf8",
  );
  mkdirSync(join(root, "src", "app", "mcp"), { recursive: true });
  writeFileSync(
    join(root, "src", "app", "mcp", "route.ts"),
    `import { createEngawaPublicMcpHandler } from "@thierry-gilgen-ict/engawa-mcp";
const handler = createEngawaPublicMcpHandler({ adapter: {} as never });
export { handler as GET, handler as POST };`,
    "utf8",
  );
}

export function createSensitiveFilesFixture(root: string): void {
  createNextAppRouterFixture(root);
  writeFileSync(join(root, ".env"), `API_KEY=${SECRET_SENTINEL}`, "utf8");
  writeFileSync(join(root, ".env.production"), `SECRET=${SECRET_SENTINEL}`, "utf8");
  writeFileSync(join(root, "credentials.json"), `{"token":"${SECRET_SENTINEL}"}`, "utf8");
  writeFileSync(
    join(root, "server.pem"),
    `-----BEGIN PRIVATE KEY-----\n${SECRET_SENTINEL}\n`,
    "utf8",
  );
  mkdirSync(join(root, "node_modules", "pkg"), { recursive: true });
  writeFileSync(join(root, "node_modules", "pkg", "index.js"), SECRET_SENTINEL, "utf8");
}

export function createSymlinkEscapeFixture(root: string): void {
  createNextAppRouterFixture(root);
  try {
    symlinkSync(join(root, ".env"), join(root, "link-to-env"), "file");
  } catch {
    // skip on platforms without symlink support
  }
}

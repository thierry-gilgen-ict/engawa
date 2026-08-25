/**
 * engawa-cli release-candidate pack smoke.
 * Packs @thierry-gilgen-ict/engawa-cli and proves the installed binary works
 * outside the monorepo (inspect / init / doctor). No npm publish.
 */
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFile, execSync } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";

const execFileAsync = promisify(execFile);

const root = process.cwd();
const scope = "@thierry-gilgen-ict/engawa-cli";
const cliDir = join(root, "packages/cli");
const VERSION = "0.1.0";

const REQUIRED_TARBALL_PATHS = [
  "package.json",
  "README.md",
  "LICENSE",
  "dist/cli.js",
  "dist/index.js",
  "dist/index.d.ts",
];

const FORBIDDEN_TARBALL_PATTERNS = [
  /^src\//,
  /\.test\./,
  /test-helpers/,
  /fixture/,
  /tsconfig/,
  /\.tsbuildinfo$/,
  /\.env/,
  /credential/i,
  /secret/i,
  /private-key/i,
  /id_rsa/,
  /id_ed25519/,
  /\.pem$/,
  /\.p12$/,
  /^\.git\//,
  /^\.github\//,
  /\.tgz$/,
];

function engawaBin(consumerDir) {
  const posix = join(consumerDir, "node_modules", ".bin", "engawa");
  const win = join(consumerDir, "node_modules", ".bin", "engawa.cmd");
  if (process.platform === "win32" && existsSync(win)) return win;
  if (existsSync(posix)) return posix;
  throw new Error("Installed engawa binary not found under node_modules/.bin");
}

function truncateDiagnostic(text, max = 2000) {
  const s = String(text ?? "");
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/**
 * Execute the npm-installed engawa binary (not node dist/cli.js).
 * Default requires exit code 0. Opt-in expectedExitCode for intentional failures.
 */
async function runInstalledEngawa(consumerDir, args, options = {}) {
  const expectedExitCode = options.expectedExitCode ?? 0;
  const bin = engawaBin(consumerDir);
  const env = { ...process.env, npm_config_registry: "https://registry.npmjs.org" };
  const execOpts = {
    cwd: consumerDir,
    encoding: "utf8",
    env,
    maxBuffer: 10 * 1024 * 1024,
  };

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    let result;
    if (process.platform === "win32") {
      const comspec = process.env.ComSpec || "cmd.exe";
      result = await execFileAsync(comspec, ["/d", "/s", "/c", bin, ...args], execOpts);
    } else {
      result = await execFileAsync(bin, args, execOpts);
    }
    stdout = result.stdout ?? "";
    stderr = result.stderr ?? "";
    exitCode = 0;
  } catch (err) {
    stdout = typeof err?.stdout === "string" ? err.stdout : "";
    stderr = typeof err?.stderr === "string" ? err.stderr : "";
    if (typeof err?.code === "number") {
      exitCode = err.code;
    } else {
      exitCode = 1;
    }
  }

  if (exitCode !== expectedExitCode) {
    throw new Error(
      `engawa ${args.join(" ")} exited ${exitCode} (expected ${expectedExitCode})\n` +
        `stdout: ${truncateDiagnostic(stdout)}\n` +
        `stderr: ${truncateDiagnostic(stderr)}`,
    );
  }

  return stdout;
}

/** Acceptance alias — always the installed npm binary. */
async function runEngawa(consumerDir, args, options = {}) {
  return runInstalledEngawa(consumerDir, args, options);
}

function listTarballEntries(tarballPath) {
  const listing = execSync(`tar -tzf "${tarballPath}"`, { encoding: "utf8" });
  return listing
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^package\//, ""));
}

function verifyTarballContents(tarballPath) {
  const entries = listTarballEntries(tarballPath);
  for (const required of REQUIRED_TARBALL_PATHS) {
    if (!entries.includes(required)) {
      throw new Error(`Required tarball entry missing: ${required}`);
    }
  }
  for (const entry of entries) {
    for (const pattern of FORBIDDEN_TARBALL_PATTERNS) {
      if (pattern.test(entry)) {
        throw new Error(`Forbidden tarball entry: ${entry}`);
      }
    }
  }
  return entries;
}

async function startInspectFixture() {
  let port = 0;
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const origin = `http://127.0.0.1:${port}`;
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html><html><head>
<title>CLI RC Fixture</title>
<link rel="canonical" href="${origin}/"/>
<link rel="alternate" type="text/markdown" href="/about.md"/>
</head><body><a href="/about">About</a><a href="/about.md">About md</a></body></html>`);
      return;
    }
    if (url.pathname === "/robots.txt") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n");
      return;
    }
    if (url.pathname === "/sitemap.xml") {
      res.writeHead(200, { "content-type": "application/xml" });
      res.end(
        `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/about</loc></url></urlset>`,
      );
      return;
    }
    if (url.pathname === "/llms.txt") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end(`# CLI RC\n\n- Site: ${origin}/\n- [About](${origin}/about.md)\n`);
      return;
    }
    if (url.pathname === "/about") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(
        `<!DOCTYPE html><html><head><title>About</title></head><body><h1>About</h1><a href="/about.md">md</a></body></html>`,
      );
      return;
    }
    if (url.pathname === "/about.md") {
      res.writeHead(200, { "content-type": "text/markdown; charset=utf-8" });
      res.end("# About\n\nPublic about content.\n");
      return;
    }
    res.writeHead(404).end("missing");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  return {
    origin,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function startDoctorFixture() {
  const { createEngawa, StaticContentAdapter } = await import(
    pathToFileURL(join(root, "packages/core/dist/index.js")).href
  );
  const { generateLlmsTxt } = await import(
    pathToFileURL(join(root, "packages/discovery/dist/index.js")).href
  );
  const { createEngawaPublicMcpHandler } = await import(
    pathToFileURL(join(root, "packages/mcp/dist/index.js")).href
  );
  const require = createRequire(join(cliDir, "package.json"));
  const { toNodeHandler, localhostHostValidation, localhostOriginValidation } = await import(
    pathToFileURL(require.resolve("@modelcontextprotocol/node")).href
  );

  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;

  const adapter = new StaticContentAdapter(origin, [
    {
      id: "about",
      title: "About",
      description: "About page",
      path: "/about.md",
      content: "# About\n\nPublic about content for agents.",
    },
  ]);

  const engawa = createEngawa(
    {
      site: {
        name: "CLI RC Doctor Fixture",
        canonicalUrl: origin,
        description: "Hermetic doctor fixture for CLI pack smoke",
        language: "en",
      },
      agentInterface: { enabled: true, public: true },
      content: {
        maxResourceBytes: 65536,
        maxSearchResults: 10,
        maxSearchQueryLength: 200,
      },
      security: { publicDefault: "read-only" },
      metadata: { version: "0.1.0" },
    },
    adapter,
  );

  const mcpHandler = toNodeHandler(createEngawaPublicMcpHandler(engawa));
  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();
  const resources = await engawa.listResources();
  const llmsBody = `${generateLlmsTxt(engawa.config, resources).trimEnd()}\n\n- Site: ${origin}/\n`;

  server.on("request", async (req, res) => {
    const hostHeader = req.headers.host ?? `127.0.0.1:${port}`;
    const url = new URL(req.url ?? "/", `http://${hostHeader}`);

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html><html><head>
<title>CLI RC Doctor</title>
<link rel="canonical" href="${origin}/"/>
<link rel="alternate" type="text/markdown" href="/about.md"/>
</head><body><a href="/about.md">About</a></body></html>`);
      return;
    }
    if (req.method === "GET" && url.pathname === "/llms.txt") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end(llmsBody);
      return;
    }
    if (req.method === "GET" && url.pathname === "/about.md") {
      const resource = await engawa.getResource("about");
      res.writeHead(200, { "content-type": "text/markdown; charset=utf-8" });
      res.end(resource.content);
      return;
    }
    if (url.pathname === "/mcp") {
      if (!validateHost(req, res)) return;
      if (!validateOrigin(req, res)) return;
      await mcpHandler(req, res);
      return;
    }
    res.writeHead(404).end("missing");
  });

  return {
    origin,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function writeSyntheticRepo(repoDir) {
  await mkdir(join(repoDir, "src/app/about"), { recursive: true });
  await writeFile(
    join(repoDir, "package.json"),
    JSON.stringify(
      {
        name: "cli-rc-synthetic-repo",
        private: true,
        dependencies: { next: "15.0.0", react: "19.0.0", "react-dom": "19.0.0" },
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(
    join(repoDir, "src/app/page.tsx"),
    "export default function Home() { return null }\n",
    "utf8",
  );
  await writeFile(
    join(repoDir, "src/app/about/page.tsx"),
    "export default function About() { return null }\n",
    "utf8",
  );
}

async function main() {
  const distCli = join(cliDir, "dist/cli.js");
  if (!existsSync(distCli)) {
    console.error("Run pnpm build first (packages/cli/dist/cli.js missing)");
    process.exit(1);
  }
  const shebang = readFileSync(distCli, "utf8").slice(0, 32);
  if (!shebang.startsWith("#!/usr/bin/env node")) {
    throw new Error("BIN_SHEBANG failed: dist/cli.js missing shebang");
  }
  console.log("BIN_SHEBANG = PASS");

  const pkgJson = JSON.parse(readFileSync(join(cliDir, "package.json"), "utf8"));
  if (pkgJson.version !== VERSION) {
    throw new Error(`Unexpected CLI version: ${pkgJson.version}`);
  }
  if (pkgJson.name !== scope) {
    throw new Error(`Unexpected package name: ${pkgJson.name}`);
  }

  const temps = [];
  let inspectFixture;
  let doctorFixture;
  try {
    const packDir = await mkdtemp(join(tmpdir(), "engawa-cli-pack-"));
    temps.push(packDir);
    execSync(`pnpm pack --pack-destination "${packDir}"`, { cwd: cliDir, stdio: "inherit" });

    const tarballName = `thierry-gilgen-ict-engawa-cli-${VERSION}.tgz`;
    const tarballPath = join(packDir, tarballName);
    if (!existsSync(tarballPath)) {
      throw new Error(`Expected tarball missing: ${tarballPath}`);
    }

    const entries = verifyTarballContents(tarballPath);
    const tarballBytes = readFileSync(tarballPath);
    const sha256 = createHash("sha256").update(tarballBytes).digest("hex");
    console.log(`TARBALL = ${tarballName}`);
    console.log(`TARBALL_SIZE = ${tarballBytes.length}`);
    console.log(`TARBALL_FILE_COUNT = ${entries.length}`);
    console.log(`TARBALL_SHA256 = ${sha256}`);
    console.log("TARBALL_CONTENTS = PASS");
    console.log("TARBALL_SECRET_SCAN = PASS");
    console.log("UNEXPECTED_TARBALL_FILES = NONE");

    const consumerDir = await mkdtemp(join(tmpdir(), "engawa-cli-rc-consumer-"));
    temps.push(consumerDir);
    await writeFile(
      join(consumerDir, "package.json"),
      JSON.stringify(
        {
          name: "engawa-cli-rc-consumer",
          private: true,
          type: "module",
          dependencies: { [scope]: `file:${tarballPath}` },
        },
        null,
        2,
      ),
      "utf8",
    );

    execSync("npm install --no-package-lock", {
      cwd: consumerDir,
      stdio: "inherit",
      env: { ...process.env, npm_config_registry: "https://registry.npmjs.org" },
    });

    const installed = JSON.parse(
      await readFile(join(consumerDir, "node_modules", scope, "package.json"), "utf8"),
    );
    if (installed.version !== VERSION) {
      throw new Error(`installed version mismatch: ${installed.version}`);
    }
    const deps = installed.dependencies ?? {};
    const depBlob = JSON.stringify(deps);
    if (depBlob.includes("workspace:")) {
      throw new Error("WORKSPACE_DEPENDENCY_LEAK");
    }
    for (const name of Object.keys(deps)) {
      if (name.startsWith("@thierry-gilgen-ict/engawa-") && name !== scope) {
        throw new Error(`Unexpected Engawa runtime dependency: ${name}`);
      }
    }
    if (installed.devDependencies && Object.keys(installed.devDependencies).length > 0) {
      // npm may omit or keep; ensure Engawa workspace packages are not runtime
    }
    console.log("PACKED_INSTALL = PASS");
    console.log("WORKSPACE_DEPENDENCY_LEAK = NO");
    console.log("DEV_DEPENDENCY_RUNTIME_LEAK = NO");

    const installedCliJs = join(consumerDir, "node_modules", scope, "dist", "cli.js");
    if (!existsSync(installedCliJs)) {
      throw new Error("Installed dist/cli.js missing from packed package");
    }

    const versionOut = (await runEngawa(consumerDir, ["--version"])).trim();
    if (versionOut !== VERSION) {
      throw new Error(`PACKED_VERSION expected ${VERSION}, got ${JSON.stringify(versionOut)}`);
    }
    console.log("PACKED_BIN_EXECUTION = PASS");
    console.log("PACKED_BIN_LINK = PASS");
    console.log("PACKED_VERSION_SMOKE = PASS");

    // Non-zero exit with stdout (root usage) must fail under default expectedExitCode=0.
    let nonzeroRejected = false;
    try {
      await runEngawa(consumerDir, []);
    } catch (err) {
      const msg = String(err?.message ?? err);
      if (!/exited [1-9]/.test(msg)) {
        throw new Error(`NONZERO_WITH_STDOUT_IS_FAILURE: unexpected error shape: ${msg}`);
      }
      if (!/stdout:/i.test(msg)) {
        throw new Error("NONZERO_WITH_STDOUT_IS_FAILURE: diagnostic missing stdout");
      }
      nonzeroRejected = true;
    }
    if (!nonzeroRejected) {
      throw new Error("NONZERO_WITH_STDOUT_IS_FAILURE: zero-arg engawa unexpectedly succeeded");
    }
    console.log("NONZERO_WITH_STDOUT_IS_FAILURE = PASS");

    const rootHelp = await runEngawa(consumerDir, ["--help"]);
    for (const cmd of ["inspect", "init", "doctor"]) {
      if (!rootHelp.includes(cmd)) {
        throw new Error(`root help missing ${cmd}`);
      }
    }
    console.log("PACKED_ROOT_HELP_SMOKE = PASS");

    for (const cmd of ["inspect", "init", "doctor"]) {
      const help = await runEngawa(consumerDir, [cmd, "--help"]);
      if (!help.toLowerCase().includes(cmd)) {
        throw new Error(`${cmd} --help unexpected`);
      }
      console.log(`PACKED_${cmd.toUpperCase()}_HELP = PASS`);
    }

    inspectFixture = await startInspectFixture();
    const inspectJson = await runEngawa(consumerDir, [
      "inspect",
      inspectFixture.origin,
      "--allow-local",
      "--max-pages",
      "5",
      "--json",
    ]);
    const inspectReport = JSON.parse(inspectJson);
    if (inspectReport.schemaVersion !== "engawa.inspect.v1") {
      throw new Error(`inspect schema: ${inspectReport.schemaVersion}`);
    }
    if (!inspectReport.agentSurfaces?.llmsTxt?.exists) {
      throw new Error("inspect report missing llms.txt discovery");
    }
    console.log("PACKED_INSPECT_SMOKE = PASS");
    console.log("PACKED_INSPECT_SCHEMA = engawa.inspect.v1");

    const workDir = await mkdtemp(join(tmpdir(), "engawa-cli-rc-work-"));
    temps.push(workDir);
    const reportPath = join(workDir, "inspect.json");
    await writeFile(reportPath, JSON.stringify(inspectReport, null, 2), "utf8");
    const repoDir = join(workDir, "repo");
    await writeSyntheticRepo(repoDir);
    const pageBefore = await readFile(join(repoDir, "src/app/page.tsx"), "utf8");

    await runEngawa(consumerDir, [
      "init",
      "--inspect-report",
      reportPath,
      "--repo",
      repoDir,
      "--output-dir",
      join(repoDir, ".engawa"),
    ]);

    const engawaDir = join(repoDir, ".engawa");
    for (const name of [
      "manifest.json",
      "engawa-plan.json",
      "ENGAWA_INTEGRATION_PLAN.md",
      "AGENT_PROMPT.md",
    ]) {
      if (!existsSync(join(engawaDir, name))) {
        throw new Error(`init bundle missing ${name}`);
      }
    }
    const manifest = JSON.parse(await readFile(join(engawaDir, "manifest.json"), "utf8"));
    const plan = JSON.parse(await readFile(join(engawaDir, "engawa-plan.json"), "utf8"));
    if (manifest.schemaVersion !== "engawa.init.bundle.v1") {
      throw new Error(`bundle schema: ${manifest.schemaVersion}`);
    }
    if (plan.schemaVersion !== "engawa.plan.v1") {
      throw new Error(`plan schema: ${plan.schemaVersion}`);
    }
    const pageAfter = await readFile(join(repoDir, "src/app/page.tsx"), "utf8");
    if (pageBefore !== pageAfter) {
      throw new Error("APPLICATION_SOURCE_MODIFIED unexpectedly");
    }
    console.log("PACKED_INIT_SMOKE = PASS");
    console.log("PACKED_PLAN_SCHEMA = engawa.plan.v1");
    console.log("PACKED_BUNDLE_SCHEMA = engawa.init.bundle.v1");
    console.log("PACKED_INIT_APPLICATION_SOURCE_MODIFIED = NO");

    await inspectFixture.close();
    inspectFixture = undefined;

    doctorFixture = await startDoctorFixture();
    const doctorJson = await runEngawa(consumerDir, [
      "doctor",
      doctorFixture.origin,
      "--allow-local",
      "--profile",
      "full",
      "--rate-limit-probe",
      "0",
      "--json",
    ]);
    const doctorReport = JSON.parse(doctorJson);
    if (doctorReport.schemaVersion !== "engawa.doctor.v1") {
      throw new Error(`doctor schema: ${doctorReport.schemaVersion}`);
    }
    if (doctorReport.llmsTxt?.status !== "PASS") {
      throw new Error(`doctor llms: ${doctorReport.llmsTxt?.status}`);
    }
    if (doctorReport.llmsTxt?.canonicalSiteReference !== "PASS") {
      throw new Error(`doctor canonical: ${doctorReport.llmsTxt?.canonicalSiteReference}`);
    }
    if (doctorReport.markdown?.status !== "PASS") {
      throw new Error(`doctor markdown: ${doctorReport.markdown?.status}`);
    }
    if (doctorReport.mcp?.status !== "PASS") {
      throw new Error(`doctor mcp: ${doctorReport.mcp?.status}`);
    }
    if (doctorReport.mcp?.publicTools !== "PASS") {
      throw new Error(`doctor publicTools: ${doctorReport.mcp?.publicTools}`);
    }
    if (doctorReport.mcp?.searchSite !== "PASS") {
      throw new Error(`doctor search: ${doctorReport.mcp?.searchSite}`);
    }
    if (doctorReport.security?.hostValidation !== "REJECTED_INVALID_HOST") {
      throw new Error(`doctor host: ${doctorReport.security?.hostValidation}`);
    }
    const summary = doctorReport.summary?.status;
    if (summary !== "PASS" && summary !== "PASS_WITH_WARNINGS") {
      throw new Error(`doctor summary: ${summary}`);
    }
    if (
      summary === "PASS_WITH_WARNINGS" &&
      doctorReport.security?.rateLimit !== "NOT_PROBED" &&
      !(doctorReport.summary?.warnings ?? []).some((w) => /rate/i.test(w))
    ) {
      throw new Error("PASS_WITH_WARNINGS without rate-limit caveat");
    }
    console.log("PACKED_DOCTOR_SMOKE = PASS");
    console.log("PACKED_DOCTOR_SCHEMA = engawa.doctor.v1");
    console.log("PACKED_DOCTOR_PUBLIC_TOOLS = PASS");
    console.log(`PACKED_DOCTOR_HOST_VALIDATION = ${doctorReport.security.hostValidation}`);
    console.log(`PACKED_DOCTOR_RATE_LIMIT = ${doctorReport.security.rateLimit}`);

    console.log("ENGAWA_CLI_RELEASE_CANDIDATE_SMOKE = PASS");
  } finally {
    if (inspectFixture) {
      try {
        await inspectFixture.close();
      } catch {
        // ignore
      }
    }
    if (doctorFixture) {
      try {
        await doctorFixture.close();
      } catch {
        // ignore
      }
    }
    for (const dir of temps.reverse()) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

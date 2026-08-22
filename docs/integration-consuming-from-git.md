# Consuming Engawa from Git (without npm publish)

Engawa packages are not published to the public npm registry in v0.1. Downstream sites can consume them reproducibly via a **git submodule** (or other pinned git checkout) and **`file:` dependencies**.

## Recommended pattern

1. Add a submodule at a pinned commit:

   ```bash
   git submodule add https://github.com/thierry-gilgen-ict/engawa.git vendor/engawa
   cd vendor/engawa && git checkout <engawa-commit-sha>
   ```

2. Reference packages from the consuming project's `package.json`:

   ```json
   {
     "dependencies": {
       "@thierry-gilgen-ict/engawa-core": "file:vendor/engawa/packages/core",
       "@thierry-gilgen-ict/engawa-discovery": "file:vendor/engawa/packages/discovery",
       "@thierry-gilgen-ict/engawa-mcp": "file:vendor/engawa/packages/mcp"
     }
   }
   ```

3. Install and build:

   ```bash
   git submodule update --init --recursive
   npm ci
   ```

   Each Engawa package runs `prepare` → `build` on install, emitting `dist/` for TypeScript consumers.

4. CI must checkout submodules:

   ```yaml
   - uses: actions/checkout@v4
     with:
       submodules: recursive
   ```

5. Docker builds must copy `vendor/engawa` before `npm ci` (or run an explicit engawa build script in the build stage).

## Upgrading Engawa

1. Update the submodule pointer to a new commit on `thierry-gilgen-ict/engawa` `main`.
2. Run `npm ci` (or your engawa build script) to refresh `dist/`.
3. Run the downstream site's tests and MCP smoke checks.

Record the Engawa commit SHA in the consuming project's integration documentation.

## Requirements

- **Node.js 24+** (see root `engines` in Engawa).
- Do not copy Engawa source into the consuming repo; use the dependency mechanism above.
- Site-specific adapters and content belong in the consuming project, not in Engawa core packages.

## Alternatives

- **npm publish** to a registry (future): same package names, no `file:` paths.
- **GitHub Packages**: possible for org-hosted artifacts; not required for v0.1.

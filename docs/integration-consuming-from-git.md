# Consuming Engawa from Git (development / pre-release)

**Production sites should use npm registry packages.** See [integration-consuming-from-npm.md](./integration-consuming-from-npm.md).

This document covers git submodule consumption for Engawa development or testing before a registry release.

## Pattern

1. Add a submodule at a pinned commit:

   ```bash
   git submodule add https://github.com/thierry-gilgen-ict/engawa.git vendor/engawa
   cd vendor/engawa && git checkout <engawa-commit-sha>
   ```

2. Build Engawa packages locally before linking:

   ```bash
   cd vendor/engawa
   pnpm install --frozen-lockfile
   pnpm build
   ```

3. Reference built packages via `file:` dependencies (npm only — use `0.1.0` semver deps between Engawa packages, not `workspace:*`).

This path is **not** recommended for production CI/Docker because it requires vendoring source and explicit build ordering.

## Requirements

- Node.js 24+
- Do not copy Engawa source into the consuming repo without a submodule pin.

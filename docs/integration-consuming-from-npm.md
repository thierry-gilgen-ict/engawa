# Consuming Engawa from npm

Engawa v0.1 packages are published to the public npm registry under the `@thierry-gilgen-ict` scope.

## Recommended pattern (production sites)

```json
{
  "dependencies": {
    "@thierry-gilgen-ict/engawa-core": "0.1.1",
    "@thierry-gilgen-ict/engawa-discovery": "0.1.1",
    "@thierry-gilgen-ict/engawa-mcp": "0.1.1"
  }
}
```

```bash
npm ci
```

Packages ship prebuilt `dist/` output. No git submodule or local Engawa checkout is required.

## Requirements

- **Node.js 24+** (see root `engines` in Engawa).
- Site-specific adapters and content belong in the consuming project, not in Engawa core packages.

## Upgrading

1. Bump the pinned versions in `package.json` (or lockfile) to a newer Engawa release.
2. Run `npm ci` and your site's test suite.
3. Record the Engawa version in your integration documentation.

## Alternative: git submodule (development only)

For Engawa monorepo development or pre-release testing, see [integration-consuming-from-git.md](./integration-consuming-from-git.md). Production reference sites should use npm registry packages.

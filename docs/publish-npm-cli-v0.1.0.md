# Engawa CLI v0.1.0 on npm (published)

**Status:** Published to the public npm registry.

**Date:** 2026-08-25

| Package                          | Version |
| -------------------------------- | ------- |
| `@thierry-gilgen-ict/engawa-cli` | 0.1.0   |

**Release source SHA:** `eb24aabf5d69ab12145588fddf18596e63eee2b6`

**Package-specific tag:** `engawa-cli-v0.1.0` → `eb24aab`

Do **not** republish `0.1.0`. Future CLI changes ship as a new semver release.

Do **not** move global tag `v0.1.0` or other Engawa package tags.

## Release artifact evidence

Reviewed tarball published from merged `main`:

| Field     | Value                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------ |
| SHA256    | `237b3288d57e562ff98cc9255ea2c84d20e3853f5c9f7b281836814dc9f48aaa`                               |
| npm shasum | `74cfa835531b74f07c0dafc9ed007f5afa815f91`                                                       |
| integrity | `sha512-pPFWMH3d2qreaxaXhk1MHg5pw9kP8pVZLAgXrCY0lM9zfo/1lcsSY2ZSlGJcoZghL80ywRA2wF3U1574A6YQnw==` |

## Consumption

```bash
npm install @thierry-gilgen-ict/engawa-cli@0.1.0
```

```bash
npx @thierry-gilgen-ict/engawa-cli@0.1.0 inspect https://example.com
npx @thierry-gilgen-ict/engawa-cli@0.1.0 init --url https://example.com --repo .
npx @thierry-gilgen-ict/engawa-cli@0.1.0 doctor https://example.com
```

See [packages/cli/README.md](../packages/cli/README.md).

## Verify clean registry install

```bash
npm view @thierry-gilgen-ict/engawa-cli@0.1.0 version
npm view @thierry-gilgen-ict/engawa-cli dist-tags
engawa --version   # after npm install
```

Expect version `0.1.0`, `latest` tag `0.1.0`, and `engawa --version` → `0.1.0`.

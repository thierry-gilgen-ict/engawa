# Engawa v0.1.1 on npm (published)

**Status:** Published to the public npm registry.

**Release source SHA:** `cec86afd56e446b6d84fb124edaf08fa1185a0c8`

| Package                                | Version |
| -------------------------------------- | ------- |
| `@thierry-gilgen-ict/engawa-core`      | 0.1.1   |
| `@thierry-gilgen-ict/engawa-discovery` | 0.1.1   |
| `@thierry-gilgen-ict/engawa-mcp`       | 0.1.1   |
| `@thierry-gilgen-ict/engawa-react`     | 0.1.0   |

`engawa-react` was **not** republished in this release.

**Package-specific tags** (all point to release source SHA):

| Tag                       | Commit    |
| ------------------------- | --------- |
| `engawa-core-v0.1.1`      | `cec86af` |
| `engawa-discovery-v0.1.1` | `cec86af` |
| `engawa-mcp-v0.1.1`       | `cec86af` |

Do **not** move global tag `v0.1.0` or `engawa-react-v0.1.0`.

## Release artifact evidence

Reviewed tarballs published from merged `main`:

| Package   | SHA256                                                             | npm shasum                                 | integrity                                                                                         |
| --------- | ------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| core      | `19EE4BD0F5ED787D7E0F935532C95C777F788A737E47A9FBE606A87B1983D813` | `501cce7a6339ccc62620d04256787b478d84dbb2` | `sha512-Gw5fRjbaczUtwVlPXjlOgkg0ok6wmuk7+XA1h8ATKw5Ohi/NNmmdKpKhzrz6CcmJj2Zxt+KeRf/MKHXVIFS8/A==` |
| discovery | `0833AEC8F19C0370392BF1EC3F2FF6B6AC4AE57E173F93D6F7861DA720F9D7D4` | `cf52badd6ad719d85ce43e0d3a139bcad58a3c83` | `sha512-fy7H0TUYd1a6Okxrn0B3n/8bA7tpzM7GEKyvQutwNLwXC99uFee+2rSe2IG4UoPA+vZj4Ph62DEhapZSxmx2xg==` |
| mcp       | `7667FE29AA6DC553016D41C1E36EEE2CEAB8EEA831952CBB10175634EABB17A0` | `f6338f92c039980f3b024d6daf1dc42208232143` | `sha512-Mfga29HakvU8Cb/DUYzloLkrmBhy1iq20aOvocl9LAx+5ml6hbbJ54T/0bY01QaTxZo6Kh90BamlE/R58J6hsQ==` |

## Consumption (downstream sites)

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

See [integration-consuming-from-npm.md](./integration-consuming-from-npm.md).

## Verify clean registry install

```bash
node scripts/external-consumer-smoke.mjs 0.1.1
```

Expect `ENGAWA_EXTERNAL_CONSUMER_SMOKE = PASS`.

## Scope

- Package-level `engines.node: ">=24"` metadata for core, discovery, and mcp
- Release packaging housekeeping (staged tarball publish path)
- No runtime API changes in this patch

# @thierry-gilgen-ict/engawa-map

Optional CLI client for the [Engawa Distribution Map](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/distribution-map.md). This package is **registry-client tooling only** — it does not run in website runtime, MCP, or React.

**Status:** Implemented in this monorepo. Not published to npm. Registry is a separate service ([engawa-map-registry](https://github.com/thierry-gilgen-ict/engawa-map-registry)); staging is live.

## Requirements

- Node.js 24+
- `ENGAWA_MAP_ENDPOINT` — required today. Staging: `https://staging-engawa-map.thierry-gilgen-ict.ch`. Production default after DM3B/DM3D: `https://engawa-map.thierry-gilgen-ict.ch`

## Install (monorepo; npm after DM3D)

```bash
pnpm add -D @thierry-gilgen-ict/engawa-map
```

## Configuration

Create `engawa-map.config.json` in your project root (public, committable):

```json
{
  "displayName": "Example Site",
  "canonicalUrl": "https://example.com",
  "hints": {
    "framework": "nextjs",
    "byaEnabled": true,
    "localeCount": 2
  }
}
```

After registration, `siteId` may be added to this file. **Never** commit bearer tokens here.

Secrets live in `.engawa-map.local.json` (gitignored) or `ENGAWA_MAP_TOKEN` for dedicated CI jobs. Environment variable takes precedence over the local file.

## Commands

```bash
engawa-map register          # interactive confirmation (default: no)
engawa-map register --dry-run
engawa-map register --yes    # non-interactive CI / dedicated jobs
engawa-map status
engawa-map unregister
```

`--dry-run` prints the exact registration JSON with zero network calls and zero local writes.

## Security notes

- Client-generated 256-bit site token; server receives SHA-256 hash only via `Engawa-Map-Site-Token-Hash`
- No `--token` flag; no `.env` scanning; no application code execution
- Package versions read from `node_modules` metadata only
- Registry responses validated with strict Zod schemas; terminal output sanitized
- See [distribution-map-api.md](../../docs/distribution-map-api.md) and [distribution-map-threat-model.md](../../docs/distribution-map-threat-model.md)

## Related

- [Distribution Map policy](../../docs/distribution-map.md)
- [API contract](../../docs/distribution-map-api.md)
- [DM3A production launch contract](../../docs/distribution-map-production-launch.md)

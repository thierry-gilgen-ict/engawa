# @thierry-gilgen-ict/engawa-map

Optional CLI client for the [Engawa Distribution Map](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/distribution-map.md). This package is **registry-client tooling only** — it does not run in website runtime, MCP, or React.

**Status:** Implemented in this monorepo (DM1 CLI client). Not published to npm yet. No registry backend ships with this package.

## Requirements

- Node.js 24+
- A future registry endpoint via `ENGAWA_MAP_ENDPOINT` (host to be announced)

## Install (monorepo / future npm)

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

# @thierry-gilgen-ict/engawa-map

Optional CLI for the [Engawa Distribution Map](https://github.com/thierry-gilgen-ict/engawa/blob/main/docs/distribution-map.md). Registry-client tooling only — it does **not** run in website runtime, MCP, or React. Engawa never phones home from normal application packages.

**Status:** `@thierry-gilgen-ict/engawa-map@0.1.0` on npm. Production registry is live at [engawa-map.thierry-gilgen-ict.ch](https://engawa-map.thierry-gilgen-ict.ch).

## Requirements

- Node.js 24+
- Default registry endpoint: `https://engawa-map.thierry-gilgen-ict.ch` when `ENGAWA_MAP_ENDPOINT` is unset
- Staging override: `ENGAWA_MAP_ENDPOINT=https://staging-engawa-map.thierry-gilgen-ict.ch`

## Install

```bash
npm install --save-dev @thierry-gilgen-ict/engawa-map
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
npx engawa-map register          # interactive confirmation (default: no)
npx engawa-map register --dry-run
npx engawa-map register --yes    # non-interactive deliberate registration
npx engawa-map status
npx engawa-map unregister
```

`--dry-run` prints the exact registration JSON with zero network calls and zero local writes.

## Lifecycle

Registration is **voluntary** and **operator-initiated**. The first successful registration is always `PENDING`. Sites become publicly listed only after **manual approval**. There is no automatic publish and no runtime phone-home.

## Security notes

- Client-generated 256-bit site token; server receives SHA-256 hash only via `Engawa-Map-Site-Token-Hash`
- Raw bearer token stays local; server stores hash only and never returns the raw token
- No `--token` flag; no `.env` scanning; no application code execution
- Package versions read from `node_modules` metadata only
- Registry responses validated with strict schemas; terminal output sanitized
- See [distribution-map-api.md](../../docs/distribution-map-api.md) and [distribution-map-threat-model.md](../../docs/distribution-map-threat-model.md)

## Related

- Public showcase: [engawa-map.thierry-gilgen-ict.ch](https://engawa-map.thierry-gilgen-ict.ch)
- [Distribution Map policy](../../docs/distribution-map.md)
- [API contract](../../docs/distribution-map-api.md)
- [Production launch contract](../../docs/distribution-map-production-launch.md)

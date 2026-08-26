# Example: multi-locale site

Bounded reference for [multi-locale Engawa guidance](../../docs/multi-locale.md).

```text
HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE
AUTO_TRANSLATION = NO
MODEL_CALLS = NONE
NETWORK_CALLS = NONE
MULTI_LOCALE_REQUIRES_RUNTIME = NO
```

This example uses `@thierry-gilgen-ict/engawa-core` and `@thierry-gilgen-ict/engawa-discovery` as **consumer APIs only**. It does not change published runtime packages.

## Locales

| Locale | Resource ID  | Human URL     | Markdown URL     |
| ------ | ------------ | ------------- | ---------------- |
| `de`   | `de-ankauf`  | `/de/ankauf`  | `/de/ankauf.md`  |
| `en`   | `en-selling` | `/en/selling` | `/en/selling.md` |

Draft English content exists in `content.mjs` but is **excluded** from the adapter (not human-public).

## Run

From repository root (after `pnpm build`):

```bash
node examples/multi-locale-site/build.mjs
```

## Files

| Path                         | Purpose                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| [`content.mjs`](content.mjs) | Explicit DE/EN public sources + draft sentinel                  |
| [`adapter.mjs`](adapter.mjs) | Locale-aware IDs, `metadata.locale`, canonical URLs             |
| [`build.mjs`](build.mjs)     | listResources, combined + filtered `buildLlmsTxt`, search proof |

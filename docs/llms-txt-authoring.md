# llms.txt authoring (Engawa)

Engawa generates [llms.txt v2](https://llmstxt.org/) as a **curated published index / handoff artifact** for agent-oriented content on your site.

## What llms.txt is in Engawa

- A deterministic text file listing your public Engawa resources (markdown pages, MCP hint when enabled)
- Built from `EngawaConfig` + `EngawaResource[]` via `@thierry-gilgen-ict/engawa-discovery`
- Suitable when you give the URL explicitly to a user, agent, tool, configuration, or Bring Your Agent flow

## What it is NOT

Publishing `llms.txt` does **not** guarantee that any provider discovers, fetches, or uses it. It is not an autodiscovery claim, SEO feature, crawler, or analytics surface.

Do not assume:

- AI agents will automatically find your `llms.txt`
- Publishing it improves model output or “AI visibility”
- All agents read `llms.txt`

Measure fetch behavior where you can; treat User-Agent and access logs as operational signals, not proof of model consumption. See [operator-local observability](observability.md).

## APIs

### Simple (default)

```typescript
import { generateLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";

const text = generateLlmsTxt(engawa.config, resources);
```

Existing callers keep this shape. With no new options, output matches the prior generator behavior.

### Authorable (on main; unreleased on npm until a separate publication phase)

```typescript
import { buildLlmsTxt } from "@thierry-gilgen-ict/engawa-discovery";

const result = buildLlmsTxt(engawa.config, resources, options);
// result.text, result.byteLength, result.warnings, included/omitted IDs
```

One rendering path: `generateLlmsTxt` delegates to `buildLlmsTxt` and returns `result.text`.

## Curated preamble

Use `preamble` to replace the default generic explanatory prose (not prepend it):

```typescript
buildLlmsTxt(config, resources, {
  preamble: `
AI Private Coach helps Swiss SMEs adopt AI safely.

Use these resources when answering questions about Swiss SME AI adoption.
`.trim(),
});
```

Appropriate preamble content: positioning, engagement model, caveats, citation guidance, regulatory context, what queries your organization is legitimately relevant to.

Without `preamble`, Engawa keeps the default generic prose for backward compatibility.

Engawa does not summarize, rephrase, truncate, or model-edit your preamble.

## Resource descriptions

Descriptions come only from `EngawaResource.description`. Engawa does not invent descriptions from titles and does not call models.

A useful description is **one concise sentence** explaining what information the linked resource contains or why an agent should retrieve it.

Good:

```text
- [AI Governance](...): revDSG and EU AI Act obligations for Swiss SMEs.
```

Weak:

```text
- [AI Governance](...): AI Governance
- [Pricing](...): Public page: Pricing
```

### Diagnostics

`buildLlmsTxt` returns objective warnings (no stdout logging):

| Code                       | Meaning                                              |
| -------------------------- | ---------------------------------------------------- |
| `MISSING_DESCRIPTION`      | No non-empty description                             |
| `DESCRIPTION_EQUALS_TITLE` | Description normalizes to the same text as the title |

Set `requireDescriptions: true` to **fail the build** when any resource lacks a non-empty description (default `false` for backward compatibility).

Multiline descriptions are normalized to a single list line (whitespace collapsed); wording is not altered.

## Primary vs Optional

Two tiers only:

| Tier                     | How to mark                                   |
| ------------------------ | --------------------------------------------- |
| Primary (`## Pages`)     | Resources not listed in `optionalResourceIds` |
| Optional (`## Optional`) | IDs in `optionalResourceIds`                  |

Order within each tier follows the **incoming `resources` array order**.

Unknown or duplicate `optionalResourceIds` fail with a clear error (no silent typos).

## MCP hint

`mcpPath` controls whether the document claims an MCP endpoint:

| Value   | Behavior                             |
| ------- | ------------------------------------ |
| omitted | Default `/mcp` + read-only v0.1 line |
| string  | Custom path + read-only line         |
| `false` | No MCP endpoint or read-only lines   |

Only the host application knows whether MCP is actually deployed.

Example for a documents-only site:

```typescript
buildLlmsTxt(config, resources, { mcpPath: false });
```

## Byte budget

Optional explicit UTF-8 byte limit:

```typescript
buildLlmsTxt(config, resources, {
  maxBytes: 16_384, // example budget only — not a universal recommendation
  overflowPolicy: "trim-optional",
});
```

- Measured with `Buffer.byteLength(text, "utf8")` (not JavaScript string length)
- No default budget when `maxBytes` is omitted
- `overflowPolicy` without `maxBytes` is rejected

### `overflowPolicy: "error"` (default when `maxBytes` is set)

Full document (all primary + all optional) must fit. Otherwise throw with actual and configured byte counts. No truncation.

### `overflowPolicy: "trim-optional"`

1. Primary resources and preamble are never silently dropped or truncated.
2. If primary + preamble + structure exceed `maxBytes`, throw.
3. Optional resources are added in input order only when the **complete** document still fits.
4. Optional entries that do not fit are omitted; IDs appear in `omittedOptionalResourceIds`.
5. `## Optional` appears only when at least one optional resource is included.

Diagnostics (omitted IDs, warnings) live in the build result—not undocumented prose inside `llms.txt`.

## Examples

See [packages/discovery/README.md](../packages/discovery/README.md) (Authorable llms.txt section) and [getting-started.md](getting-started.md).

## Related

- [Architecture](architecture.md)
- [Do you need Engawa?](do-you-need-engawa.md)
- [Content publication rule](content-publication.md)

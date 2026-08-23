# Provider capability matrix

Research date: 2026-08-23. Sources are official documentation unless noted.

Engawa UI derives provider actions from this matrix. Do not invent deep-link URL formats.

## Capability legend

| Value               | Meaning                                                |
| ------------------- | ------------------------------------------------------ |
| SUPPORTED           | Officially documented and usable today                 |
| PARTIALLY_SUPPORTED | Documented with plan/account limits or narrow scope    |
| MANUAL              | User must complete setup in provider UI or config file |
| UNKNOWN             | Not confirmed in official docs                         |
| NOT_SUPPORTED       | Officially absent or contradicted                      |

## UI action classes

| Action                       | Description                                                          |
| ---------------------------- | -------------------------------------------------------------------- |
| DIRECT_HANDOFF               | Documented deep link that opens provider with MCP URL pre-configured |
| COPY_CONTEXT                 | Copy contextual handoff message for the user to paste                |
| COPY_MCP_URL                 | Copy MCP endpoint URL                                                |
| COPY_CONNECTION_DETAILS      | Copy structured connection snippet (e.g. Cursor `mcp.json`)          |
| SHOW_CONNECTION_INSTRUCTIONS | Show step-by-step manual setup                                       |
| OPEN_PROVIDER                | Open provider site or connector portal (browser handoff)             |
| UNSUPPORTED                  | No viable path; show generic MCP only                                |

---

## ChatGPT (OpenAI)

| Field                         | Value                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP_SUPPORT                   | PARTIALLY_SUPPORTED — plan and workspace gated; not universal on Free/Go/Plus                                                                              |
| REMOTE_MCP_SUPPORT            | PARTIALLY_SUPPORTED — remote HTTPS MCP where Developer Mode / workspace policy allows                                                                      |
| CUSTOM_SERVER_SUPPORT         | PARTIALLY_SUPPORTED — custom MCP connectors via Apps / Developer Mode (subject to admin controls)                                                          |
| PLAN_AVAILABILITY             | Free/Go: no custom MCP connectors; Plus/Pro: Developer Mode on web (paid plans); Business/Enterprise/Edu: workspace apps with admin controls               |
| WORKSPACE_LIMITATIONS         | Business/Enterprise/Edu admins enable Developer Mode, publish/test apps; RBAC on Enterprise/Edu; members cannot add custom apps without permission         |
| CURRENT_SETUP_PATH            | Individual: Settings → Security and login (Developer Mode); workspace: Settings → Apps → Create custom MCP connector; remote HTTPS MCP only                |
| DIRECT_CONNECT_DEEP_LINK      | NOT_SUPPORTED — no official third-party URL to pre-register a connector                                                                                    |
| PREPOPULATED_PROMPT_DEEP_LINK | NOT_SUPPORTED for MCP setup                                                                                                                                |
| BROWSER_HANDOFF               | SUPPORTED — user opens ChatGPT and adds connector manually                                                                                                 |
| MANUAL_CONNECTION_REQUIRED    | YES — Developer Mode / workspace Apps flow; custom MCP connector with server URL                                                                           |
| OFFICIAL_LOGO_ASSET           | Use text label "ChatGPT"; OpenAI brand assets require brand guidelines compliance                                                                          |
| BRAND_USAGE_RESTRICTIONS      | Follow [OpenAI brand guidelines](https://openai.com/brand); do not redistribute logos without permission                                                   |
| DOCUMENTATION_URL             | https://developers.openai.com/api/docs/guides/developer-mode , https://help.openai.com/en/articles/12584461 , https://help.openai.com/en/articles/11509118 |

**Engawa UI actions:** `OPEN_PROVIDER`, `COPY_MCP_URL`, `COPY_CONTEXT`, `SHOW_CONNECTION_INSTRUCTIONS`

**Honest button labels:** "Open ChatGPT", "Copy MCP URL", "Copy context for your agent", "Setup instructions"

**Notes:** Generic MCP remains the canonical fallback when ChatGPT custom MCP is unavailable for the user's plan or workspace.

---

## Claude (Anthropic)

| Field                         | Value                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| MCP_SUPPORT                   | SUPPORTED                                                                                              |
| REMOTE_MCP_SUPPORT            | SUPPORTED                                                                                              |
| CUSTOM_SERVER_SUPPORT         | SUPPORTED (remote MCP custom connectors)                                                               |
| DIRECT_CONNECT_DEEP_LINK      | NOT_SUPPORTED                                                                                          |
| PREPOPULATED_PROMPT_DEEP_LINK | NOT_SUPPORTED for MCP setup                                                                            |
| BROWSER_HANDOFF               | SUPPORTED — claude.ai / Claude Desktop connector UI                                                    |
| MANUAL_CONNECTION_REQUIRED    | YES — Customize → Connectors → Add custom connector (URL)                                              |
| OFFICIAL_LOGO_ASSET           | Text label "Claude"; Anthropic brand assets subject to brand policy                                    |
| BRAND_USAGE_RESTRICTIONS      | Follow Anthropic brand usage; text-only fallback preferred without explicit license                    |
| DOCUMENTATION_URL             | https://support.anthropic.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp |

**Notes:** Authless public MCP (`none`) is supported for connectors without OAuth. Engawa public MCP is read-only and unauthenticated.

**Engawa UI actions:** `OPEN_PROVIDER`, `COPY_MCP_URL`, `COPY_CONTEXT`, `SHOW_CONNECTION_INSTRUCTIONS`

**Honest button labels:** "Open Claude", "Copy MCP URL", "Copy context for your agent", "Setup instructions"

---

## Grok (xAI)

| Field                         | Value                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------- |
| MCP_SUPPORT                   | SUPPORTED                                                                         |
| REMOTE_MCP_SUPPORT            | SUPPORTED (Streamable HTTP / SSE)                                                 |
| CUSTOM_SERVER_SUPPORT         | SUPPORTED (Custom MCP at grok.com/connectors)                                     |
| DIRECT_CONNECT_DEEP_LINK      | NOT_SUPPORTED                                                                     |
| PREPOPULATED_PROMPT_DEEP_LINK | NOT_SUPPORTED for MCP setup                                                       |
| BROWSER_HANDOFF               | SUPPORTED — https://grok.com/connectors                                           |
| MANUAL_CONNECTION_REQUIRED    | YES — New Connector → Custom → server URL                                         |
| OFFICIAL_LOGO_ASSET           | Text label "Grok"; xAI brand subject to xAI terms                                 |
| BRAND_USAGE_RESTRICTIONS      | Text-only unless official asset license confirmed                                 |
| DOCUMENTATION_URL             | https://docs.x.ai/grok/connectors , https://docs.x.ai/developers/tools/remote-mcp |

**Engawa UI actions:** `OPEN_PROVIDER`, `COPY_MCP_URL`, `COPY_CONTEXT`, `SHOW_CONNECTION_INSTRUCTIONS`

**Honest button labels:** "Open Grok connectors", "Copy MCP URL", "Copy context for your agent", "Setup instructions"

---

## Cursor

| Field                         | Value                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP_SUPPORT                   | SUPPORTED                                                                                                                                                  |
| REMOTE_MCP_SUPPORT            | SUPPORTED (Streamable HTTP, SSE)                                                                                                                           |
| CUSTOM_SERVER_SUPPORT         | SUPPORTED (`url` in `mcp.json` or project `.cursor/mcp.json`)                                                                                              |
| DIRECT_CONNECT_DEEP_LINK      | PARTIALLY_SUPPORTED — "Add to Cursor" deep links exist for **server authors** listing their MCP; not a generic handoff URL for arbitrary third-party sites |
| PREPOPULATED_PROMPT_DEEP_LINK | NOT_SUPPORTED                                                                                                                                              |
| BROWSER_HANDOFF               | SUPPORTED — Cursor docs / Settings → Tools & MCP                                                                                                           |
| MANUAL_CONNECTION_REQUIRED    | YES — user adds `url` entry to MCP config                                                                                                                  |
| OFFICIAL_LOGO_ASSET           | Text label "Cursor"; Anysphere brand assets                                                                                                                |
| BRAND_USAGE_RESTRICTIONS      | Text-only default                                                                                                                                          |
| DOCUMENTATION_URL             | https://cursor.com/docs/mcp                                                                                                                                |

**Engawa UI actions:** `COPY_MCP_URL`, `COPY_CONNECTION_DETAILS`, `SHOW_CONNECTION_INSTRUCTIONS`, `OPEN_PROVIDER` (docs)

**Honest button labels:** "Copy MCP config for Cursor", "Copy MCP URL", "Setup instructions", "Cursor MCP docs"

**Cursor `mcp.json` snippet pattern:**

```json
{
  "mcpServers": {
    "example-site": {
      "url": "https://www.example.com/mcp"
    }
  }
}
```

---

## Generic MCP client

| Field                         | Value                             |
| ----------------------------- | --------------------------------- |
| MCP_SUPPORT                   | SUPPORTED (protocol-level)        |
| REMOTE_MCP_SUPPORT            | SUPPORTED                         |
| CUSTOM_SERVER_SUPPORT         | SUPPORTED                         |
| DIRECT_CONNECT_DEEP_LINK      | UNKNOWN — depends on client       |
| PREPOPULATED_PROMPT_DEEP_LINK | UNKNOWN                           |
| BROWSER_HANDOFF               | MANUAL                            |
| MANUAL_CONNECTION_REQUIRED    | YES                               |
| OFFICIAL_LOGO_ASSET           | N/A — use "Other MCP client" text |
| BRAND_USAGE_RESTRICTIONS      | N/A                               |
| DOCUMENTATION_URL             | https://modelcontextprotocol.io   |

**Engawa UI actions:** `COPY_MCP_URL`, `COPY_CONNECTION_DETAILS`, `SHOW_CONNECTION_INSTRUCTIONS` — **always shown**

---

## Summary table

| Provider | Remote MCP | Deep link connect           | Manual setup | Primary Engawa actions                          |
| -------- | ---------- | --------------------------- | ------------ | ----------------------------------------------- |
| ChatGPT  | PARTIAL    | NOT_SUPPORTED               | YES          | Open provider, copy URL/context, instructions   |
| Claude   | SUPPORTED  | NOT_SUPPORTED               | YES          | Open provider, copy URL/context, instructions   |
| Grok     | SUPPORTED  | NOT_SUPPORTED               | YES          | Open connectors, copy URL/context, instructions |
| Cursor   | SUPPORTED  | PARTIAL (author links only) | YES          | Copy config, copy URL, instructions, docs       |
| Generic  | SUPPORTED  | UNKNOWN                     | YES          | Copy URL, connection details, instructions      |

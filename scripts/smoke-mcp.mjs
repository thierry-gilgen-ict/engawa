/**
 * MCP smoke test against a running minimal-site server.
 * Usage: node scripts/smoke-mcp.mjs
 */
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const baseUrl = new URL("http://127.0.0.1:3847/mcp");
const transport = new StreamableHTTPClientTransport(baseUrl);
const client = new Client({ name: "engawa-smoke", version: "0.1.0" });

await client.connect(transport);

const resources = await client.listResources();
console.log("MCP_RESOURCE_LIST=", resources.resources.length > 0 ? "PASS" : "FAIL");
console.log("resources:", resources.resources.map((r) => r.uri).join(", "));

const about = resources.resources.find((r) => r.uri.endsWith("/about"));
if (!about) throw new Error("about resource missing");
const read = await client.readResource({ uri: about.uri });
const text = read.contents[0]?.text ?? "";
console.log("MCP_RESOURCE_READ=", text.includes("Example Studio") ? "PASS" : "FAIL");

const tools = await client.listTools();
console.log("tools:", tools.tools.map((t) => t.name).join(", "));

const search = await client.callTool({
  name: "search_site",
  arguments: { query: "services", limit: 5 },
});
const searchText =
  search.content?.[0]?.type === "text" ? search.content[0].text : JSON.stringify(search);
console.log("MCP_SEARCH_TOOL=", searchText.includes("services") ? "PASS" : "FAIL");

const rejected = await client.callTool({
  name: "search_site",
  arguments: { query: "", limit: 5 },
});
console.log("MCP_SEARCH_REJECT=", rejected.isError ? "PASS" : "FAIL");

await client.close();

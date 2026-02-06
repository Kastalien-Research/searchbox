#!/usr/bin/env node
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { exa } from "./lib/exa.js";
import { registerManageWebsetsTool } from "./tools/manageWebsets.js";

const app = createMcpExpressApp({
  host: '0.0.0.0'
});
const PORT = process.env.PORT || 3000;

const server = new McpServer({
  name: "websets-server",
  version: "2.0.0"
});

const transport = new StreamableHTTPServerTransport();

// Register the unified dispatcher tool
registerManageWebsetsTool(server, exa);

server.connect(transport);

app.all("/message", async (req, res) => {
  await transport.handleRequest(req, res);
});

app.listen(PORT, () => {
  console.log(`Websets MCP Server running on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/message`);
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTicketTools } from "./tools/ticket.js";
import { registerTransitionTools } from "./tools/transition.js";
import { registerFieldTools } from "./tools/field.js";
import { registerBoardTools } from "./tools/board.js";
import { registerChangelogTools } from "./tools/changelog.js";

const server = new McpServer({
  name: "jira",
  version: "1.0.0",
});

registerTicketTools(server);
registerTransitionTools(server);
registerFieldTools(server);
registerBoardTools(server);
registerChangelogTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Jira MCP server running on stdio");

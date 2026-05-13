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

// 환경변수 사전 확인 (경고만, 서버는 정상 시작)
const requiredEnvVars = ["JIRA_BASE_URL", "JIRA_USER_EMAIL", "JIRA_API_TOKEN"];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    `Warning: ${missingVars.join(", ")} 환경변수가 설정되지 않았습니다. ` +
    `Jira API 도구는 사용할 수 없지만, CHANGELOG 도구는 정상 동작합니다.`
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Jira MCP server running on stdio");

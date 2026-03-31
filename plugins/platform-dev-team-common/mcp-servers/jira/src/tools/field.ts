import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jiraFetch } from "../jira-client.js";

export function registerFieldTools(server: McpServer) {
  server.registerTool(
    "jira_update_field",
    {
      title: "Jira 커스텀 필드 변경",
      description: "티켓의 커스텀 필드 값을 변경합니다. select 타입은 {id: 'value'} 형태로 전달합니다.",
      inputSchema: z.object({
        ticketId: z.string().regex(/^[A-Z]+-\d+$/).describe("티켓 ID (예: SYN-1234)"),
        fieldId: z.string().describe("필드 ID (예: customfield_10659)"),
        value: z.any().describe("필드 값 (예: {id: '10678'})"),
      }),
    },
    async ({ ticketId, fieldId, value }) => {
      await jiraFetch(`/issue/${ticketId}`, {
        method: "PUT",
        body: JSON.stringify({ fields: { [fieldId]: value } }),
      });
      return {
        content: [{
          type: "text" as const,
          text: `${ticketId}의 ${fieldId} 변경 완료: ${JSON.stringify(value)}`,
        }],
      };
    }
  );
}

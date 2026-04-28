import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jiraAgileFetchJson } from "../jira-client.js";

export function registerBoardTools(server: McpServer) {
  server.registerTool(
    "jira_get_board",
    {
      title: "Jira 보드 조회",
      description: "Jira 보드 정보를 조회합니다.",
      inputSchema: z.object({
        boardId: z.number().describe("보드 ID"),
      }),
    },
    async ({ boardId }) => {
      const data = await jiraAgileFetchJson(`/board/${boardId}`);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            id: data.id,
            name: data.name,
            type: data.type,
            projectKey: data.location?.projectKey,
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "jira_get_sprint",
    {
      title: "Jira 스프린트 조회",
      description: "보드의 활성 스프린트 또는 특정 스프린트 정보를 조회합니다.",
      inputSchema: z.object({
        boardId: z.number().optional().describe("보드 ID (활성 스프린트 조회 시)"),
        sprintId: z.number().optional().describe("스프린트 ID (특정 스프린트 조회 시)"),
      }).refine(
        (data) => data.boardId !== undefined || data.sprintId !== undefined,
        { message: "boardId 또는 sprintId 중 하나를 제공해야 합니다." }
      ),
    },
    async ({ boardId, sprintId }) => {
      if (sprintId) {
        const data = await jiraAgileFetchJson(`/sprint/${sprintId}`);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      }
      // boardId는 refine에 의해 반드시 존재
      const data = await jiraAgileFetchJson(`/board/${boardId}/sprint?state=active`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.values, null, 2) }],
      };
    }
  );
}

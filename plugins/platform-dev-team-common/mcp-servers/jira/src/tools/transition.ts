import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jiraFetch, jiraFetchJson } from "../jira-client.js";

export function registerTransitionTools(server: McpServer) {
  server.registerTool(
    "jira_list_transitions",
    {
      title: "Jira 전이 목록 조회",
      description: "특정 티켓에서 가능한 상태 전이 목록을 조회합니다.",
      inputSchema: z.object({
        ticketId: z.string().regex(/^[A-Z]+-\d+$/).describe("티켓 ID (예: SYN-1234)"),
      }),
    },
    async ({ ticketId }) => {
      const data = await jiraFetchJson<{ transitions: any[] }>(`/issue/${ticketId}/transitions`);
      const transitions = data.transitions.map((t: any) => ({
        id: t.id,
        name: t.name,
        to: t.to?.name,
      }));
      return {
        content: [{ type: "text" as const, text: JSON.stringify(transitions, null, 2) }],
      };
    }
  );

  server.registerTool(
    "jira_transition",
    {
      title: "Jira 상태 전이",
      description: "티켓의 상태를 전이합니다. targetStatus로 이름을 지정하면 자동으로 transition ID를 찾아 실행합니다.",
      inputSchema: z.object({
        ticketId: z.string().regex(/^[A-Z]+-\d+$/).describe("티켓 ID (예: SYN-1234)"),
        targetStatus: z.string().describe("목표 상태 이름 (예: '리뷰 완료', '완료')"),
      }),
    },
    async ({ ticketId, targetStatus }) => {
      const data = await jiraFetchJson<{ transitions: any[] }>(`/issue/${ticketId}/transitions`);
      const transition = data.transitions.find(
        (t: any) => t.name === targetStatus || t.to?.name === targetStatus
      );
      if (!transition) {
        const available = data.transitions
          .map((t: any) => `${t.name} → ${t.to?.name}`)
          .join(", ");
        return {
          content: [{
            type: "text" as const,
            text: `'${targetStatus}' 전이를 찾을 수 없습니다. 가능한 전이: ${available}`,
          }],
        };
      }
      await jiraFetch(`/issue/${ticketId}/transitions`, {
        method: "POST",
        body: JSON.stringify({ transition: { id: transition.id } }),
      });
      return {
        content: [{
          type: "text" as const,
          text: `${ticketId}: ${transition.to?.name || targetStatus}(으)로 전이 완료 (transition: ${transition.name}, id: ${transition.id})`,
        }],
      };
    }
  );
}

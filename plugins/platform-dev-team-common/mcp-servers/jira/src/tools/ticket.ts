import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jiraFetch } from "../jira-client.js";

export function registerTicketTools(server: McpServer) {
  server.registerTool(
    "jira_get_ticket",
    {
      title: "Jira 티켓 조회",
      description: "Jira 티켓의 상태, 요약, 담당자, 커스텀 필드 등 핵심 정보를 조회합니다.",
      inputSchema: z.object({
        ticketId: z.string().regex(/^[A-Z]+-\d+$/).describe("티켓 ID (예: SYN-1234)"),
        fields: z.array(z.string()).optional().describe("조회할 필드 목록 (기본: summary, status, assignee, customfield_10659)"),
      }),
    },
    async ({ ticketId, fields }) => {
      const fieldList = fields?.join(",") || "summary,status,assignee,customfield_10659,issuetype,priority";
      const data = await jiraFetch(`/issue/${ticketId}?fields=${fieldList}`);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            key: data.key,
            summary: data.fields.summary,
            status: data.fields.status?.name,
            statusId: data.fields.status?.id,
            assignee: data.fields.assignee?.displayName || null,
            customfield_10659: data.fields.customfield_10659,
            issuetype: data.fields.issuetype?.name,
            priority: data.fields.priority?.name,
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "jira_search_tickets",
    {
      title: "Jira 티켓 검색",
      description: "JQL 쿼리로 Jira 티켓을 검색합니다.",
      inputSchema: z.object({
        jql: z.string().describe("JQL 쿼리문"),
        maxResults: z.number().optional().describe("최대 결과 수 (기본: 50)"),
        nextPageToken: z.string().optional().describe("다음 페이지 토큰 (이전 응답의 nextPageToken)"),
        fields: z.array(z.string()).optional().describe("조회할 필드 목록"),
      }),
    },
    async ({ jql, maxResults, nextPageToken, fields }) => {
      const fieldList = fields || ["summary", "status", "assignee", "issuetype"];
      const params = new URLSearchParams({
        jql,
        maxResults: String(maxResults || 50),
        fields: fieldList.join(","),
      });
      if (nextPageToken) {
        params.set("nextPageToken", nextPageToken);
      }
      const data = await jiraFetch(`/search/jql?${params}`);
      const issues = data.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name,
        assignee: issue.fields.assignee?.displayName || null,
      }));
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            issues,
            isLast: data.isLast,
            ...(data.nextPageToken ? { nextPageToken: data.nextPageToken } : {}),
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "jira_create_ticket",
    {
      title: "Jira 티켓 생성",
      description: "새로운 Jira 티켓을 생성합니다.",
      inputSchema: z.object({
        projectKey: z.string().describe("프로젝트 키 (예: SYN)"),
        summary: z.string().describe("티켓 요약"),
        issueType: z.string().optional().describe("이슈 타입 (기본: Task)"),
        description: z.string().optional().describe("티켓 설명 (plain text)"),
        assignee: z.string().optional().describe("담당자 account ID"),
      }),
    },
    async ({ projectKey, summary, issueType, description, assignee }) => {
      const fields: any = {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType || "Task" },
      };
      if (description) {
        fields.description = {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: description }] }],
        };
      }
      if (assignee) {
        fields.assignee = { accountId: assignee };
      }
      const data = await jiraFetch("/issue", {
        method: "POST",
        body: JSON.stringify({ fields }),
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ key: data.key, id: data.id, self: data.self }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "jira_update_ticket",
    {
      title: "Jira 티켓 수정",
      description: "기존 Jira 티켓의 필드를 수정합니다.",
      inputSchema: z.object({
        ticketId: z.string().regex(/^[A-Z]+-\d+$/).describe("티켓 ID (예: SYN-1234)"),
        fields: z.record(z.string(), z.any()).describe("수정할 필드들 (JSON 객체)"),
      }),
    },
    async ({ ticketId, fields }) => {
      await jiraFetch(`/issue/${ticketId}`, {
        method: "PUT",
        body: JSON.stringify({ fields }),
      });
      return {
        content: [{ type: "text" as const, text: `${ticketId} 수정 완료` }],
      };
    }
  );
}

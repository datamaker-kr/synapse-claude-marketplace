import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jiraFetch, jiraFetchJson } from "../jira-client.js";
import {
  markdownToAdf,
  type ADFBlock,
  type ADFDocument,
  type ADFTextNode,
} from "../markdown-to-adf.js";

const GET_DEFAULT_FIELDS = [
  "summary",
  "status",
  "assignee",
  "customfield_10659",
  "issuetype",
  "priority",
];

const SEARCH_DEFAULT_FIELDS = ["summary", "status", "assignee"];

// comment는 별도 엔드포인트에서 처리하므로 여기서는 매핑 대상 외
function mapTicketFields(
  raw: any,
  requested: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const f of requested) {
    switch (f) {
      case "summary":
        result.summary = raw.summary;
        break;
      case "status":
        result.status = raw.status?.name;
        result.statusId = raw.status?.id;
        break;
      case "assignee":
        result.assignee = raw.assignee?.displayName || null;
        break;
      case "issuetype":
        result.issuetype = raw.issuetype?.name;
        break;
      case "priority":
        result.priority = raw.priority?.name;
        break;
      case "description":
        result.description = raw.description ?? null;
        break;
      case "comment":
        // comment는 호출자에서 별도 엔드포인트로 처리
        break;
      default: {
        // 알려지지 않은 필드는 raw 값 그대로 패스스루. undefined는 응답 노이즈 방지를 위해 제외.
        const value = raw[f];
        if (value !== undefined) {
          result[f] = value;
        }
      }
    }
  }
  return result;
}

export function registerTicketTools(server: McpServer) {
  server.registerTool(
    "jira_get_ticket",
    {
      title: "Jira 티켓 조회",
      description:
        "Jira 티켓 정보를 조회합니다. fields 미지정 시 핵심 필드(summary, status, assignee, customfield_10659, issuetype, priority)만 반환하고, " +
        "'description', 'comment' 등을 fields에 포함하면 해당 정보도 함께 반환합니다.",
      inputSchema: z.object({
        ticketId: z.string().regex(/^[A-Z]+-\d+$/).describe("티켓 ID (예: SYN-1234)"),
        fields: z.array(z.string()).optional().describe(
          "조회할 필드 목록. 미지정 시 기본 필드 반환. 'description'(ADF), 'comment'(최근 N개) 추가 가능"
        ),
        commentLimit: z.number().int().positive().max(100).optional().describe(
          "fields에 'comment' 포함 시 반환할 최근 댓글 개수 (기본: 10, 최대: 100)"
        ),
      }),
    },
    async ({ ticketId, fields, commentLimit }) => {
      const requested = fields && fields.length > 0 ? fields : GET_DEFAULT_FIELDS;
      const wantsComment = requested.includes("comment");
      const limit = commentLimit ?? 10;

      // 메인 issue 조회 — comment는 제외
      const mainFields = requested.filter((f) => f !== "comment");
      const fetchFields = mainFields.length > 0 ? mainFields : ["summary"];
      const issueParams = new URLSearchParams({ fields: fetchFields.join(",") });
      const data = await jiraFetchJson<{ key: string; fields: any }>(
        `/issue/${ticketId}?${issueParams}`
      );

      const result: Record<string, unknown> = {
        key: data.key,
        ...mapTicketFields(data.fields, requested),
      };

      // 댓글은 정확한 정렬과 limit을 위해 별도 엔드포인트 호출
      if (wantsComment) {
        const commentParams = new URLSearchParams({
          orderBy: "-created",
          maxResults: String(limit),
        });
        const commentData = await jiraFetchJson<{ comments: any[]; total?: number }>(
          `/issue/${ticketId}/comment?${commentParams}`
        );
        const comments = commentData.comments ?? [];
        result.comment = {
          total: commentData.total ?? comments.length,
          returned: comments.length,
          comments: comments.map((c: any) => ({
            id: c.id,
            author: c.author?.displayName ?? null,
            created: c.created,
            updated: c.updated,
            body: c.body,
          })),
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "jira_search_tickets",
    {
      title: "Jira 티켓 검색",
      description:
        "JQL 쿼리로 Jira 티켓을 검색합니다. fields에 'description'을 포함할 수 있으나, 'comment'는 N+1 호출이 필요해 미지원 — 결과 티켓에 대해 jira_get_ticket을 개별 호출하세요.",
      inputSchema: z.object({
        jql: z.string().describe("JQL 쿼리문"),
        maxResults: z.number().optional().describe("최대 결과 수 (기본: 50)"),
        nextPageToken: z.string().optional().describe("다음 페이지 토큰 (이전 응답의 nextPageToken)"),
        fields: z.array(z.string()).optional().describe(
          "조회할 필드 목록. 미지정 시 기본 필드(summary, status, assignee). 'description' 포함 가능, 'comment'는 미지원"
        ),
      }),
    },
    async ({ jql, maxResults, nextPageToken, fields }) => {
      const requested = fields && fields.length > 0 ? fields : SEARCH_DEFAULT_FIELDS;

      if (requested.includes("comment")) {
        return {
          content: [{
            type: "text" as const,
            text: "Error: 'comment' 필드는 jira_search_tickets에서 지원되지 않습니다. 결과 티켓에 대해 jira_get_ticket을 개별 호출하세요.",
          }],
          isError: true,
        };
      }

      const params = new URLSearchParams({
        jql,
        maxResults: String(maxResults || 50),
        fields: requested.join(","),
      });
      if (nextPageToken) {
        params.set("nextPageToken", nextPageToken);
      }
      const data = await jiraFetchJson<{ issues: any[]; isLast?: boolean; nextPageToken?: string }>(
        `/search/jql?${params}`
      );
      const issues = data.issues.map((issue: any) => ({
        key: issue.key,
        ...mapTicketFields(issue.fields, requested),
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
      const data = await jiraFetchJson<{ key: string; id: string; self: string }>("/issue", {
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

  server.registerTool(
    "jira_update_ticket_from_markdown",
    {
      title: "Jira 티켓 markdown 업데이트 (ADF 자동 변환)",
      description:
        "markdown 문자열을 ADF로 변환 후 description(또는 custom field)에 PUT 합니다. " +
        "markerStart/End를 지정하면 description ADF 내부의 marker 블록 사이만 교체하고, " +
        "그 외 영역은 보존합니다. marker가 없으면 description 끝에 새 marker 블록을 append.",
      inputSchema: z.object({
        ticketId: z
          .string()
          .regex(/^[A-Z]+-\d+$/)
          .describe("티켓 ID (예: SYN-1234)"),
        markdown: z.string().describe("ADF로 변환할 markdown 본문"),
        field: z
          .string()
          .default("description")
          .describe("대상 필드. 기본 'description', 또는 'customfield_<id>'"),
        markerStart: z
          .string()
          .optional()
          .describe("description splice용 시작 마커 문자열 (예: '<!-- sdd:start -->')"),
        markerEnd: z
          .string()
          .optional()
          .describe("description splice용 종료 마커 문자열 (예: '<!-- sdd:end -->')"),
      }),
    },
    async ({ ticketId, markdown, field, markerStart, markerEnd }) => {
      const { adf, warnings } = markdownToAdf(markdown);

      let body: ADFDocument;
      let mode: "replace-full" | "splice-marker" | "append-marker";
      if (field === "description" && markerStart && markerEnd) {
        const current = await jiraFetchJson<{ fields: { description: ADFDocument | null } }>(
          `/issue/${ticketId}?fields=description`
        );
        const currentDoc: ADFDocument =
          current.fields.description ?? {
            version: 1,
            type: "doc",
            content: [],
          };
        const spliced = spliceAdfByMarkers(currentDoc, adf.content, markerStart, markerEnd);
        body = spliced.doc;
        mode = spliced.created ? "append-marker" : "splice-marker";
        if (spliced.created) {
          warnings.push("marker not found — description 끝에 새 marker 블록 추가");
        }
      } else {
        body = adf;
        mode = "replace-full";
      }

      await jiraFetch(`/issue/${ticketId}`, {
        method: "PUT",
        body: JSON.stringify({ fields: { [field]: body } }),
      });

      const base = (process.env.JIRA_BASE_URL ?? "").replace(/\/$/, "");
      const url = base ? `${base}/browse/${ticketId}` : null;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { ticketId, field, mode, warnings, url },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}

// 마커 노드는 inline code mark가 적용된 단일 paragraph로 인코딩한다.
// 예) <!-- sdd:start --> → { type: "paragraph", content: [{ type: "text", text: "<!-- sdd:start -->",
//     marks: [{ type: "code" }] }] }
function makeMarkerParagraph(text: string): ADFBlock {
  const textNode: ADFTextNode = { type: "text", text, marks: [{ type: "code" }] };
  return { type: "paragraph", content: [textNode] };
}

function isMarkerParagraph(block: ADFBlock, marker: string): boolean {
  if (block.type !== "paragraph") return false;
  const content = block.content;
  if (content.length !== 1) return false;
  const node = content[0];
  if (node.type !== "text") return false;
  if (node.text !== marker) return false;
  return Array.isArray(node.marks) && node.marks.some((m) => m.type === "code");
}

export function spliceAdfByMarkers(
  doc: ADFDocument,
  newBlocks: ADFBlock[],
  markerStart: string,
  markerEnd: string
): { doc: ADFDocument; created: boolean } {
  const startIdx = doc.content.findIndex((b) => isMarkerParagraph(b, markerStart));
  const endIdx = doc.content.findIndex((b) => isMarkerParagraph(b, markerEnd));

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return {
      doc: {
        version: doc.version,
        type: "doc",
        content: [
          ...doc.content,
          makeMarkerParagraph(markerStart),
          ...newBlocks,
          makeMarkerParagraph(markerEnd),
        ],
      },
      created: true,
    };
  }

  return {
    doc: {
      version: doc.version,
      type: "doc",
      content: [
        ...doc.content.slice(0, startIdx + 1),
        ...newBlocks,
        ...doc.content.slice(endIdx),
      ],
    },
    created: false,
  };
}

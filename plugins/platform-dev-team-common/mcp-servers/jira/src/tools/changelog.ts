import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile, realpath } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execFileAsync = promisify(execFile);

interface TicketEntry {
  id: string;
  section: string;
  category: string;
  description: string;
}

function parseSectionHeader(line: string): string | null {
  // 형식 1: ## [Unreleased] 또는 ## [v2026.1.0] - 2026-03-04
  // 형식 2: ## unreleased 또는 ## v2026.1.2
  // 형식 3: ## v2.6.1 [v26.1.1] (레거시 - 대괄호 안 버전 우선)
  // 형식 4: ## v0.3.2[v25.1.10] (공백 없이 대괄호)
  // 형식 5: ## v1.2.0 [Sprint-4]
  const m = line.match(/^##\s+(.+)/);
  if (!m) return null;

  const raw = m[1].trim();

  // [Unreleased] 또는 [v2026.1.0] - date 형태
  const bracketFirst = raw.match(/^\[([^\]]+)\]/);
  if (bracketFirst) return bracketFirst[1].toLowerCase();

  // v2.6.1 [v26.1.1] 또는 v0.3.2[v25.1.10] 형태 — 대괄호 안 버전 우선
  const withBracket = raw.match(/^v[\d.]+\s*\[([^\]]+)\]/);
  if (withBracket) return withBracket[1].toLowerCase();

  // v2026.1.2 또는 unreleased (단독)
  const plain = raw.match(/^(v[\d.]+|unreleased)/i);
  if (plain) return plain[1].toLowerCase();

  return raw.toLowerCase();
}

function parseChangelog(content: string): TicketEntry[] {
  const tickets: TicketEntry[] = [];
  const lines = content.split("\n");

  let currentSection = "";
  let currentCategory = "";

  for (const line of lines) {
    // 섹션 헤더: ## ...
    if (line.startsWith("## ")) {
      const section = parseSectionHeader(line);
      if (section) {
        currentSection = section;
        currentCategory = "";
      }
      continue;
    }

    // 카테고리 헤더: ### Added, ### Maintenance (Non-functional changes), ### hotfix
    const categoryMatch = line.match(/^###\s+(.+)/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      continue;
    }

    if (!currentSection) continue;

    // 티켓 항목 패턴 1: - [SYN-XXXX](url) 설명 (줄 시작)
    const ticketStart = line.match(/^-\s+\[([A-Z]+-\d+)\]\([^)]+\)\s*(.*)/);
    if (ticketStart) {
      tickets.push({
        id: ticketStart[1],
        section: currentSection,
        category: currentCategory,
        description: ticketStart[2].trim(),
      });
      continue;
    }

    // 티켓 항목 패턴 2: - 설명 [SYN-XXXX](url) (줄 끝에 티켓)
    const ticketEnd = line.match(/^-\s+(.+)\[([A-Z]+-\d+)\]\([^)]+\)\s*$/);
    if (ticketEnd) {
      tickets.push({
        id: ticketEnd[2],
        section: currentSection,
        category: currentCategory,
        description: ticketEnd[1].trim(),
      });
      continue;
    }
  }

  return tickets;
}

function validateTicketId(id: string): boolean {
  return /^[A-Z]+-\d+$/.test(id);
}

function validateBranchName(branch: string): boolean {
  // Git 브랜치 이름에 허용되는 문자만 통과
  return /^[\w./-]+$/.test(branch);
}

async function gitLogContains(ticketId: string, branch: string, cwd: string): Promise<boolean> {
  if (!validateTicketId(ticketId) || !validateBranchName(branch)) {
    return false;
  }
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", branch, "--oneline", `--grep=${ticketId}`, "--max-count=1"],
      { cwd, encoding: "utf-8" }
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export function registerChangelogTools(server: McpServer) {
  server.registerTool(
    "changelog_extract_tickets",
    {
      title: "CHANGELOG 티켓 추출",
      description: "CHANGELOG.md에서 티켓 ID 목록을 추출합니다. section 파라미터로 특정 섹션만 필터링 가능합니다.",
      inputSchema: z.object({
        filePath: z.string().describe("CHANGELOG.md 파일 경로 (절대 또는 상대)"),
        section: z.string().optional().describe("필터링할 섹션 (예: 'unreleased', 'v2026.1.1'). 미지정 시 전체"),
      }),
    },
    async ({ filePath, section }) => {
      let resolvedPath: string;
      try {
        resolvedPath = await realpath(resolve(filePath));
      } catch {
        return {
          content: [{ type: "text" as const, text: `Error: 파일을 찾을 수 없습니다: ${filePath}` }],
          isError: true,
        };
      }
      if (!resolvedPath.toLowerCase().endsWith("changelog.md")) {
        return {
          content: [{ type: "text" as const, text: "Error: filePath must point to a CHANGELOG.md file" }],
          isError: true,
        };
      }
      const content = await readFile(resolvedPath, "utf-8");
      let tickets = parseChangelog(content);

      if (section) {
        tickets = tickets.filter((t) => t.section === section.toLowerCase());
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ tickets }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "changelog_check_branches",
    {
      title: "CHANGELOG 브랜치 확인",
      description: "티켓 ID 목록이 각 Git 브랜치에 포함되는지 확인합니다. git log --grep으로 커밋 메시지에서 티켓 ID를 검색합니다.",
      inputSchema: z.object({
        ticketIds: z.array(z.string()).describe("확인할 티켓 ID 목록"),
        branches: z.array(z.string()).describe("확인할 브랜치 목록 (예: ['origin/main', 'origin/staging', 'origin/production'])"),
        fetch: z.boolean().optional().describe("실행 전 git fetch --all 수행 여부 (기본: true)"),
        cwd: z.string().optional().describe("Git 저장소 경로 (기본: 현재 디렉토리)"),
      }),
    },
    async ({ ticketIds, branches, fetch, cwd }) => {
      const workDir = cwd || process.cwd();

      // Git 저장소 검증
      try {
        await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: workDir, encoding: "utf-8" });
      } catch {
        return {
          content: [{ type: "text" as const, text: `Error: ${workDir}은(는) Git 저장소가 아닙니다.` }],
          isError: true,
        };
      }

      if (fetch !== false) {
        try {
          await execFileAsync("git", ["fetch", "--all", "--quiet"], { cwd: workDir, encoding: "utf-8" });
        } catch {
          // fetch 실패해도 계속 진행 (오프라인 등)
        }
      }

      const results = await Promise.all(
        ticketIds.map(async (ticketId) => {
          const branchChecks = await Promise.all(
            branches.map(async (branch) => ({
              branch,
              found: await gitLogContains(ticketId, branch, workDir),
            }))
          );
          return {
            id: ticketId,
            branches: branchChecks.filter((b) => b.found).map((b) => b.branch),
          };
        })
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ tickets: results }, null, 2) }],
      };
    }
  );
}

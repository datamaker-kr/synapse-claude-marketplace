# Jira Sync 코드리뷰 기반 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 코드리뷰에서 발견된 Critical/Important/Suggestion 항목을 모두 수정하여 Jira MCP 서버의 안정성, 문서 정합성, 코드 품질을 개선한다.

**Architecture:** MCP SDK 1.27의 `registerTool`은 핸들러 에러를 자동으로 `isError: true` 응답으로 변환하므로 (mcp.js:135-141), C-1(try-catch) 항목은 Critical에서 제외한다. 나머지 항목들을 문서 통일 → 입력 검증 강화 → 코드 개선 → README 업데이트 순서로 진행한다.

**Tech Stack:** TypeScript, zod, @modelcontextprotocol/sdk@1.27, Node.js

---

### Task 1: 문서 간 MCP 설정 파일 경로 통일 (`~/.claude.json`)

**Files:**
- Modify: `plugins/platform-dev-team-common/mcp-servers/jira/README.md:65`
- Modify: `plugins/platform-dev-team-common/README.md:840`
- Verify: `plugins/platform-dev-team-common/commands/sync-jira-tickets.md:104-121` (이미 수정됨)

리뷰 항목: **I-1** — 3곳의 MCP 설정 파일 경로가 불일치. `sync-jira-tickets.md`는 이미 `~/.claude.json`으로 수정되었으므로 나머지 2곳을 통일한다.

- [ ] **Step 1: jira/README.md 경로 수정**

`~/.claude/settings.json` → `~/.claude.json`으로 변경:

```markdown
### 3. Claude Code에 MCP 서버 등록

`~/.claude.json`에 다음을 추가합니다:
```

- [ ] **Step 2: 플러그인 README.md 경로 수정**

`~/.claude/settings.json`에 추가 → `~/.claude.json`에 추가:

```markdown
**2. `~/.claude.json`에 추가**
```

- [ ] **Step 3: sync-jira-tickets.md 확인**

이미 `~/.claude.json`으로 수정되어 있는지 확인만 수행.

Run: `grep -n "claude.json\|settings.json" plugins/platform-dev-team-common/commands/sync-jira-tickets.md`
Expected: `~/.claude.json`만 나타남

- [ ] **Step 4: 커밋**

```bash
git add plugins/platform-dev-team-common/mcp-servers/jira/README.md plugins/platform-dev-team-common/README.md
git commit -m "문서: MCP 설정 파일 경로를 ~/.claude.json으로 통일"
```

---

### Task 2: `jira_get_sprint` 입력 검증 강화

**Files:**
- Modify: `plugins/platform-dev-team-common/mcp-servers/jira/src/tools/board.ts:31-58`

리뷰 항목: **C-2** — `boardId`와 `sprintId` 모두 optional이어서 둘 다 미제공 시 런타임에서만 텍스트 메시지를 반환함. zod 스키마 레벨에서 제약을 건다.

- [ ] **Step 1: zod 스키마에 refine 추가**

`jira_get_sprint`의 inputSchema를 수정하여 "둘 중 하나 필수" 제약:

```typescript
inputSchema: z.object({
  boardId: z.number().optional().describe("보드 ID (활성 스프린트 조회 시)"),
  sprintId: z.number().optional().describe("스프린트 ID (특정 스프린트 조회 시)"),
}).refine(
  (data) => data.boardId !== undefined || data.sprintId !== undefined,
  { message: "boardId 또는 sprintId 중 하나를 제공해야 합니다." }
),
```

핸들러에서 기존 fallback 텍스트 반환 제거 (스키마 검증이 먼저 걸리므로 불필요):

```typescript
async ({ boardId, sprintId }) => {
  if (sprintId) {
    const data = await jiraAgileFetch(`/sprint/${sprintId}`);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
  // boardId는 refine에 의해 반드시 존재
  const data = await jiraAgileFetch(`/board/${boardId}/sprint?state=active`);
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data.values, null, 2) }],
  };
}
```

- [ ] **Step 2: 커밋**

```bash
git add plugins/platform-dev-team-common/mcp-servers/jira/src/tools/board.ts
git commit -m "수정: jira_get_sprint 입력 검증 강화 (boardId/sprintId 중 하나 필수)"
```

---

### Task 3: `changelog_extract_tickets` 파일 경로 검증 개선

**Files:**
- Modify: `plugins/platform-dev-team-common/mcp-servers/jira/src/tools/changelog.ts:131-137`

리뷰 항목: **I-3** — `endsWith("CHANGELOG.md")`가 대소문자 다른 파일명 거부, `realpath` 실패 시 uncaught exception.

- [ ] **Step 1: 경로 검증 로직 개선**

`realpath` 실패를 try-catch로 감싸고, 대소문자 무시 비교:

```typescript
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
  // ... 나머지 로직 동일
```

- [ ] **Step 2: 커밋**

```bash
git add plugins/platform-dev-team-common/mcp-servers/jira/src/tools/changelog.ts
git commit -m "수정: changelog_extract_tickets 파일 경로 검증 개선 (대소문자, 파일 미존재)"
```

---

### Task 4: `changelog_check_branches`에 Git 저장소 검증 추가

**Files:**
- Modify: `plugins/platform-dev-team-common/mcp-servers/jira/src/tools/changelog.ts:163-184`

리뷰 항목: **I-4** — `cwd`가 Git 저장소가 아닐 때 모든 티켓이 "브랜치 없음"으로 나와 오해 유발.

- [ ] **Step 1: Git 저장소 검증 추가**

핸들러 시작 부분에 Git 저장소 확인 로직 추가:

```typescript
async ({ ticketIds, branches, fetch, cwd }) => {
  const workDir = cwd || process.cwd();

  // Git 저장소 검증
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], { cwd: workDir, encoding: "utf-8" });
  } catch {
    return {
      content: [{ type: "text" as const, text: `Error: ${workDir}은(는) Git 저장소가 아닙니다.` }],
      isError: true,
    };
  }

  // ... 나머지 로직 동일
```

- [ ] **Step 2: 커밋**

```bash
git add plugins/platform-dev-team-common/mcp-servers/jira/src/tools/changelog.ts
git commit -m "수정: changelog_check_branches에 Git 저장소 검증 추가"
```

---

### Task 5: 서버 시작 시 환경변수 미설정 경고

**Files:**
- Modify: `plugins/platform-dev-team-common/mcp-servers/jira/src/index.ts`

리뷰 항목: **S-5** — 환경변수가 없으면 API 호출 시점에야 실패. 시작 시 경고하되 서버는 정상 시작(changelog 도구 사용 가능).

- [ ] **Step 1: 환경변수 경고 추가**

서버 시작 직후, `server.connect()` 전에 환경변수 확인:

```typescript
// 환경변수 사전 확인 (경고만, 서버는 정상 시작)
const requiredEnvVars = ["JIRA_BASE_URL", "JIRA_USER_EMAIL", "JIRA_API_TOKEN"];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    `Warning: ${missingVars.join(", ")} 환경변수가 설정되지 않았습니다. ` +
    `Jira API 도구는 사용할 수 없지만, CHANGELOG 도구는 정상 동작합니다.`
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add plugins/platform-dev-team-common/mcp-servers/jira/src/index.ts
git commit -m "기능: 서버 시작 시 환경변수 미설정 경고 추가"
```

---

### Task 6: `jiraFetch` 제네릭 타입 지원

**Files:**
- Modify: `plugins/platform-dev-team-common/mcp-servers/jira/src/jira-client.ts:25-47, 49-71`

리뷰 항목: **I-2** — `Promise<any>` 반환으로 타입 안전성 없음.

- [ ] **Step 1: 제네릭 타입 파라미터 추가**

```typescript
export async function jiraFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // ... 기존 로직 동일
  return text ? JSON.parse(text) : null;
}

export async function jiraAgileFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // ... 기존 로직 동일
  return text ? JSON.parse(text) : null;
}
```

기본값이 `any`이므로 기존 호출처 변경 불필요. 향후 점진적으로 타입을 지정할 수 있다.

- [ ] **Step 2: 커밋**

```bash
git add plugins/platform-dev-team-common/mcp-servers/jira/src/jira-client.ts
git commit -m "리팩토링: jiraFetch에 제네릭 타입 파라미터 추가"
```

---

### Task 7: 플러그인 README에 jira 관련 디렉토리/스킬 추가

**Files:**
- Modify: `plugins/platform-dev-team-common/README.md:455-480` (스킬 목록 + 디렉토리 구조)

리뷰 항목: **I-5(I-7)** — 디렉토리 구조, 스킬 목록에 jira-sync 관련 항목 누락.

- [ ] **Step 1: 스킬 목록에 jira-sync 추가**

`README.md`의 스킬 목록 (460번째 줄 부근)에 추가:

```markdown
- **jira-sync**: CHANGELOG 기반 Jira 티켓 상태 동기화 규칙
```

- [ ] **Step 2: 디렉토리 구조에 jira 관련 항목 추가**

```
platform-dev-team-claude-plugin/
├── agents/                    # 오케스트레이터 에이전트
│   ├── docs-manager/          # 문서 관리 워크플로우
│   ├── update-pr/             # PR 업데이트 워크플로우
│   └── planner/               # 구현 계획 프로세스
├── skills/                    # 전문 작업자 스킬
│   ├── docs-analyzer/         # 문서 갭 분석
│   ├── docs-bootstrapper/     # 문서 부트스트랩
│   ├── mermaid-expert/        # 다이어그램 생성
│   ├── commit-with-message/   # 커밋 메시지 규칙
│   ├── tdd-workflow/          # TDD 가이드
│   └── jira-sync/             # Jira 상태 동기화 규칙
├── commands/                  # Claude 커맨드
│   ├── update-pr-title.md
│   ├── update-pr-desc.md
│   ├── update-docs.md
│   └── sync-jira-tickets.md   # Jira 동기화 커맨드
└── mcp-servers/               # MCP 서버
    └── jira/                  # Jira MCP 서버 (11개 도구)
```

- [ ] **Step 3: 커밋**

```bash
git add plugins/platform-dev-team-common/README.md
git commit -m "문서: 플러그인 README에 jira-sync 관련 디렉토리/스킬 추가"
```

---

### Task 8: `gitLogContains` 비동기화 (성능 개선)

**Files:**
- Modify: `plugins/platform-dev-team-common/mcp-servers/jira/src/tools/changelog.ts:104-118, 174-178`

리뷰 항목: **S-3** — `execFileSync`가 티켓수 × 브랜치수만큼 순차 호출. 비동기 + 병렬화로 성능 개선.

- [ ] **Step 1: `gitLogContains`를 비동기로 변환**

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
```

- [ ] **Step 2: `changelog_check_branches` 핸들러에서 병렬 실행**

```typescript
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
```

- [ ] **Step 3: `execFileSync` import 제거**

`changelog.ts` 상단에서 `execFileSync` → `execFile` + `promisify`로 교체. 단, Task 4에서 추가한 Git 저장소 검증도 비동기로 전환:

```typescript
try {
  await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: workDir, encoding: "utf-8" });
} catch {
  return { ... };
}
```

`fetch` 실행도 비동기로:

```typescript
if (fetch !== false) {
  try {
    await execFileAsync("git", ["fetch", "--all", "--quiet"], { cwd: workDir, encoding: "utf-8" });
  } catch {
    // fetch 실패해도 계속 진행
  }
}
```

- [ ] **Step 4: 커밋**

```bash
git add plugins/platform-dev-team-common/mcp-servers/jira/src/tools/changelog.ts
git commit -m "리팩토링: gitLogContains 비동기화 및 병렬 실행으로 성능 개선"
```

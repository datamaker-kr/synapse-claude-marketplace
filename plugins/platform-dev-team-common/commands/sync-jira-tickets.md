---
description: 현재 프로젝트의 CHANGELOG.md에 있는 Jira 티켓들을 Git 브랜치 상태에 맞게 동기화합니다.
---

# Sync Jira Command

**현재 프로젝트**의 CHANGELOG.md 티켓들을 Git 브랜치(main, staging, production) 상태에 따라 Jira 상태를 자동 동기화합니다.

## 적용 범위

이 커맨드는 **사용자가 현재 작업 중인 프로젝트(CWD)에만** 적용됩니다.
3개 레포를 동시에 처리하지 않습니다. 각 프로젝트에서 개별적으로 실행해야 합니다.

적용 대상 프로젝트:
- synapse-workspace
- synapse-backend
- synapse-annotator
- synapse-sdk
- synapse-agent

## 사전 조건

- Git 저장소 루트에 CHANGELOG.md가 있어야 합니다
- Git 저장소여야 합니다
- Jira MCP 서버가 설정되어 있어야 합니다 (미설정 시 0단계에서 자동 설정 안내)

## 사용법

```
/sync-jira-tickets
/sync-jira-tickets --section unreleased
/sync-jira-tickets --section v2026.1.1
/sync-jira-tickets --dry-run
```

## 옵션

- `--section <name>`: 특정 섹션만 동기화 (기본: unreleased)
- `--dry-run`: 실제 변경 없이 계획만 출력

## 실행 절차

jira-sync 스킬의 상태 전이 규칙을 따라 아래 순서로 실행합니다:

### 0단계: 환경 확인 및 Jira MCP 자동 설정

현재 작업 디렉토리(CWD)를 기준으로 프로젝트를 판별하고, Jira MCP 서버 연결을 확인합니다.

#### 0-1. 프로젝트 확인

1. Bash로 `pwd`를 실행하여 현재 디렉토리를 확인합니다.
2. Git 루트를 확인합니다: `git rev-parse --show-toplevel`
3. CHANGELOG.md 존재 여부를 확인합니다.
4. 없으면 에러 메시지를 출력하고 중단합니다.

이후 모든 도구 호출에서 이 경로를 사용합니다:
- `changelog_extract_tickets`의 `filePath`: `<git-root>/CHANGELOG.md`
- `changelog_check_branches`의 `cwd`: `<git-root>`

#### 0-2. Jira MCP 서버 연결 확인

`changelog_extract_tickets` 도구를 테스트 호출하여 Jira MCP 서버 연결을 확인합니다.

- **성공** → 1단계로 진행합니다.
- **실패 (도구를 찾을 수 없음)** → 아래 자동 설정 절차를 시작합니다.

#### 0-3. Jira MCP 자동 설정 (도구 미발견 시)

사용자에게 자동 설정 여부를 묻습니다:

> Jira MCP 서버가 설정되어 있지 않습니다. 자동으로 설정하시겠습니까?
> - **예**: 환경변수를 입력받고 자동으로 설정합니다.
> - **아니오**: 수동 설정 방법을 안내하고 중단합니다. (README 참조: `mcp-servers/jira/README.md`)

**"예" 선택 시 다음 순서로 진행합니다:**

**Step 1) 환경변수 입력 받기**

사용자에게 아래 3가지를 순서대로 질문합니다:

| 변수 | 질문 | 비고 |
|------|------|------|
| `JIRA_USER_EMAIL` | "Jira 계정 이메일을 입력하세요 (예: name@datamaker.io)" | |
| `JIRA_API_TOKEN` | "Jira API 토큰을 입력하세요 (발급: https://id.atlassian.com/manage-profile/security/api-tokens)" | 토큰이 없으면 발급 링크 안내 |
| `JIRA_BASE_URL` | "Jira URL을 입력하세요 (기본값: https://datamaker.atlassian.net)" | 입력 없으면 기본값 사용 |

**Step 2) 의존성 설치**

플러그인의 Jira MCP 서버 경로를 자동으로 찾아 의존성을 설치합니다:

```bash
# 플러그인 경로 탐지: 이 커맨드 파일의 위치에서 상대 경로로 추론
# 커맨드 파일 위치: <plugin-root>/commands/sync-jira-tickets.md
# MCP 서버 위치: <plugin-root>/mcp-servers/jira/
find ~/.claude -path "*/platform-dev-team-common/mcp-servers/jira/package.json" -type f 2>/dev/null | head -1
```

찾은 경로에서 `npm install`을 실행합니다:

```bash
cd <jira-mcp-path> && npm install
```

**Step 3) ~/.claude.json에 MCP 서버 등록**

`~/.claude.json` 파일을 Read로 읽은 후, `mcpServers` 객체에 `jira` 항목을 추가합니다.
기존 내용을 유지하면서 아래 항목만 추가합니다:

```jsonc
"jira": {
  "command": "npx",
  "args": ["tsx", "<자동탐지된-절대경로>/mcp-servers/jira/src/index.ts"],
  "env": {
    "JIRA_API_TOKEN": "<입력받은 값>",
    "JIRA_USER_EMAIL": "<입력받은 값>",
    "JIRA_BASE_URL": "<입력받은 값 또는 기본값>"
  }
}
```

- `~/.claude.json`이 없으면 새로 생성합니다.
- 이미 `jira` MCP 서버가 등록되어 있으면 덮어쓸지 사용자에게 확인합니다.

**Step 4) 재시작 안내**

설정 완료 후 아래 메시지를 출력하고 **커맨드를 중단합니다**:

> ✅ Jira MCP 서버 설정이 완료되었습니다.
>
> Claude Code를 재시작한 후 `/sync-jira-tickets`를 다시 실행하세요.
> 재시작 후 `/mcp` 명령으로 jira 서버가 목록에 나타나는지 확인할 수 있습니다.

### 1단계: 티켓 추출

`changelog_extract_tickets` 도구로 현재 프로젝트의 CHANGELOG.md에서 티켓 ID를 추출합니다.

```
changelog_extract_tickets(filePath: "<git-root>/CHANGELOG.md", section: "unreleased")
```

### 2단계: 브랜치 확인

`changelog_check_branches` 도구로 각 티켓이 어떤 브랜치에 포함되는지 확인합니다.

```
changelog_check_branches(ticketIds: [...], branches: ["origin/main", "origin/staging", "origin/production"], cwd: "<git-root>")
```

### 3단계: 현재 상태 조회

`jira_get_ticket` 도구로 각 티켓의 현재 Jira 상태를 조회합니다.

### 4단계: 상태 전이 규칙 적용

각 티켓에 대해 jira-sync 스킬의 규칙을 적용합니다:

| 조건 | 액션 |
|------|------|
| main/staging에 있고 상태 < 리뷰 완료 | → `jira_transition` → "리뷰 완료" |
| staging 또는 production에 있음 | → `jira_update_field(customfield_10659, {id: "10678"})` (이미 설정 시 SKIP) |
| staging + 검토 완료 | → SKIP |
| production에 있고 완료 아님 | → `jira_transition` → "완료" |

### 5단계: 결과 리포트

모든 처리가 완료되면 아래 형식으로 결과를 보여줍니다:

```
## Jira 동기화 결과

프로젝트: <프로젝트 이름> (<git-root>)
섹션: unreleased

| 티켓 | 이전 상태 | 액션 | 결과 |
|------|----------|------|------|
| SYN-1234 | 리뷰 중 | → 리뷰 완료 | 완료 |
| SYN-5678 | 리뷰 완료 | customfield 변경 | 완료 |
| SYN-9012 | 검토 완료 | SKIP | - |
| SYN-3456 | 리뷰 완료 | → 완료 | 완료 |

처리: N건 / 스킵: M건 / 실패: K건
```

## --dry-run 모드

`--dry-run` 옵션이 있으면 4단계에서 실제 API 호출 없이 "계획"만 보여줍니다.
jira_get_ticket 조회까지만 수행하고, 예상 액션을 테이블로 출력합니다.

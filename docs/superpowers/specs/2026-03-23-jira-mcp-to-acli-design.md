# Jira MCP Server → Atlassian CLI 전환 설계

## 개요

Jira MCP Server(TypeScript, 614줄)를 제거하고 Atlassian CLI(`acli`)를 직접 사용하도록 전환한다.

**Before**: Claude Code → MCP Protocol (stdio) → Jira MCP Server → Jira REST API
**After**: Claude Code → Bash Tool → `acli` CLI → Jira Cloud API

## 변경 범위

| 작업 | 파일 | 변경 유형 |
|------|------|----------|
| MCP 서버 삭제 | `mcp-servers/jira/` (전체) | 삭제 |
| 스킬 재작성 | `skills/jira-sync/SKILL.md` | 재작성 |
| 커맨드 재작성 | `commands/sync-jira-tickets.md` | 재작성 |
| 플러그인 매니페스트 | `plugin.json` | 수정 (description에서 MCP 언급 제거) |
| MCP README 삭제 | `mcp-servers/jira/README.md` | 삭제 (디렉토리와 함께) |
| 셋업 가이드 추가 | `docs/acli-setup.md` | 신규 |

## 사전 조건

- `acli` 설치: `brew tap atlassian/homebrew-acli && brew install acli`
- OAuth 인증: `acli jira auth login --web`
- 인증 상태 확인: `acli jira auth status`

## 도구 매핑

### MCP Tool → acli 명령어

| 기존 MCP Tool | acli 명령어 | 비고 |
|---|---|---|
| `jira_get_ticket` | `acli jira workitem view {key} --json -f {fields}` | `--json`으로 파싱 가능 |
| `jira_search_tickets` | `acli jira workitem search --jql "{jql}" --json -l {limit}` | `--paginate` 지원 |
| `jira_create_ticket` | `acli jira workitem create -p {project} -s "{summary}" -t {type}` | |
| `jira_update_ticket` | `acli jira workitem edit -k {key} -s "{summary}"` | 기본 필드 |
| `jira_update_field` | `acli jira workitem edit -k {key} --from-json {tmp.json}` | 커스텀 필드는 임시 JSON 생성 |
| `jira_list_transitions` | (제거) | `acli`는 직접 transition 시도, 별도 조회 불필요 |
| `jira_transition` | `acli jira workitem transition -k {key} -s "{status}" -y` | `-y`로 확인 스킵 |
| `jira_get_board` | `acli jira board search --json` | |
| `jira_get_sprint` | `acli jira board list-sprints --id {boardId} --state active --json` | |
| `changelog_extract_tickets` | Bash: `sed` + `grep` | 스킬 문서에 패턴 기술 |
| `changelog_check_branches` | Bash: `git log --grep` | 스킬 문서에 패턴 기술 |

### CHANGELOG 파싱 (Bash 대체)

```bash
# 전체 티켓 ID 추출
grep -oE '[A-Z]+-[0-9]+' CHANGELOG.md | sort -u

# Unreleased 섹션에서만 추출
sed -n '/## \[Unreleased\]/,/^## \[/p' CHANGELOG.md | grep -oE '[A-Z]+-[0-9]+' | sort -u

# 특정 버전 섹션에서 추출
sed -n '/## .*v2026\.1\.1/,/^## /p' CHANGELOG.md | grep -oE '[A-Z]+-[0-9]+' | sort -u
```

### 브랜치 확인 (Bash 대체)

```bash
# 특정 브랜치에 티켓 포함 여부 확인
git log origin/main --grep="SYN-1234" --oneline
git log origin/staging --grep="SYN-1234" --oneline
git log origin/production --grep="SYN-1234" --oneline
```

### 커스텀 필드 업데이트 패턴

```bash
# 임시 JSON 생성 → edit → 정리
echo '{"fields":{"customfield_10659":{"id":"10678"}}}' > /tmp/jira-field-update.json
acli jira workitem edit -k SYN-1234 --from-json /tmp/jira-field-update.json
rm /tmp/jira-field-update.json
```

## 스킬 설계: `skills/jira-sync/SKILL.md`

### 변경 사항

- `allowed-tools`에서 `mcp__jira__*` 제거, `Bash` 유지
- 모든 액션을 `acli` 명령어로 재작성
- changelog 파싱 로직을 Bash 패턴으로 인라인 기술

### 상태 전이 규칙 (변경 없음)

| # | 조건 | 액션 |
|---|------|------|
| 1 | main/staging에 있고 상태 < 리뷰 완료 | `acli jira workitem transition -k {key} -s "리뷰 완료" -y` |
| 2 | staging/production에 있고 customfield 미설정 | `acli jira workitem edit -k {key} --from-json {tmp.json}` |
| 3 | staging + 검토 완료 | SKIP |
| 4 | production에 있고 완료 아님 | `acli jira workitem transition -k {key} -s "완료" -y` |

## 커맨드 설계: `commands/sync-jira-tickets.md`

### 실행 절차 (변경 후)

#### 0단계: 환경 확인

1. CWD 및 Git 루트 확인
2. CHANGELOG.md 존재 확인
3. `acli jira auth status` 실행하여 인증 확인
   - 실패 시: `acli jira auth login --web` 안내 후 중단

#### 1단계: 티켓 추출

```bash
# CHANGELOG.md에서 해당 섹션의 티켓 ID 추출
sed -n '/## \[Unreleased\]/,/^## \[/p' <git-root>/CHANGELOG.md | grep -oE '[A-Z]+-[0-9]+' | sort -u
```

#### 2단계: 브랜치 확인

```bash
git fetch --all
# 각 티켓에 대해
git log origin/main --grep="{ticketId}" --oneline
git log origin/staging --grep="{ticketId}" --oneline
git log origin/production --grep="{ticketId}" --oneline
```

#### 3단계: 현재 상태 조회

```bash
acli jira workitem view {key} --json -f status,customfield_10659
```

#### 4단계: 상태 전이 규칙 적용

jira-sync 스킬의 규칙에 따라 `acli` 명령어 실행

#### 5단계: 결과 리포트

기존과 동일한 테이블 형식으로 출력

## 셋업 가이드: `docs/acli-setup.md`

### 내용

1. macOS 설치: `brew tap atlassian/homebrew-acli && brew install acli`
2. OAuth 인증: `acli jira auth login --web`
3. 인증 확인: `acli jira auth status`
4. 테스트: `acli jira workitem view SYN-1234 --json`

## plugin.json 변경

- `description`에서 "Jira integration" 유지, "MCP" 언급 제거
- `commands`, `skills` 경로는 변경 없음

## 삭제 대상

```
mcp-servers/jira/
├── src/
│   ├── index.ts
│   ├── jira-client.ts
│   └── tools/
│       ├── ticket.ts
│       ├── transition.ts
│       ├── field.ts
│       ├── board.ts
│       └── changelog.ts
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## 리스크

- `acli jira workitem edit --from-json`으로 커스텀 필드 업데이트가 정상 동작하는지 실제 테스트 필요
- `acli`의 `--json` 출력 포맷이 Jira REST API와 동일하지 않을 수 있음 (필드명 차이)
- `acli jira workitem transition`에서 한글 상태명("리뷰 완료", "완료")이 정상 인식되는지 확인 필요

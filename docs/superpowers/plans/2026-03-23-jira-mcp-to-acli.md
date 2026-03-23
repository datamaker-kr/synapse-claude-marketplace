# Jira MCP → Atlassian CLI 전환 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jira MCP Server를 제거하고 Atlassian CLI(`acli`)를 직접 사용하도록 플러그인을 전환한다.

**Architecture:** MCP 서버(TypeScript)를 완전히 삭제하고, 스킬/커맨드 문서에서 Claude가 `acli` CLI 명령어를 Bash로 직접 실행하도록 안내한다. CHANGELOG 파싱도 Bash 패턴으로 대체한다.

**Tech Stack:** Atlassian CLI (`acli`), Bash, Git

**Spec:** `docs/superpowers/specs/2026-03-23-jira-mcp-to-acli-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Rewrite | `plugins/platform-dev-team-common/skills/jira-sync/SKILL.md` | 상태 전이 규칙 + acli 명령어 레퍼런스 |
| Rewrite | `plugins/platform-dev-team-common/commands/sync-jira-tickets.md` | `/sync-jira-tickets` 커맨드 오케스트레이션 |
| Modify | `plugins/platform-dev-team-common/plugin.json` | description에서 MCP 언급 제거 |
| Create | `plugins/platform-dev-team-common/docs/acli-setup.md` | acli 설치/인증 가이드 |
| Delete | `plugins/platform-dev-team-common/mcp-servers/jira/` (전체) | MCP 서버 제거 |

---

### Task 1: acli 셋업 가이드 작성

**Files:**
- Create: `plugins/platform-dev-team-common/docs/acli-setup.md`

- [ ] **Step 1: 셋업 가이드 파일 작성**

`docs/acli-setup.md`에 다음 내용을 포함한다:

```markdown
# Atlassian CLI (acli) 설정 가이드

## 설치

### macOS (Homebrew)

brew tap atlassian/homebrew-acli
brew install acli

### macOS (직접 다운로드)

# Apple Silicon
curl -LO "https://acli.atlassian.com/darwin/latest/acli_darwin_arm64/acli"
# Intel
curl -LO "https://acli.atlassian.com/darwin/latest/acli_darwin_amd64/acli"
chmod +x ./acli
sudo mv ./acli /usr/local/bin/acli

## 인증 (OAuth)

acli jira auth login --web

브라우저가 열리면 Atlassian 사이트를 선택하고 권한을 허용합니다.

## 인증 확인

acli jira auth status

## 테스트

acli jira workitem view SYN-1234 --json

## 버전 확인

acli --version
```

- [ ] **Step 2: 커밋**

```bash
git add plugins/platform-dev-team-common/docs/acli-setup.md
git commit -m "문서: Atlassian CLI 설치 및 인증 가이드 추가"
```

---

### Task 2: jira-sync 스킬 재작성

**Files:**
- Rewrite: `plugins/platform-dev-team-common/skills/jira-sync/SKILL.md`

- [ ] **Step 1: SKILL.md 재작성**

frontmatter의 `allowed-tools`에서 모든 `mcp__jira__*`를 제거하고 `Bash`, `Read`만 남긴다.

본문을 다음과 같이 재작성한다:

```markdown
---
name: jira-sync
description: CHANGELOG 기반 Jira 티켓 상태를 Git 브랜치 상태에 맞게 동기화하는 로직을 가이드합니다.
allowed-tools: Bash, Read
user-invocable: false
---

# Jira Sync Skill

## 사전 조건

- Atlassian CLI (`acli`)가 설치되어 있어야 합니다
- `acli jira auth login --web`으로 인증이 완료된 상태여야 합니다
- 확인: `acli jira auth status`

## 목적

CHANGELOG.md의 티켓들을 Git 브랜치(main, staging, production) 상태에 맞춰 Jira 상태를 자동 동기화한다.

## Jira 상태 체계 (6개)

| 상태 | 의미 |
|------|------|
| 대기 | 미착수 또는 로컬 작업 중 |
| 진행 중 | 원격 Git에 올라갔으나 PR 없음 |
| 리뷰 중 | PR이 생성된 상태 |
| 리뷰 완료 | PR Approve 후 병합 완료 |
| 검토 완료 | QA 담당자가 확인 완료 |
| 완료 | Production 브랜치에 병합 |

## acli 명령어 레퍼런스

### 티켓 상태 조회

acli jira workitem view {KEY} --json -f status,customfield_10659

### 상태 전이

acli jira workitem transition -k {KEY} -s "{상태명}" -y

### 커스텀 필드 업데이트

echo '{"fields":{"customfield_10659":{"id":"10678"}}}' > /tmp/jira-field-update.json
acli jira workitem edit -k {KEY} --from-json /tmp/jira-field-update.json
rm /tmp/jira-field-update.json

### CHANGELOG에서 티켓 추출

# Unreleased 섹션
sed -n '/## \[Unreleased\]/,/^## \[/p' {CHANGELOG_PATH} | grep -oE '[A-Z]+-[0-9]+' | sort -u

# 특정 버전 섹션
sed -n '/## .*{VERSION}/,/^## /p' {CHANGELOG_PATH} | grep -oE '[A-Z]+-[0-9]+' | sort -u

### 브랜치에 티켓 포함 여부 확인

git log {BRANCH} --grep="{TICKET_ID}" --oneline

## 상태 전이 규칙

### 규칙 1: main 또는 staging 병합 → 리뷰 완료

- **조건**: 티켓이 main 또는 staging 브랜치에 포함되어 있고, 현재 상태가 리뷰 완료 미만 (대기, 진행 중, 리뷰 중)
- **액션**: `acli jira workitem transition -k {KEY} -s "리뷰 완료" -y`

### 규칙 2: staging 배포 여부 → customfield 변경

- **조건**: 티켓이 staging 또는 production 브랜치에 포함됨
- **액션**: 커스텀 필드 업데이트 (이미 설정되어 있으면 SKIP)

### 규칙 3: staging + 검토 완료 → SKIP

- **조건**: 티켓이 staging에 있고 현재 상태가 "검토 완료"
- **액션**: 건들지 않음

### 규칙 4: production 병합 → 완료

- **조건**: 티켓이 production 브랜치에 포함되고 현재 상태가 "완료"가 아님
- **액션**: `acli jira workitem transition -k {KEY} -s "완료" -y`

## 상태 순서 (전이 판단용)

대기 < 진행 중 < 리뷰 중 < 리뷰 완료 < 검토 완료 < 완료

"리뷰 완료 미만"은 상태가 {대기, 진행 중, 리뷰 중} 중 하나인 경우를 의미한다.

## Custom Field 정보

- 필드: `customfield_10659`
- 타입: select
- staging 병합 시 값: `{id: "10678"}`
```

- [ ] **Step 2: 커밋**

```bash
git add plugins/platform-dev-team-common/skills/jira-sync/SKILL.md
git commit -m "리팩토링: jira-sync 스킬을 Atlassian CLI 기반으로 재작성"
```

---

### Task 3: sync-jira-tickets 커맨드 재작성

**Files:**
- Rewrite: `plugins/platform-dev-team-common/commands/sync-jira-tickets.md`

- [ ] **Step 1: 커맨드 파일 재작성**

MCP 관련 내용(0-2: MCP 자동 설정, 0-3: ~/.claude.json 등록)을 모두 제거하고, `acli` 기반으로 재작성한다.

핵심 변경:
- 0단계: MCP 서버 확인 → `acli jira auth status`로 인증 확인
- 1단계: `changelog_extract_tickets` MCP 도구 → `sed` + `grep` Bash 명령어
- 2단계: `changelog_check_branches` MCP 도구 → `git log --grep` Bash 명령어
- 3단계: `jira_get_ticket` MCP 도구 → `acli jira workitem view --json`
- 4단계: `jira_transition`, `jira_update_field` MCP 도구 → `acli jira workitem transition`, `acli jira workitem edit --from-json`
- 5단계: 결과 리포트 형식은 동일하게 유지

전체 내용:

```markdown
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
- Atlassian CLI (`acli`)가 설치 및 인증되어 있어야 합니다

## 사용법

/sync-jira-tickets
/sync-jira-tickets --section unreleased
/sync-jira-tickets --section v2026.1.1
/sync-jira-tickets --dry-run

## 옵션

- `--section <name>`: 특정 섹션만 동기화 (기본: unreleased)
- `--dry-run`: 실제 변경 없이 계획만 출력

## 실행 절차

jira-sync 스킬의 상태 전이 규칙을 따라 아래 순서로 실행합니다:

### 0단계: 환경 확인

#### 0-1. 프로젝트 확인

1. Bash로 `pwd`를 실행하여 현재 디렉토리를 확인합니다.
2. Git 루트를 확인합니다: `git rev-parse --show-toplevel`
3. CHANGELOG.md 존재 여부를 확인합니다.
4. 없으면 에러 메시지를 출력하고 중단합니다.

#### 0-2. Atlassian CLI 인증 확인

`acli jira auth status`를 실행하여 인증 상태를 확인합니다.

- **성공** → 1단계로 진행합니다.
- **실패** → 아래 안내를 출력하고 중단합니다:

> Atlassian CLI 인증이 필요합니다. 아래 명령어를 실행하세요:
>
> 1. 설치 (미설치 시): `brew tap atlassian/homebrew-acli && brew install acli`
> 2. 인증: `acli jira auth login --web`
> 3. 인증 확인 후 `/sync-jira-tickets`를 다시 실행하세요.

### 1단계: 티켓 추출

CHANGELOG.md에서 Bash로 티켓 ID를 추출합니다.

기본 (unreleased 섹션):
sed -n '/## \[Unreleased\]/,/^## \[/p' <git-root>/CHANGELOG.md | grep -oE '[A-Z]+-[0-9]+' | sort -u

특정 버전 섹션:
sed -n '/## .*<section>/,/^## /p' <git-root>/CHANGELOG.md | grep -oE '[A-Z]+-[0-9]+' | sort -u

추출된 티켓이 없으면 "동기화할 티켓이 없습니다"를 출력하고 중단합니다.

### 2단계: 브랜치 확인

각 티켓이 어떤 브랜치에 포함되는지 Git으로 확인합니다.

git fetch --all

각 티켓에 대해:
git log origin/main --grep="{ticketId}" --oneline
git log origin/staging --grep="{ticketId}" --oneline
git log origin/production --grep="{ticketId}" --oneline

출력이 있으면 해당 브랜치에 포함된 것으로 판단합니다.

### 3단계: 현재 상태 조회

각 티켓의 현재 Jira 상태를 조회합니다.

acli jira workitem view {KEY} --json -f status,customfield_10659

JSON 출력에서 status와 customfield_10659 값을 파싱합니다.

### 4단계: 상태 전이 규칙 적용

각 티켓에 대해 jira-sync 스킬의 규칙을 적용합니다:

| 조건 | 액션 |
|------|------|
| main/staging에 있고 상태 < 리뷰 완료 | `acli jira workitem transition -k {KEY} -s "리뷰 완료" -y` |
| staging 또는 production에 있음 | 커스텀 필드 업데이트 (이미 설정 시 SKIP) |
| staging + 검토 완료 | SKIP |
| production에 있고 완료 아님 | `acli jira workitem transition -k {KEY} -s "완료" -y` |

커스텀 필드 업데이트 방법:
echo '{"fields":{"customfield_10659":{"id":"10678"}}}' > /tmp/jira-field-update.json
acli jira workitem edit -k {KEY} --from-json /tmp/jira-field-update.json
rm /tmp/jira-field-update.json

### 5단계: 결과 리포트

모든 처리가 완료되면 아래 형식으로 결과를 보여줍니다:

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

## --dry-run 모드

`--dry-run` 옵션이 있으면 4단계에서 실제 acli 명령 실행 없이 "계획"만 보여줍니다.
3단계(상태 조회)까지만 수행하고, 예상 액션을 테이블로 출력합니다.
```

- [ ] **Step 2: 커밋**

```bash
git add plugins/platform-dev-team-common/commands/sync-jira-tickets.md
git commit -m "리팩토링: sync-jira-tickets 커맨드를 Atlassian CLI 기반으로 재작성"
```

---

### Task 4: plugin.json 수정

**Files:**
- Modify: `plugins/platform-dev-team-common/plugin.json`

- [ ] **Step 1: description에서 MCP 관련 내용 제거**

`plugin.json`의 `description` 필드 변경:

Before:
```
"Common Claude plugin for development teams - TDD guidance, documentation management, PR management with Mermaid charts, and Jira integration"
```

After:
```
"Common Claude plugin for development teams - TDD guidance, documentation management, PR management with Mermaid charts, and Jira integration via Atlassian CLI"
```

- [ ] **Step 2: 커밋**

```bash
git add plugins/platform-dev-team-common/plugin.json
git commit -m "수정: plugin.json description에 Atlassian CLI 반영"
```

---

### Task 5: MCP 서버 디렉토리 삭제

**Files:**
- Delete: `plugins/platform-dev-team-common/mcp-servers/jira/` (전체 디렉토리)

- [ ] **Step 1: mcp-servers/jira 디렉토리 확인**

삭제 전 디렉토리 내용을 확인한다:
```bash
ls -la plugins/platform-dev-team-common/mcp-servers/jira/
```

- [ ] **Step 2: 디렉토리 삭제**

```bash
git rm -r plugins/platform-dev-team-common/mcp-servers/jira/
```

- [ ] **Step 3: mcp-servers 디렉토리가 비었으면 삭제**

```bash
# mcp-servers 디렉토리에 다른 서버가 있는지 확인
ls plugins/platform-dev-team-common/mcp-servers/
# 비었으면 디렉토리도 삭제 (git은 빈 디렉토리를 추적하지 않으므로 자동 처리됨)
```

- [ ] **Step 4: 커밋**

```bash
git commit -m "리팩토링: Jira MCP 서버 제거 (Atlassian CLI로 대체)"
```

---

### Task 6: 최종 검증 및 CHANGELOG

**Files:**
- Modify: `CHANGELOG.md` (프로젝트 루트)

- [ ] **Step 1: 플러그인 파일 구조 확인**

```bash
find plugins/platform-dev-team-common -type f | head -30
```

MCP 서버 관련 파일이 남아있지 않은지 확인한다.

- [ ] **Step 2: 스킬/커맨드에서 MCP 참조 검색**

```bash
grep -r "mcp__jira\|MCP\|mcp-servers" plugins/platform-dev-team-common/ --include="*.md" --include="*.json"
```

MCP 참조가 남아있으면 제거한다.

- [ ] **Step 3: CHANGELOG 엔트리 추가**

`/add-changelog` 또는 수동으로 CHANGELOG.md의 Unreleased 섹션에 추가:

```markdown
### Changed
- Jira MCP 서버를 Atlassian CLI(`acli`) 기반으로 전환
- jira-sync 스킬 및 sync-jira-tickets 커맨드를 acli 명령어로 재작성

### Removed
- `mcp-servers/jira/` 디렉토리 (TypeScript MCP 서버)
```

- [ ] **Step 4: 커밋**

```bash
git add CHANGELOG.md
git commit -m "문서: CHANGELOG에 Jira MCP → Atlassian CLI 전환 기록"
```

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

- Jira MCP 서버가 설정되어 있어야 합니다 (~/.claude/settings.json)
- Git 저장소 루트에 CHANGELOG.md가 있어야 합니다
- Git 저장소여야 합니다

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

### 0단계: 현재 프로젝트 확인

현재 작업 디렉토리(CWD)를 기준으로 프로젝트를 판별합니다.

1. Bash로 `pwd`를 실행하여 현재 디렉토리를 확인합니다.
2. Git 루트를 확인합니다: `git rev-parse --show-toplevel`
3. CHANGELOG.md 존재 여부를 확인합니다.
4. 없으면 에러 메시지를 출력하고 중단합니다.

이후 모든 도구 호출에서 이 경로를 사용합니다:
- `changelog_extract_tickets`의 `filePath`: `<git-root>/CHANGELOG.md`
- `changelog_check_branches`의 `cwd`: `<git-root>`

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

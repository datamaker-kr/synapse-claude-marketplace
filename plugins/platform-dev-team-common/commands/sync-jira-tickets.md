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
```bash
sed -n '/## \[Unreleased\]/,/^## \[/p' <git-root>/CHANGELOG.md | grep -oE '[A-Z]+-[0-9]+' | sort -u
```

특정 버전 섹션:
```bash
sed -n '/## .*<section>/,/^## /p' <git-root>/CHANGELOG.md | grep -oE '[A-Z]+-[0-9]+' | sort -u
```

추출된 티켓이 없으면 "동기화할 티켓이 없습니다"를 출력하고 중단합니다.

### 2단계: 브랜치 확인

각 티켓이 어떤 브랜치에 포함되는지 Git으로 확인합니다.

```bash
git fetch --all
```

각 티켓에 대해:
```bash
git log origin/main --grep="{ticketId}" --oneline
git log origin/staging --grep="{ticketId}" --oneline
git log origin/production --grep="{ticketId}" --oneline
```

출력이 있으면 해당 브랜치에 포함된 것으로 판단합니다.

### 3단계: 현재 상태 조회

각 티켓의 현재 Jira 상태를 조회합니다.

```bash
acli jira workitem view {KEY} --json -f status,{jira-sync 스킬의 Custom Field 테이블에 있는 모든 필드 ID}
```

JSON 출력에서 status와 커스텀 필드 값을 파싱합니다.

### 4단계: 상태 전이 규칙 적용

각 티켓에 대해 jira-sync 스킬의 규칙을 적용합니다:

| 조건 | 액션 |
|------|------|
| main/staging에 있고 상태 < 리뷰 완료 | `acli jira workitem transition -k {KEY} -s "리뷰 완료" -y` |
| staging 또는 production에 있음 | 커스텀 필드 업데이트 (이미 설정 시 SKIP) |
| staging + 검토 완료 | SKIP |
| production에 있고 완료 아님 | `acli jira workitem transition -k {KEY} -s "완료" -y` |

커스텀 필드 업데이트 방법은 jira-sync 스킬의 "커스텀 필드 업데이트" 레퍼런스와 Custom Field 테이블을 참조합니다.

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

`--dry-run` 옵션이 있으면 4단계에서 실제 acli 명령 실행 없이 "계획"만 보여줍니다.
3단계(상태 조회)까지만 수행하고, 예상 액션을 테이블로 출력합니다.

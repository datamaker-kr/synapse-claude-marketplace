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

```bash
acli jira workitem view {KEY} --json -f status,customfield_10659
```

### 상태 전이

```bash
acli jira workitem transition -k {KEY} -s "{상태명}" -y
```

### 커스텀 필드 업데이트

```bash
echo '{"fields":{"customfield_10659":{"id":"10678"}}}' > /tmp/jira-field-update.json
acli jira workitem edit -k {KEY} --from-json /tmp/jira-field-update.json
rm /tmp/jira-field-update.json
```

### CHANGELOG에서 티켓 추출

```bash
# Unreleased 섹션
sed -n '/## \[Unreleased\]/,/^## \[/p' {CHANGELOG_PATH} | grep -oE '[A-Z]+-[0-9]+' | sort -u

# 특정 버전 섹션
sed -n '/## .*{VERSION}/,/^## /p' {CHANGELOG_PATH} | grep -oE '[A-Z]+-[0-9]+' | sort -u
```

### 브랜치에 티켓 포함 여부 확인

```bash
git log {BRANCH} --grep="{TICKET_ID}" --oneline
```

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

---
name: sync-jira-tickets
description: >-
  현재 프로젝트의 CHANGELOG.md에 있는 Jira 티켓들을 Git 브랜치(main, staging, production)
  상태에 맞게 동기화합니다. 사용자가 Jira 티켓 상태 업데이트, CHANGELOG 기반 동기화,
  배포 브랜치별 티켓 관리를 언급할 때 이 스킬을 사용하세요.
allowed-tools: Bash, Read
user-invocable: true
disable-model-invocation: true
argument-hint: [--section <name>] [--dry-run]
---

# Sync Jira Tickets

현재 프로젝트의 CHANGELOG.md 티켓들을 Git 브랜치(main, staging, production) 상태에 따라 Jira 상태를 자동 동기화한다.

## 적용 범위

이 스킬은 **현재 작업 디렉토리(CWD)의 프로젝트에만** 적용된다.
여러 레포를 동시에 처리하지 않으며, 각 프로젝트에서 개별적으로 실행해야 한다.

적용 대상 프로젝트:
- synapse-workspace
- synapse-backend
- synapse-annotator
- synapse-sdk
- synapse-agent

## 사용법

```
/sync-jira-tickets
/sync-jira-tickets --section unreleased
/sync-jira-tickets --section v2026.1.1
/sync-jira-tickets --dry-run
```

## 옵션

- `--section <name>`: 특정 섹션만 동기화 (기본: unreleased)
- `--dry-run`: 실제 변경 없이 예상 액션만 출력

---

## 실행 절차

### 0단계: 환경 확인

모든 사전 조건을 순서대로 확인한다. 하나라도 실패하면 안내 메시지를 출력하고 즉시 중단한다.

#### 0-1. Git 설치 확인

`git --version`을 실행하여 Git 설치 여부를 확인한다.

- **성공** → 0-2로 진행한다.
- **실패** → 아래 안내를 출력하고 중단한다:

> Git이 설치되어 있지 않습니다. 아래 명령어로 설치하세요:
>
> - macOS: `xcode-select --install` 또는 `brew install git`
> - Linux (Debian/Ubuntu): `sudo apt install git`
> - Linux (RHEL/Fedora): `sudo dnf install git`

#### 0-2. 프로젝트 확인

1. `pwd`로 현재 디렉토리를 확인한다.
2. `git rev-parse --show-toplevel`로 Git 루트를 확인한다. 실패하면 "Git 저장소가 아닙니다"를 출력하고 중단한다.
3. Git 루트에 CHANGELOG.md가 존재하는지 확인한다. 없으면 "CHANGELOG.md를 찾을 수 없습니다"를 출력하고 중단한다.

#### 0-3. Atlassian CLI 확인

먼저 `which acli`로 설치 여부를 확인한다.

- **미설치** → 아래 안내를 출력하고 중단한다:

> Atlassian CLI가 설치되어 있지 않습니다:
>
> ```bash
> brew tap atlassian/homebrew-acli && brew install acli
> ```

- **설치됨** → `acli jira auth status`로 인증 상태를 확인한다.
  - **인증됨** → 0-4로 진행한다.
  - **미인증** → 아래 안내를 출력하고 중단한다:

> Atlassian CLI 인증이 필요합니다:
>
> 1. `acli jira auth login --web`
> 2. 인증 완료 후 `/sync-jira-tickets`를 다시 실행하세요.

#### 0-4. 원격 브랜치 최신화

```bash
git fetch --all
```

브랜치 포함 여부를 정확히 판단하기 위해, 티켓 추출 전에 원격 브랜치를 최신 상태로 가져온다.
네트워크 오류로 실패하면 "원격 브랜치를 가져올 수 없습니다. 네트워크 연결을 확인하세요"를 출력하고 중단한다.

#### 0-5. 대상 브랜치 존재 확인

```bash
git branch -r | grep -E 'origin/(main|staging|production)$'
```

- `origin/main`은 필수다. 없으면 "origin/main 브랜치를 찾을 수 없습니다"를 출력하고 중단한다.
- `origin/staging`, `origin/production`은 선택이다. 존재하지 않는 브랜치는 이후 단계에서 건너뛴다. 사용자에게 어떤 브랜치가 존재하는지 알려준다.

### 1단계: 티켓 추출

CHANGELOG.md에서 Bash로 티켓 ID를 추출한다.

기본 (unreleased 섹션):
```bash
sed -n '/## \[Unreleased\]/,/^## \[/p' <git-root>/CHANGELOG.md | grep -oE '[A-Z]+-[0-9]+' | sort -u
```

특정 버전 섹션 (`--section` 옵션):
```bash
sed -n '/## .*<section>/,/^## /p' <git-root>/CHANGELOG.md | grep -oE '[A-Z]+-[0-9]+' | sort -u
```

추출된 티켓이 없으면 "동기화할 티켓이 없습니다"를 출력하고 중단한다.

### 2단계: 브랜치 확인

각 티켓이 어떤 브랜치에 포함되는지 확인한다. 0-5에서 존재하지 않는 것으로 확인된 브랜치는 건너뛴다.

각 티켓에 대해:
```bash
git log origin/main --grep="{ticketId}" --oneline
git log origin/staging --grep="{ticketId}" --oneline      # staging 존재 시
git log origin/production --grep="{ticketId}" --oneline    # production 존재 시
```

출력이 있으면 해당 브랜치에 포함된 것으로 판단한다.
어떤 브랜치에도 포함되지 않은 티켓은 "브랜치 미포함"으로 표시하고 SKIP한다.

### 3단계: 현재 상태 조회

각 티켓의 현재 Jira 상태를 조회한다.

```bash
acli jira workitem view {KEY} --json -f status,customfield_10659
```

JSON 출력에서 `status`와 커스텀 필드 값을 파싱한다.

조회 실패 시 (티켓 미존재, 권한 부족 등) 해당 티켓을 "조회 실패"로 표시하고 다음 티켓으로 넘어간다. 최종 리포트에 실패 건으로 집계한다.

### 4단계: 상태 전이 규칙 적용

`--dry-run` 옵션이 있으면 이 단계에서 실제 acli 명령을 실행하지 않고 예상 액션만 테이블로 출력한 뒤 5단계로 건너뛴다.

각 티켓에 대해 아래 규칙을 **우선순위 순서대로** 평가한다. 먼저 매칭되는 규칙을 적용하고, 이후 규칙은 건너뛴다.

| 우선순위 | 조건 | 액션 |
|----------|------|------|
| 1 | production에 있고 상태 ≠ 완료 | `acli jira workitem transition -k {KEY} -s "완료" -y` + 커스텀 필드 업데이트 |
| 2 | staging에 있고 상태 = 검토 완료 | SKIP (건들지 않음) |
| 3 | staging에 있고 상태 < 리뷰 완료 | `acli jira workitem transition -k {KEY} -s "리뷰 완료" -y` + 커스텀 필드 업데이트 |
| 4 | staging에 있고 상태 ≥ 리뷰 완료 | 커스텀 필드 업데이트만 (이미 설정 시 SKIP) |
| 5 | main에 있고 상태 < 리뷰 완료 | `acli jira workitem transition -k {KEY} -s "리뷰 완료" -y` |

커스텀 필드 업데이트 시 이미 값이 설정되어 있으면 SKIP한다.

acli 명령 실행 실패 시 해당 티켓을 "실패"로 표시하고 다음 티켓으로 넘어간다. 하나의 실패가 전체 프로세스를 중단하지 않는다.

### 5단계: 결과 리포트

모든 처리가 완료되면 아래 형식으로 결과를 출력한다:

```
## Jira 동기화 결과

프로젝트: <프로젝트 이름> (<git-root>)
섹션: unreleased
대상 브랜치: main, staging, production

| 티켓 | 이전 상태 | 브랜치 | 액션 | 결과 |
|------|----------|--------|------|------|
| SYN-1234 | 리뷰 중 | main | → 리뷰 완료 | 성공 |
| SYN-5678 | 리뷰 완료 | staging | customfield 변경 | 성공 |
| SYN-9012 | 검토 완료 | staging | SKIP | - |
| SYN-3456 | 리뷰 완료 | production | → 완료 | 성공 |
| SYN-7890 | - | - | 브랜치 미포함 | SKIP |
| SYN-4321 | 조회 실패 | main | - | 실패 |

처리: N건 / 스킵: M건 / 실패: K건
```

`--dry-run` 모드에서는 결과 열 대신 "예정" 또는 "SKIP"을 표시한다.

---

## Jira 상태 체계 (6개)

| 상태 | 의미 |
|------|------|
| 대기 | 미착수 또는 로컬 작업 중 |
| 진행 중 | 원격 Git에 올라갔으나 PR 없음 |
| 리뷰 중 | PR이 생성된 상태 |
| 리뷰 완료 | PR Approve 후 병합 완료 |
| 검토 완료 | QA 담당자가 확인 완료 |
| 완료 | Production 브랜치에 병합 |

### 상태 순서 (전이 판단용)

대기 < 진행 중 < 리뷰 중 < 리뷰 완료 < 검토 완료 < 완료

"리뷰 완료 미만"은 상태가 {대기, 진행 중, 리뷰 중} 중 하나인 경우를 의미한다.

---

## Custom Field 정보

새로운 커스텀 필드를 추가할 때는 아래 테이블에 행을 추가하고, 상태 전이 규칙에 해당 조건/액션을 기술한다.

| 필드 ID | 용도 | 타입 | 조건 | 값 |
|---------|------|------|------|-----|
| `customfield_10659` | Staging 배포 여부 | select | staging/production 브랜치에 포함 | `{"id": "10678"}` |

### 커스텀 필드 추가 방법

1. 위 테이블에 새 행을 추가한다
2. "상태 전이 규칙" 섹션의 우선순위 테이블에 해당 조건/액션을 추가한다
3. "티켓 상태 조회" 명령어의 `-f` 파라미터에 새 필드 ID를 추가한다

---

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

Custom Field 테이블에서 해당하는 필드와 값을 JSON으로 구성하여 업데이트한다.

```bash
# 단일 필드
echo '{"fields":{"<FIELD_ID>": <VALUE>}}' > /tmp/jira-field-update.json

# 복수 필드 동시 업데이트
echo '{"fields":{"<FIELD_ID_1>": <VALUE_1>, "<FIELD_ID_2>": <VALUE_2>}}' > /tmp/jira-field-update.json

acli jira workitem edit -k {KEY} --from-json /tmp/jira-field-update.json
rm /tmp/jira-field-update.json
```

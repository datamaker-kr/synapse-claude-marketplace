---
name: plugin-changelog
description: Manages plugin changelog generation following Keep a Changelog format with SemVer. Analyzes GitHub release diffs and generates structured changelogs for Release body updates.
allowed-tools: Bash, Read, Edit, AskUserQuestion
user-invocable: true
---

# Plugin Changelog Skill

## Purpose

Synapse 플러그인의 GitHub Release body에 버전 간 변경사항(Changelog)을 생성하고 관리합니다.
플러그인 publish 후 GitHub Compare API로 diff를 수집하고, Keep a Changelog 형식으로 정리합니다.

## 백엔드 changelog와의 차이

이 skill은 백엔드(`platform-dev-team-common:changelog-manager`)와 **근본적으로 다른 패턴**을 따릅니다:

| | 백엔드 | 플러그인 (이 skill) |
|---|---|---|
| **축적 방식** | 점진적 (매 커밋마다 1항목 추가) | 일괄 생성 (릴리스 단위 전체 diff) |
| **저장 위치** | 로컬 `CHANGELOG.md` 파일 | GitHub Release body |
| **비교 기준** | 로컬 git history | GitHub Compare API (태그 간) |
| **타이밍** | 개발 중 수시로 | `synapse plugin publish` 후 1회 |
| **버전 체계** | CalVer (`YYYY.MM.MICRO`) | SemVer (`X.Y.Z`) |
| **티켓 연동** | JIRA 자동 링크 | 없음 |
| **브랜치** | main/staging | `main` 또는 `variant/{name}` |

---

## Core Capabilities

### 1. GitHub Release Diff 분석

- GitHub Compare API로 두 태그 사이의 변경사항 수집
- 파일 변경 목록, 추가/삭제 라인 수, patch 내용 분석
- 첫 릴리스인 경우 전체 파일 목록 기반 ���석

### 2. Changelog 생성

- diff를 분석하여 Keep a Changelog 카테고리로 자동 분류
- 한국어/영어 지원
- 사용자 관점의 변경 효과 중심 서술

### 3. GitHub Release Body 관리

- 기존 Release body의 Plugin Info 섹션 유지
- Changelog 섹션 삽입/교체
- GitHub API로 Release body 업데이트

---

## Versioning Strategy

플러그인은 [Semantic Versioning](https://semver.org/)을 사용합니다: `X.Y.Z`

**Examples**:
- `1.0.0` - 초기 릴리스
- `1.1.0` - 기능 추가 (minor)
- `1.1.1` - 버그 수정 (patch)
- `2.0.0` - 호환성 깨지는 변경 (major)

### Variant 태그 규칙

variant가 있는 플러그인은 태그에 `+{variant}`가 붙습니다:

```
variant 없음: 1.0.0, 1.1.0, 2.0.0
variant=lig:  1.0.0+lig, 1.1.0+lig
variant=ke:   1.0.0+ke, 1.1.0+ke
```

### 브랜치 규칙

```
github.com/{org}/{plugin-code}/
├── main               ← variant 없는 릴리스
├── variant/lig         ← variant=lig 릴리스
└── variant/ke          ← variant=ke 릴리스
```

---

## Changelog Categories

[Keep a Changelog](https://keepachangelog.com/en/1.0.0/) 기반:

- **Added**: 새 액션, 기능, 설정 옵션 추가
- **Changed**: 기존 기능 수정, 성능 개선, 리팩터링
- **Fixed**: 버그 수정, 에러 처리 개선
- **Removed**: 기능/파일 삭제

> **Note**: 백엔드와 달리 Deprecated, Security 카테고리는 플러그인에서 거의 사용하지 않으므로 기본 4개 카테고리만 사용합니다. 필요 시 추가 가능합니다.

---

## Entry Format

플러그인은 JIRA 티켓이 없으므로, 설명만으로 구성합니다:

```markdown
- 설명 (한국어 또는 영어)
```

**한국어 예시 (기본)**:
```markdown
#### Added
- 멀티포인트 프롬프트 지원 추가
- `config.yaml`에 `serve_options` 설정 지원

#### Changed
- 추론 속도 개선 (배치 처리 방식 변경)

#### Fixed
- GPU 메모리 누수 수정
```

**영어 예시**:
```markdown
#### Added
- Add multi-point prompt support
- Add `serve_options` configuration in `config.yaml`

#### Changed
- Improve inference speed (batch processing)

#### Fixed
- Fix GPU memory leak
```

### 작성 규칙

**한국어**:
- 명사형 종결: "기능 추가", "오류 수정", "속도 개선"
- 간결하고 명확하게
- 기술적 세부사항보다 **사용자 관점의 변경 효과** 설명

**영어**:
- 동사 원형으로 시작: "Add", "Fix", "Improve", "Remove"
- 현재형 사용
- 간결하고 명확하게

**공통**:
- 파일명, 설정 키, 클래스명 등 코드 요소는 backtick(`` ` ``)으로 감싸기
- 한 항목 = 한 줄 (멀티라인 금지)
- 비어있는 카테고리는 생략

---

## Release Body Structure

GitHub Release body의 최종 형태:

```markdown
## {plugin-name} v{version}

{description}

### Changelog (from v{prev_version})

#### Added
- 새로운 전처리 액션 `preprocess` 추가
- `config.yaml`에 `serve_options` 설정 ��원

#### Changed
- 추��� 속도 개선 (배치 ���리 방식 변��)

#### Fixed
- GPU 메모리 누수 수정

### Plugin Info
- Code: `{code}`
- Category: {category}
- Actions: `train`, `infer`

---
*Published via Synapse SDK*
```

**첫 릴리스인 경우:**
```markdown
### Changelog (Initial Release)

#### Added
- `train` 액션: 모델 학습 기능
- `infer` 액션: 추론 기능
- `config.yaml`: 플러그인 설정 정의
- `requirements.txt`: Python 의존성
```

---

## Diff 수집 방법

### 이전 태그 탐색

같은 variant에 속하는 릴리스만 비교 대상으로 합니다:

```
현재 태그: 2.0.8+lig
릴리스 목록: [2.0.8+lig, 2.0.7+lig, 2.0.6+lig, 2.0.7, 2.0.6]
                                ↑
필터링: +lig으로 끝나는 것만 → [2.0.8+lig, 2.0.7+lig, 2.0.6+lig]
현재 제외 → [2.0.7+lig, 2.0.6+lig]
직전 선택 → 2.0.7+lig
```

**variant 없는 경우:**
```
현재 태그: 2.0.8
릴리스 목록: [2.0.8, 2.0.8+lig, 2.0.7, 2.0.7+lig, 2.0.6]
필터링: +를 포함하지 않는 것만 → [2.0.8, 2.0.7, 2.0.6]
현재 제외 → [2.0.7, 2.0.6]
직전 선택 → 2.0.7
```

### GitHub Compare API

```bash
# 일반 모드
gh api repos/{org}/{code}/compare/{prev_tag}...{current_tag}

# 응답에서 추출할 정보
# - .total_commits: 커밋 수
# - .files[]: 변경된 파일 목록
#   - .filename: 파일 경로
#   - .status: added/modified/removed/renamed
#   - .additions: 추가된 라인 수
#   - .deletions: 삭제된 라인 수
#   - .patch: diff 내용 (큰 파일은 생략될 수 있음)
```

### 첫 릴리스 모드

이전 태그가 없는 경우, 현재 태그의 tree 전체를 분석합니다:

```bash
# 태그의 커밋 SHA
gh api repos/{org}/{code}/git/ref/tags/{tag} --jq '.object.sha'

# 파일 목록
gh api repos/{org}/{code}/git/trees/{sha}?recursive=1 --jq '.tree[] | select(.type=="blob") | .path'
```

---

## Diff 분석 → 카테고리 분류 가이드

Claude Code LLM이 diff를 분석할 때 참고하는 분류 기준:

### Added로 분류
- `status: "added"` — 새 파일
- 기존 파일에 새 클래스/함수/엔드포인트 추가
- `config.yaml`에 새 설정 필드 추가
- 새 액션(action) 추가

### Changed로 분류
- `status: "modified"` — 기존 로직 변경
- 성능 개선 (알고리즘 변경, 최적화)
- 리팩터링 (동작은 동일, 구조 변경)
- 의존성 버전 업데이트

### Fixed로 분류
- 버그 수정 (에러 발생하던 것이 정상 동작)
- 에러 핸들링 추가/개선
- 엣지 케이스 처리

### Removed로 분류
- `status: "removed"` — 파일 삭제
- 기존 기능/클래스/함수 제거
- 설정 옵션 제거

### 무시할 변경
- `.gitignore`, `.synapseignore` 등 메타 파일만 변경
- 주석만 변경
- import 정렬만 변경
- 포매팅만 변경

---

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `code` | 플러그인 코드 | `config.yaml`에서 읽기 |
| `version` | 대상 버전 | `config.yaml`에서 읽기 |
| `variant` | variant 태그 | `config.yaml`에서 읽기 |
| `lang` | changelog 언어 (`ko`/`en`) | `ko` |

---

## Integration

이 skill은 다음에 의해 호출됩니다:
- `/synapse-plugin-helper:add-changelog` command — publish 후 changelog 생성

---

## Best Practices

### Do
- **사용자 관점**으로 작성 (구현 세부사항이 아닌 효과/결과 중심)
- **간결하게** — 한 항목 한 줄
- 코드 요소에 **backtick** 사용
- 비어있는 카테고리는 **생략**
- 관련 변경은 **하나의 항목**으로 묶기

### Don't
- 모든 파일 변경을 나열하지 않기 (의미 있는 변경만)
- 포매팅/린트 변경을 changelog에 포함하지 않기
- 모호한 설명 ("코드 수정", "업데이트") 사용하지 않기
- 같은 변경을 여러 카테고리에 중복 기재하지 않기

# changelog-manager Skill

Changelog 관리를 위한 전문 스킬입니다. [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) 형식과 [Calendar Versioning](https://calver.org/)을 따라 변경 이력을 관리합니다.

## 개요

**활성화**: 사용자가 changelog 추가를 요청할 때 (`/add-changelog` 커맨드)

**목적**: CHANGELOG.md에 적절한 형식으로 변경 이력 추가

## 주요 기능

### 1. 자동 변경 분석

- Git 커밋 메시지 분석
- 변경된 파일 목록 검토
- 변경 범위 및 영향도 파악
- 적절한 카테고리 제안

### 2. 티켓 ID 추출

- 브랜치 이름에서 자동 추출
- 패턴: `feature/SYN-1234-description` → `SYN-1234`
- 수동 지정 가능 (`--ticket` 옵션)

### 3. 다국어 지원

- **한글** (기본값): 한국어로 변경 내역 작성
- **영어**: 영어로 변경 내역 작성

### 4. Keep a Changelog 형식 준수

- 표준 카테고리 사용
- 명확한 변경 설명
- 티켓 링크 포함
- 시간순 정렬 유지

## 버전 관리 전략

이 플러그인은 [Calendar Versioning](https://calver.org/)을 사용합니다 (`YYYY.Minor.Patch`)

```
2026.1.0  - 2026년 첫 번째 마이너 릴리스
2026.1.1  - 첫 번째 패치 릴리스
2026.2.0  - 2026년 두 번째 마이너 릴리스
```

## Changelog 카테고리

### Added (추가)
새로운 기능, 엔드포인트, 기능성

**예시**:
```markdown
- [SYN-1234](https://jira.example.com/browse/SYN-1234) 사용자 프로필 이미지 업로드 기능 추가
- [SYN-1235](https://jira.example.com/browse/SYN-1235) OAuth 인증 지원 추가
```

### Changed (변경)
기존 기능의 변경, 개선, 업데이트

**예시**:
```markdown
- [SYN-1240](https://jira.example.com/browse/SYN-1240) 사용자 검색 API 응답 속도 50% 개선
- [SYN-1241](https://jira.example.com/browse/SYN-1241) 프로필 편집 UI 개선
```

### Fixed (수정)
버그 수정, 오류 정정, 이슈 해결

**예시**:
```markdown
- [SYN-1250](https://jira.example.com/browse/SYN-1250) 로그인 시 세션 만료 오류 수정
- [SYN-1251](https://jira.example.com/browse/SYN-1251) 파일 업로드 크기 제한 오류 해결
```

### Deprecated (지원 중단 예정)
곧 제거될 기능

**예시**:
```markdown
- [SYN-1260](https://jira.example.com/browse/SYN-1260) v1 API 지원 중단 예정 (2026년 6월)
```

### Removed (제거)
제거된 기능

**예시**:
```markdown
- [SYN-1270](https://jira.example.com/browse/SYN-1270) v1 API 완전 제거
```

### Security (보안)
보안 수정

**예시**:
```markdown
- [SYN-1280](https://jira.example.com/browse/SYN-1280) XSS 취약점 수정
```

## 사용 방법

### 기본 사용 (Added, 한글)

```bash
/add-changelog
```

**결과**:
```markdown
## [Unreleased] - 2026-01-19

### Added
- [SYN-1234](https://jira.example.com/browse/SYN-1234) 사용자 인증 기능 추가
```

### 특정 카테고리 지정

```bash
/add-changelog --type fixed
```

**결과**:
```markdown
### Fixed
- [SYN-1234](https://jira.example.com/browse/SYN-1234) 로그인 오류 수정
```

### 영어로 작성

```bash
/add-changelog --type changed --lang eng
```

**결과**:
```markdown
### Changed
- [SYN-1234](https://jira.example.com/browse/SYN-1234) Improve user search performance
```

### 티켓 ID 수동 지정

```bash
/add-changelog --ticket SYN-5678 --type added
```

## 작동 방식

### 1단계: 티켓 ID 추출

**브랜치 이름에서 자동 추출**:
```bash
현재 브랜치: feature/SYN-1234-user-authentication
추출된 티켓: SYN-1234
```

**수동 지정**:
```bash
/add-changelog --ticket SYN-5678
```

### 2단계: 변경 사항 분석

**최근 커밋 검토**:
```bash
git log --oneline --since="$(git describe --tags --abbrev=0)"
```

**변경된 파일 분석**:
```bash
git diff --name-status HEAD~1..HEAD
```

**분석 내용**:
- 커밋 메시지
- 변경된 파일 타입
- 코드 diff
- 영향 범위

### 3단계: 설명 생성

**한글 예시**:
```
분석 결과:
- auth/ 디렉토리에 새 파일 추가
- JWT 토큰 생성 로직 구현
- 로그인 API 엔드포인트 추가

생성된 설명:
"JWT 기반 사용자 인증 시스템 추가"
```

**영어 예시**:
```
Analysis:
- New files in auth/ directory
- JWT token generation logic
- Login API endpoint

Generated description:
"Add JWT-based user authentication system"
```

### 4단계: CHANGELOG.md 업데이트

**기존 Unreleased 섹션에 추가**:
```markdown
## [Unreleased] - 2026-01-19

### Added
- [SYN-1234](https://jira.example.com/browse/SYN-1234) JWT 기반 사용자 인증 시스템 추가
- [SYN-1200](https://jira.example.com/browse/SYN-1200) 기존 항목...
```

**없으면 섹션 생성**:
```markdown
## [Unreleased] - 2026-01-19

### Added
- [SYN-1234](https://jira.example.com/browse/SYN-1234) JWT 기반 사용자 인증 시스템 추가
```

## 형식 가이드라인

### 티켓 링크 형식

```markdown
- [TICKET-ID](JIRA-URL) Description
```

**구성 요소**:
- `TICKET-ID`: 프로젝트 코드 + 번호 (예: SYN-1234)
- `JIRA-URL`: JIRA 티켓 전체 URL
- `Description`: 변경 사항 설명

### 설명 작성 규칙

**한글**:
- 명사형 종결: "기능 추가", "오류 수정", "성능 개선"
- 간결하고 명확하게
- 기술적 세부사항보다 사용자 관점

**영어**:
- 동사 원형으로 시작: "Add", "Fix", "Improve"
- 현재형 사용
- 간결하고 명확하게

### 좋은 예시

✅ **Good**:
```markdown
- [SYN-1234](URL) 사용자 프로필 이미지 업로드 기능 추가
- [SYN-1235](URL) Add user profile image upload feature
- [SYN-1240](URL) API 응답 속도 50% 개선
- [SYN-1241](URL) Improve API response time by 50%
```

❌ **Bad**:
```markdown
- [SYN-1234](URL) 코드 추가함
- [SYN-1235](URL) Added some code
- [SYN-1240](URL) 변경
- [SYN-1241](URL) Changes
```

## CHANGELOG.md 구조

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Calendar Versioning](https://calver.org/).

## [Unreleased] - yyyy-mm-dd

### Added
- [TICKET-ID](URL) New feature description

### Changed
- [TICKET-ID](URL) Updated feature description

### Fixed
- [TICKET-ID](URL) Bug fix description

## [2026.1.0] - 2026-01-15

### Added
- [SYN-1200](URL) Feature 1
- [SYN-1201](URL) Feature 2

### Changed
- [SYN-1210](URL) Change 1

### Fixed
- [SYN-1220](URL) Fix 1

---

[Unreleased]: https://github.com/org/repo/compare/v2026.1.0...HEAD
[2026.1.0]: https://github.com/org/repo/releases/tag/v2026.1.0
```

## 오류 처리

### 티켓 ID 없음

```
경고: 브랜치 이름에서 티켓 ID를 찾을 수 없습니다.
티켓 ID를 입력하세요 (예: SYN-1234):
```

### CHANGELOG.md 없음

```
CHANGELOG.md 파일이 없습니다. 새로 생성합니다.
```

**생성되는 파일**:
```markdown
# Changelog

...

## [Unreleased] - 2026-01-19

### Added
```

### Unreleased 섹션 없음

```
Unreleased 섹션을 추가합니다.
```

### 잘못된 카테고리

```
경고: 'fixd'는 유효하지 않은 카테고리입니다.
유효한 카테고리: added, changed, fixed, deprecated, removed, security
기본값 'added'를 사용합니다.
```

## 예시 시나리오

### 시나리오 1: 새 기능 추가

```bash
# 현재 브랜치: feature/SYN-1234-oauth-login
# 변경사항: OAuth 로그인 구현

User: /add-changelog

changelog-manager:
브랜치에서 티켓 ID 추출: SYN-1234
최근 변경사항 분석 중...

발견된 변경사항:
- auth/oauth.py (신규)
- views/login.py (수정)
- tests/test_oauth.py (신규)

생성된 설명: "OAuth 기반 소셜 로그인 기능 추가"

CHANGELOG.md 업데이트 완료:
## [Unreleased] - 2026-01-19

### Added
- [SYN-1234](https://jira.example.com/browse/SYN-1234) OAuth 기반 소셜 로그인 기능 추가
```

### 시나리오 2: 버그 수정 (영어)

```bash
# 현재 브랜치: bugfix/SYN-1250-session-timeout
# 변경사항: 세션 타임아웃 버그 수정

User: /add-changelog --type fixed --lang eng

changelog-manager:
Extracted ticket ID: SYN-1250
Analyzing recent changes...

Found changes:
- auth/session.py (modified)
- tests/test_session.py (modified)

Generated description: "Fix session timeout error in login flow"

CHANGELOG.md updated:
## [Unreleased] - 2026-01-19

### Fixed
- [SYN-1250](https://jira.example.com/browse/SYN-1250) Fix session timeout error in login flow
```

### 시나리오 3: 성능 개선

```bash
# 현재 브랜치: improve/SYN-1240-search-performance
# 변경사항: 검색 성능 개선

User: /add-changelog --type changed

changelog-manager:
티켓 ID: SYN-1240
변경사항 분석...

발견:
- search/views.py - 쿼리 최적화
- search/indexing.py - 인덱싱 개선
- 응답 시간: 500ms → 250ms

생성: "사용자 검색 API 응답 속도 50% 개선 (500ms → 250ms)"

CHANGELOG.md 업데이트:
## [Unreleased] - 2026-01-19

### Changed
- [SYN-1240](https://jira.example.com/browse/SYN-1240) 사용자 검색 API 응답 속도 50% 개선 (500ms → 250ms)
```

## 다른 스킬 및 에이전트와의 통합

- **commit-with-message skill**: 커밋 메시지 규칙과 일관성 유지
- **update-pr agent**: PR 설명에 changelog 참조 가능
- **docs-manager agent**: 문서 업데이트 시 changelog도 함께 관리

## 장점

1. **자동화**: Git 분석으로 변경사항 자동 파악
2. **일관성**: Keep a Changelog 형식 자동 준수
3. **다국어**: 한글/영어 지원으로 글로벌 협업 용이
4. **티켓 연동**: JIRA 티켓 자동 링크
5. **시간 절약**: 수동 작성 대비 5배 빠름
6. **오류 방지**: 형식 오류 자동 방지

## 제한 사항

- JIRA URL은 프로젝트별 설정 필요
- 복잡한 변경사항은 수동 편집 필요할 수 있음
- Git 저장소에서만 동작

## 참고 자료

- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) - Changelog 형식 가이드
- [Calendar Versioning](https://calver.org/) - CalVer 설명
- [Semantic Versioning](https://semver.org/) - 이전 버전 관리 방식

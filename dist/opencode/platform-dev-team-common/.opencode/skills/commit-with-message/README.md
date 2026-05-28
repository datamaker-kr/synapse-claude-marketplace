# commit-with-message Skill

커밋 메시지 작성 규칙을 준수하도록 가이드하는 스킬입니다. 한글 또는 영어로 작성 가능합니다.

## 개요

**활성화**: 커밋 생성 시 자동으로 활성화

**목적**: 커밋 메시지 작성 규칙을 준수하도록 가이드 (한글/영어)

## 기능

- **언어 선택**: 한글 또는 영어로 커밋 메시지 작성 (기본: 한글)
- **커밋 타입 자동 선택**: 변경사항을 분석하여 적절한 타입 제안
- **72자 제한 적용**: 제목이 72자를 초과하지 않도록 조정
- **상세 설명 생성**: 필요시 본문 추가
- **Co-Authored-By 자동 추가**: Claude와의 협업 표시

## 커밋 타입

### 한글 (기본)

| 타입 | 설명 | 예시 |
|-----|------|------|
| **기능** | 새로운 기능 추가 | `기능: 사용자 인증 추가` |
| **수정** | 버그 수정 | `수정: 로그인 오류 해결` |
| **문서** | 문서 변경 | `문서: API 가이드 업데이트` |
| **스타일** | 코드 포맷팅 | `스타일: PEP8 준수` |
| **리팩토링** | 코드 리팩토링 | `리팩토링: User 모델 분리` |
| **테스트** | 테스트 추가/수정 | `테스트: 인증 테스트 추가` |
| **빌드** | 빌드/의존성 변경 | `빌드: Django 5.0 업그레이드` |

### 영어

| Type | Description | Example |
|------|-------------|---------|
| **feat** | New feature | `feat: Add user authentication` |
| **fix** | Bug fix | `fix: Resolve login error` |
| **docs** | Documentation | `docs: Update API guide` |
| **style** | Code formatting | `style: Apply PEP8` |
| **refactor** | Code refactoring | `refactor: Split User model` |
| **test** | Test addition/modification | `test: Add auth tests` |
| **build** | Build/dependency changes | `build: Upgrade to Django 5.0` |

## 커밋 메시지 형식

### 한글

```
<타입>: <간결한 설명>

[선택] 상세 설명

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**예시**:
```
기능: commit-message 스킬 추가

한글 커밋 메시지 작성 규칙을 자동으로 적용하는 스킬 구현
- 커밋 타입 자동 선택
- 제목 72자 제한 적용
- Co-Authored-By 자동 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 영어

```
<type>: <brief description>

[optional] Detailed explanation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**예시**:
```
feat: Add commit-message skill

Implement skill to automatically apply commit message writing rules
- Auto-select commit type
- Apply 72-character title limit
- Auto-add Co-Authored-By

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## 활성화 시점

- 사용자가 커밋 생성을 요청할 때
- git commit 명령어를 실행하기 전
- TDD Skill과 함께 테스트 통과 후

## 작동 방식

### 1. 언어 확인

커밋 생성 전 사용자에게 언어를 확인합니다:

```
커밋 메시지를 한글로 작성할까요, 영어로 작성할까요? (기본: 한글)
```

### 2. 변경사항 분석

```bash
# 변경된 파일 확인
git status

# 변경 내용 확인
git diff
```

### 3. 커밋 타입 결정

변경사항의 성격에 따라 타입 선택:

**한글**:
- 새 파일/기능 추가 → **기능**
- 버그 수정 → **수정**
- 문서만 변경 → **문서**
- 코드 정리 → **리팩토링**
- 테스트 추가 → **테스트**

**영어**:
- New files/features → **feat**
- Bug fixes → **fix**
- Documentation only → **docs**
- Code cleanup → **refactor**
- Test addition → **test**

### 4. 제목 작성

**한글**:
```
<타입>: <무엇을 변경했는지 간결하게>
```

**영어**:
```
<type>: <brief description of what changed>
```

**규칙**:
- 72자 이하
- 명령형 사용
- 마침표 없음
- 티켓 ID 포함 가능: `[SYN-1234] 기능: ...`

### 5. 본문 작성 (선택)

복잡한 변경사항인 경우:
- **왜** 변경했는지
- **무엇**이 바뀌었는지
- Breaking Changes 명시

### 6. Co-Authored-By 추가

Claude와 협업한 경우 자동 추가:
```
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## 예시

### 예시 1: 새 기능 추가 (한글)

**변경사항**: UserViewSet에 인증 엔드포인트 추가

**생성된 커밋 메시지**:
```
기능: 사용자 JWT 인증 시스템 구현

JWT 기반 인증 시스템 추가
- Access Token/Refresh Token 발급 API 구현
- TokenAuthentication 미들웨어 추가
- 토큰 갱신 엔드포인트 구현

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 예시 2: 버그 수정 (한글)

**변경사항**: PR 제목 생성 시 티켓 ID가 사라지는 문제 수정

**생성된 커밋 메시지**:
```
수정: PR 제목 생성 시 티켓 ID 보존 오류 수정

정규 표현식 패턴을 수정하여 SYN-XXXX 형식의 티켓 ID가
PR 제목 업데이트 시 유지되도록 개선

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 예시 3: 새 기능 추가 (영어)

**변경사항**: Add JWT authentication to UserViewSet

**생성된 커밋 메시지**:
```
feat: Implement JWT authentication system

Add JWT-based authentication system
- Implement Access Token/Refresh Token issuance API
- Add TokenAuthentication middleware
- Implement token refresh endpoint

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 예시 4: Breaking Changes (한글)

**변경사항**: API 응답 형식 변경

**생성된 커밋 메시지**:
```
기능: API 응답 형식 표준화

API 응답을 표준화된 형식으로 변경

BREAKING CHANGE: 모든 API 응답이 다음 형식을 따름
{
  "success": boolean,
  "data": object,
  "error": object | null
}

기존 클라이언트는 응답 파싱 로직 수정 필요

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## 규칙

### 제목 규칙

1. **72자 이하**로 작성
2. **마침표(.)를 사용하지 않음**
3. **명령형**으로 작성
   - 한글: "추가", "수정", "삭제"
   - 영어: "Add", "Fix", "Update"
4. **티켓 ID** 포함 가능
   - 형식: `[티켓ID] 타입: 설명`
   - 예: `[SYN-1234] 기능: 사용자 인증 추가`

### 본문 규칙

1. 제목과 본문 사이 **빈 줄** 삽입
2. **어떻게**보다 **무엇을**, **왜** 변경했는지 설명
3. 여러 항목은 **불릿 포인트(-)** 사용
4. **Breaking Changes**가 있는 경우 반드시 명시

### 커밋 단위 규칙

- **하나의 커밋은 하나의 논리적 변경**만 포함
- 관련 없는 변경사항은 별도 커밋으로 분리
- 각 커밋은 독립적으로 이해 가능해야 함

## 좋은 커밋 vs 나쁜 커밋

### 좋은 커밋 메시지

✅ **명확하고 간결**:
```
기능: CalVer 버전 관리 가이드 추가

YYYY.Minor.Patch 형식의 CalVer 버전 관리 체계 설명 추가
- 버전 증가 규칙 문서화
- 예시 및 확인 방법 포함
```

✅ **Breaking Changes 명시**:
```
feat: Change API response format

Standardize all API responses

BREAKING CHANGE: Response format changed to:
{success: boolean, data: object, error: object|null}
```

### 나쁜 커밋 메시지

❌ **불명확**:
```
여러 가지 수정함
```

❌ **너무 장황** (커밋 분리 필요):
```
TDD skill을 추가하고, docs-manager도 같이 만들고, README도 업데이트하고...
```

❌ **과거형 사용**:
```
기능: TDD 스킬을 추가했습니다
```

올바른 형식:
```
기능: TDD 스킬 추가
```

## TDD Skill과의 통합

TDD Skill과 함께 사용하면:

1. **테스트 통과 확인** 후 커밋 생성
2. **구조적 변경**과 **행동적 변경** 분리
3. **Red → Green → Refactor** 각 단계마다 커밋

### 예시 워크플로우

```
1. Red: 실패하는 테스트 작성
   → 커밋: "테스트: 사용자 로그인 테스트 추가"

2. Green: 테스트 통과하는 최소 구현
   → 커밋: "기능: 사용자 로그인 기능 구현"

3. Refactor: 코드 정리
   → 커밋: "리팩토링: 인증 로직을 AuthService로 분리"
```

## 참고 자료

- [SKILL.md](SKILL.md) - 스킬 정의 및 상세 가이드
- [CLAUDE.md](../../CLAUDE.md) - 커밋 메시지 규칙 전체 문서
- datamaker-kr organization 커밋 컨벤션

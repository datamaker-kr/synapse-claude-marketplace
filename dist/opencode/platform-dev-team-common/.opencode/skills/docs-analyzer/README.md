# docs-analyzer Skill

코드 변경사항을 분석하고 문서 갭을 식별하는 전문 분석 스킬입니다.

## 개요

**활성화**: 문서 상태 분석이 필요할 때

**목적**: 코드베이스를 분석하여 문서 갭을 식별하고 구조화된 리포트 제공

## 기능

### 1. 기존 문서 카탈로그

저장소 내 모든 문서 파일을 스캔하고 카탈로그:
- README.md 파일들
- docs/ 디렉토리 컨텐츠
- CONTRIBUTING.md, CHANGELOG.md
- API 문서 (OpenAPI/Swagger 스펙)
- 아키텍처 다이어그램

### 2. Git 히스토리 분석

최근 코드 변경사항 분석:
- 최근 커밋 검토
- 변경된 파일 추적
- 영향받은 컴포넌트 식별
- 커밋 메시지에서 컨텍스트 추출

### 3. 문서 갭 감지

코드 변경과 기존 문서 비교하여 갭 식별:

**갭 카테고리**:
- ❌ **누락된 문서**: 새 기능인데 문서 없음
- ⚠️ **오래된 문서**: 제거된 기능을 언급
- 📝 **불완전한 문서**: 예시나 가이드 부족
- ⚡ **불일치**: README와 코드가 다름

**우선순위**:
- 🔴 **Critical**: 사용자 차단 (설치 방법 누락)
- 🟡 **High**: 이해도 저하 (API 문서 누락)
- 🟢 **Medium**: 도움되지만 필수 아님 (예시 부족)
- 🔵 **Low**: 있으면 좋음 (추가 다이어그램)

### 4. 영향도 평가

각 갭에 대해 심각도와 우선순위 결정:
- 사용자 영향도 (외부 vs 내부)
- 기능 가시성 (공개 API vs 내부 유틸)
- 변경 규모 (대규모 리팩토링 vs 작은 수정)

### 5. 구조화된 리포트 생성

발견사항을 담은 상세 리포트:
- 요약 통계
- 기존 문서 상태
- 감지된 코드 변경사항
- 우선순위별 문서 갭
- 실행 가능한 권장사항
- 필요한 다이어그램 목록

## 사용 방법

### 단독 사용

```bash
User: /docs-analyzer

Skill:
1. 저장소 문서 카탈로그 중...
2. Git 히스토리 분석 중...
3. 문서 갭 식별 중...
4. 리포트 생성 중...

[구조화된 분석 리포트 제공]
```

### docs-manager Agent에 의한 호출

docs-manager 에이전트가 문서 업데이트 전에 자동으로 호출:
```
docs-manager agent → docs-analyzer (분석 리포트 요청)
docs-analyzer → 리포트 반환
docs-manager agent → 리포트 기반 업데이트 진행
```

## 리포트 형식

```markdown
# 문서 분석 리포트

## 요약
- 전체 문서 파일: 15개
- 분석된 파일: 15개
- 식별된 갭: 8개

## 기존 문서
### 완전 ✅
- README.md: 프로젝트 개요 및 설치 가이드
- docs/architecture.md: 시스템 아키텍처 설명

### 오래됨 ⚠️
- docs/api.md: 제거된 엔드포인트 언급

### 누락 ❌
- docs/deployment.md: 배포 가이드 없음

## 코드 변경사항 감지
### 수정된 컴포넌트
- API 엔드포인트: 3개 추가, 1개 수정
- 모델: User 모델 확장

## 문서 갭

### Critical 🔴
1. **새 OAuth 설정 방법 누락**
   - 영향 파일: README.md
   - 이슈: OAuth 설정 섹션 없음
   - 코드 참조: auth/oauth.py:45
   - 권장사항: README에 OAuth 설정 섹션 추가

[계속...]
```

## 프로젝트 타입별 분석

### 백엔드 프로젝트

감지하는 변경사항:
- API 엔드포인트 (Django ViewSet, FastAPI routes, Express routes)
- 데이터 모델 (ORM 모델, Pydantic 스키마)
- 데이터베이스 마이그레이션
- 인증/인가 변경
- 백그라운드 작업

### 프론트엔드 프로젝트

감지하는 변경사항:
- 컴포넌트 (React, Vue, Angular)
- 상태 관리 (Redux, Vuex, NgRx)
- 라우팅 변경
- API 통합
- UI/스타일링 업데이트

### 인프라 프로젝트

감지하는 변경사항:
- 리소스 정의 (Terraform, Kubernetes)
- 설정 변경
- 배포 스크립트
- CI/CD 파이프라인

## 다른 스킬 및 에이전트와의 통합

- **docs-manager agent**: 분석 리포트를 요청하여 업데이트 가이드로 사용 (오케스트레이터)
- **docs-bootstrapper skill**: 문서 구조가 없을 때 부트스트랩 필요 여부 식별
- **mermaid-expert skill**: 다이어그램이 필요한 위치 식별

## 예시

### 예시 1: 인증 시스템 변경 후 분석

```bash
User: 인증 시스템을 OAuth로 변경했어. 문서 분석해줘.

docs-analyzer:
문서 분석 시작...

[분석 완료]

# 문서 분석 리포트

## 요약
- 식별된 갭: 5개 (Critical 2개, High 2개, Medium 1개)

## Critical 🔴
1. **OAuth 설정 방법 누락**
   - README.md에 OAuth 설정 섹션 추가 필요

2. **API 인증 엔드포인트 문서 누락**
   - docs/api.md에 /auth/oauth/callback 엔드포인트 추가 필요

## High 🟡
1. **인증 플로우 시퀀스 다이어그램 없음**
   - OAuth 플로우 시각화 필요

2. **환경 변수 문서 업데이트 필요**
   - OAUTH_CLIENT_ID, OAUTH_SECRET 추가

## 권장사항
1. README.md 업데이트: OAuth 설정 섹션 추가
2. docs/api.md 업데이트: 새 엔드포인트 추가
3. Mermaid 시퀀스 다이어그램 생성: OAuth 플로우
4. .env.example 업데이트: 새 환경 변수 추가
```

### 예시 2: 새 프로젝트 문서 감사

```bash
User: /docs-analyzer

docs-analyzer:
문서 카탈로그 중...

[분석 완료]

# 문서 분석 리포트

## 요약
- 전체 문서 파일: 1개 (README.md만 존재)
- 식별된 갭: 12개

## 누락된 문서 ❌
- docs/architecture.md: 시스템 아키텍처 설명
- docs/api.md: API 엔드포인트 문서
- CONTRIBUTING.md: 기여 가이드
- docs/deployment.md: 배포 가이드

## 권장사항
**docs-bootstrapper 실행 권장**
- 프로젝트에 기본 문서 구조가 없음
- docs-bootstrapper를 사용하여 초기 문서 생성 권장
```

## 장점

1. **포괄적 분석**: Git 히스토리, 파일 구조, 코드 변경 모두 검토
2. **우선순위 제공**: 무엇을 먼저 수정해야 하는지 명확
3. **실행 가능**: 구체적인 파일, 라인, 권장사항 제공
4. **프로젝트 인식**: 다양한 프로젝트 타입 지원
5. **읽기 전용**: 분석만 수행, 변경 안 함
6. **독립 실행 가능**: 단독 또는 오케스트레이션 모두 가능

## 제한사항

- Git 저장소에서만 동작 (git 명령어 사용)
- 분석만 수행, 문서 수정은 안 함
- 코드 변경 감지를 위해 git 히스토리 필요

## 참고 자료

- [docs-manager Agent](../../agents/docs-manager/README.md) - 오케스트레이터 에이전트
- [docs-bootstrapper Skill](../docs-bootstrapper/README.md) - 초기 문서 생성
- [mermaid-expert Skill](../mermaid-expert/README.md) - 다이어그램 생성

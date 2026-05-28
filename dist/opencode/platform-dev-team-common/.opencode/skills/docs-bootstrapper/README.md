# docs-bootstrapper Skill

프로젝트 문서 구조를 부트스트랩하는 전문 스킬입니다.

## 개요

**활성화**: 문서가 없는 프로젝트에 초기 문서 구조가 필요할 때

**목적**: 프로젝트 타입을 감지하고 적절한 문서 템플릿 생성

## 기능

### 1. 프로젝트 타입 자동 감지

다양한 프로젝트 타입 지원:

#### 백엔드 프로젝트
- **Django**: `manage.py`, `settings.py` 감지
- **FastAPI**: `main.py`, `requirements.txt` with fastapi
- **Express**: `package.json` with express
- **NestJS**: `nest-cli.json` 감지
- **Flask**: `app.py` 감지
- **Spring Boot**: `pom.xml`, `build.gradle` 감지

#### 프론트엔드 프로젝트
- **React**: `package.json` with react, `.jsx/.tsx` 파일
- **Vue**: `vue.config.js`, `.vue` 파일
- **Angular**: `angular.json` 감지
- **Next.js**: `next.config.js` 감지
- **Svelte**: `.svelte` 파일 감지

#### 인프라 프로젝트
- **Terraform**: `.tf` 파일
- **Kubernetes**: `.yaml` with `kind:` 필드
- **Docker**: `Dockerfile`, `docker-compose.yml`
- **Ansible**: `playbook.yml` 감지

#### 라이브러리/패키지
- **Python**: `setup.py`, `pyproject.toml` (웹 프레임워크 없음)
- **JavaScript**: `package.json` with `"main"` (프레임워크 없음)
- **Rust**: `Cargo.toml`
- **Go**: `go.mod`

### 2. README.md 생성

프로젝트 타입에 맞는 포괄적인 README 생성:

**섹션**:
- 📋 **프로젝트 헤더**: 이름, 설명, 뱃지
- 📖 **개요**: 프로젝트 설명, 주요 기능
- 📦 **설치**: 사전 요구사항, 설치 단계
- 🚀 **사용법**: 빠른 시작, 주요 명령어
- 📁 **프로젝트 구조**: 디렉토리 트리
- 💻 **개발**: 개발 환경 설정, 테스트
- 🌐 **API 문서**: (백엔드만) API 링크
- 🚢 **배포**: 배포 절차
- 🤝 **기여**: 기여 가이드
- 📄 **라이선스**: 라이선스 정보

### 3. Architecture 문서 생성

시스템 아키텍처 개요:

**섹션**:
- 🏗️ **시스템 개요**: 고수준 설명
- 📊 **아키텍처 다이어그램**: Mermaid 플레이스홀더
- 🧩 **컴포넌트**: 주요 컴포넌트 설명
- 🔄 **데이터 플로우**: 요청/응답 흐름
- 🛠️ **기술 스택**: 사용 기술
- 🎯 **설계 결정**: 아키텍처 선택 이유

### 4. API 문서 생성 (백엔드만)

API 엔드포인트 문서:

**섹션**:
- 🌐 **개요**: Base URL, 인증, 응답 형식
- 🔐 **인증**: 인증 방법, 예시
- 📡 **엔드포인트**: 엔드포인트 테이블
- ❌ **에러 처리**: 에러 형식, 상태 코드
- ⏱️ **Rate Limiting**: 제한 규칙

### 5. 디렉토리 구조 시각화

프로젝트 디렉토리 트리 자동 생성하여 README에 포함

## 사용 방법

### 단독 사용

```bash
User: /docs-bootstrapper

docs-bootstrapper:
기존 문서 확인 중...
포괄적인 문서 없음.

프로젝트 타입 감지 중...
✓ 감지됨: Django Backend
✓ 프레임워크: Django 4.2 + DRF
✓ 데이터베이스: PostgreSQL

문서 생성 중...
✓ README.md 생성 (180줄)
✓ docs/architecture.md 생성 (120줄)
✓ docs/api.md 생성 (90줄)

부트스트랩 완료! 생성된 문서를 검토하고 커스터마이즈하세요.
```

### docs-manager Agent에 의한 호출

docs-analyzer가 문서 부재를 감지하면 docs-manager 에이전트가 자동 호출:
```
docs-analyzer → 문서 없음 감지
docs-manager agent → docs-bootstrapper 호출
docs-bootstrapper → 초기 문서 생성
```

## 생성되는 파일

### Django 프로젝트 예시

```
.
├── README.md (새로 생성)
│   ├── 프로젝트 개요
│   ├── Django 설치 방법
│   ├── python manage.py runserver 사용법
│   ├── 프로젝트 구조
│   └── pytest 테스트 방법
│
└── docs/ (새로 생성)
    ├── architecture.md
    │   ├── Django MVT 패턴 설명
    │   ├── API 플로우 다이어그램 플레이스홀더
    │   └── DRF + PostgreSQL 스택
    │
    └── api.md
        ├── REST API 엔드포인트
        ├── JWT 인증 설명
        └── 예시 요청/응답
```

### React 프로젝트 예시

```
.
├── README.md (새로 생성)
│   ├── React 앱 개요
│   ├── npm install 방법
│   ├── npm start 사용법
│   ├── 컴포넌트 구조
│   └── npm test 방법
│
└── docs/ (새로 생성)
    └── architecture.md
        ├── 컴포넌트 계층 설명
        ├── 상태 관리 플로우 다이어그램
        └── React + Redux 스택
```

## 템플릿 시스템

템플릿 위치: `skills/docs-bootstrapper/templates/`

### 템플릿 파일

1. **README.template.md**: 메인 README 템플릿
2. **architecture.template.md**: 아키텍처 문서 템플릿
3. **api.template.md**: API 문서 템플릿

### 플레이스홀더 규칙

- `{{VARIABLE}}`: 자동으로 감지된 값으로 대체
  - `{{PROJECT_NAME}}`: 프로젝트 이름
  - `{{FRAMEWORK}}`: 프레임워크명
  - `{{LANGUAGE}}`: 프로그래밍 언어
  - `{{INSTALL_COMMAND}}`: 설치 명령어
  - `{{RUN_COMMAND}}`: 실행 명령어
  - `{{TEST_COMMAND}}`: 테스트 명령어

- `[PLACEHOLDER]`: 사용자가 채워야 함
  - `[프로젝트 설명]`
  - `[주요 기능 목록]`

- `[OPTIONAL]`: 선택적 섹션, 제거 가능

## 예시

### 예시 1: 새 Django 프로젝트

```bash
User: 새 Django 프로젝트인데 문서가 하나도 없어. 도와줘.

docs-bootstrapper:
기존 문서 확인 중...
README.md 없음, docs/ 디렉토리 없음.

프로젝트 타입 감지 중...
✓ Django 4.2 감지
✓ DRF (Django REST Framework) 사용
✓ PostgreSQL 데이터베이스

문서 생성 중...
✓ README.md 생성
  - Django 설치 방법 (pip install -r requirements.txt)
  - 실행 방법 (python manage.py runserver)
  - 테스트 방법 (pytest)

✓ docs/architecture.md 생성
  - Django MVT 아키텍처 설명
  - API 플로우 다이어그램 플레이스홀더
  - ViewSet → Serializer → Service → Model 흐름

✓ docs/api.md 생성
  - REST API 엔드포인트 템플릿
  - JWT 인증 섹션
  - 예시 요청/응답 형식

부트스트랩 완료! ✅

## 다음 단계
1. README.md의 [프로젝트 설명] 플레이스홀더 채우기
2. docs/api.md에 실제 엔드포인트 추가
3. architecture.md의 Mermaid 다이어그램 업데이트
4. 환경 변수 섹션에 실제 변수 추가
```

### 예시 2: React 프로젝트

```bash
User: /docs-bootstrapper

docs-bootstrapper:
프로젝트 타입 감지 중...
✓ React 18 + TypeScript
✓ Redux Toolkit 상태 관리
✓ React Router 라우팅

문서 생성 중...
✓ README.md 생성
  - React 앱 개요
  - npm install 설치 방법
  - npm start 개발 서버 실행
  - 컴포넌트 구조 트리

✓ docs/architecture.md 생성
  - 컴포넌트 계층 구조
  - Redux 상태 플로우
  - React + TypeScript 스택

✅ 프론트엔드 프로젝트 감지: API 문서 생성하지 않음

부트스트랩 완료!
```

### 예시 3: 기존 문서 있는 경우

```bash
User: /docs-bootstrapper

docs-bootstrapper:
기존 문서 확인 중...
✓ README.md 존재 (포괄적)
✓ docs/architecture.md 존재

프로젝트에 이미 포괄적인 문서가 있습니다.
부트스트랩이 필요하지 않습니다.

문서 상태:
- README.md: 완전 ✅
- docs/architecture.md: 완전 ✅

추가 작업이 필요하면 docs-analyzer를 사용하여 갭 분석을 수행하세요.
```

## 프레임워크별 커스터마이징

### Django
- `python manage.py runserver` 실행 명령어
- `pytest` 또는 `python manage.py test` 테스트
- ViewSet, Serializer, Model 컴포넌트
- DRF API 엔드포인트 템플릿

### FastAPI
- `uvicorn main:app --reload` 실행 명령어
- `pytest` 테스트
- Route Handler, Pydantic Schema 컴포넌트
- OpenAPI 자동 문서 링크

### React
- `npm start` 개발 서버
- `npm test` 테스트
- Component, Hook, Context 구조
- 상태 관리 플로우 다이어그램

### Vue
- `npm run serve` 개발 서버
- `npm run test:unit` 테스트
- Single File Component 구조
- Composition API 패턴

## 다른 스킬 및 에이전트와의 통합

- **docs-manager agent**: 문서 부재 시 자동 호출 (오케스트레이터)
- **docs-analyzer skill**: 부트스트랩 필요 여부 식별
- **mermaid-expert skill**: 생성 후 다이어그램 작성

## 장점

1. **시간 절약**: 수동 작성 대비 10배 빠름
2. **일관성**: 프로젝트 타입별 표준 구조
3. **완전성**: 모든 필수 섹션 포함
4. **커스터마이징 가능**: 플레이스홀더로 쉽게 수정
5. **프로젝트 인식**: 10+ 프레임워크 지원
6. **즉시 사용 가능**: 생성 즉시 80% 완성

## 제한사항

- 기존 포괄적 문서는 덮어쓰지 않음
- 비즈니스 로직 관련 내용은 플레이스홀더
- 실제 API 엔드포인트는 수동 추가 필요
- Mermaid 다이어그램은 플레이스홀더로 제공

## 참고 자료

- [docs-manager Agent](../../agents/docs-manager/README.md) - 오케스트레이터 에이전트
- [docs-analyzer Skill](../docs-analyzer/README.md) - 갭 분석
- [mermaid-expert Skill](../mermaid-expert/README.md) - 다이어그램

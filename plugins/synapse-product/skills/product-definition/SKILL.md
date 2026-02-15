---
name: synapse-product-definition
description: >
  Use when user asks about Synapse product features, page structure, data model,
  user flows, or needs to understand what Synapse is.
  Triggers on: "시냅스란", "Synapse는", "제품 구조", "페이지 구성",
  "데이터 모델", "사용자 흐름", "워크플로우", "제품 소개",
  "what is synapse", "product overview", "page structure".
---

# Synapse 제품 정의 (Product Definition)

데이터메이커 시냅스(Synapse)의 제품 정체성, 핵심 모듈, 페이지 구조, 데이터 모델, 사용자 흐름을 정의하는 핵심 지식 베이스.

## 제품 정체성

**데이터메이커 시냅스(Datamaker Synapse)**는 AI 개발을 위한 올인원 MLOps 플랫폼이다.

### 핵심 가치 제안

- **라벨링 최적화**: 데이터 어노테이션에 특화된 AI 기반 스마트 라벨링 도구 제공
- **End-to-End**: 데이터 업로드 → 라벨링 → 모델 학습 → 배포까지 단일 플랫폼에서 수행
- **No/Low/High Code**: 비개발자부터 개발자까지 모든 수준의 사용자가 전문적으로 활용 가능
- **플러그인 확장성**: Python SDK 및 서드파티 플러그인으로 모든 기능 커스텀 가능
- **보안 우선**: 사용자 지정 스토리지 연동으로 데이터 외부 유출 없이 안전하게 관리

### 타겟 사용자

| 역할 | 설명 | 주요 사용 기능 |
|------|------|---------------|
| **데이터 관리자** | 데이터셋 구축·관리 담당 | 데이터 컬렉션, 업로드, 스토리지 |
| **라벨링 작업자** | 어노테이션 수행 | 어노테이터, 워크샵 태스크 |
| **검수자** | 라벨링 품질 검수 | 워크샵, 리뷰 모드 |
| **프로젝트 관리자** | 프로젝트 운영·모니터링 | 프로젝트, 대시보드, 멤버 관리 |
| **ML 엔지니어** | 모델 학습·배포 | ML 실험, 플러그인, 모델 배포 |
| **플러그인 개발자** | 커스텀 기능 개발 | Synapse SDK, 플러그인 개발 |

## 기본 페이지 구조

시냅스의 기본 페이지는 다음과 같은 계층 구조로 구성된다.

### 1. 워크스페이스 (Workspace)

**최상위 조직 단위**로, 팀 또는 조직이 데이터·모델·멤버를 관리하는 공간.

- 역할 기반 접근 제어 (RBAC) — 모듈별 세밀한 권한 설정
- 학습된 모델과 데이터셋을 워크스페이스 단위로 공유·탐색
- 멤버 초대 및 프로필 검색 허용 기능
- 워크스페이스 사용자는 소유자/관리자의 '사용자 추가'를 통해 진입

### 2. 프로젝트 (Project)

**어노테이션 프로젝트 관리 단위**. 라벨링 작업의 전체 수명주기를 관리한다.

- 카드형 목록 UI — 썸네일과 핵심 정보를 함께 표시
- 프로젝트별 작업자, 품질 관리, 진행 상황 통합 관리
- 작업 할당부터 검수까지 세분화된 옵션 제공
- 데이터 모델: `title` 필드 사용 (NOT `name`), 직접 `project_id` FK 참조

### 3. 데이터 컬렉션 (Data Collection)

**데이터셋을 표준화하여 관리하는 공간**. 파일 스펙을 정의하고 데이터를 업로드·관리한다.

- **파일 스펙 (File Specification)**: 데이터 유닛의 파일 구성 정의
  - `name`: 스펙 식별자 (예: `image_1`, `label_1`)
  - `file_type`: 파일 유형 분류
  - `extensions`: 허용 확장자 목록
  - `is_required`: 필수/선택 여부
- **데이터 유닛 (Data Unit)**: 관련 파일들을 논리적으로 묶은 단위
  - `meta` (JSONField): 유닛별 메타데이터
  - `data_unit_meta_schema`: JSON Schema로 메타데이터 유효성 검증
- 메인 파일셋 + 서브 파일셋 구조로 멀티모달 데이터 지원
- 시퀀셜 데이터 설정으로 시계열/순서 기반 처리 가능
- 컬렉션 기본 설정: 이름, 설명, 썸네일, 콘텐츠 제한, 공개 여부, 템플릿
- 사용자 및 보안: 초대된 사용자만 진입 가능

### 4. 워크샵 (Workshop)

**어노테이션 작업 프로젝트 관리 단위** (`hitl_workshop` 테이블). 라벨링 작업의 할당·진행·검수를 관리한다.

- 카드형 진행 상황 시각화
- 작업 할당 → 라벨링 → 검수 워크플로우 관리
- 다양한 작업 인력을 유연하게 운영
- 통계 데이터와 시각화로 진행 상황 직관적 파악

### 5. 어노테이터 (Annotator)

**AI 기반 스마트 라벨링 UI**. 시냅스의 핵심 차별점.

#### 지원 데이터 유형

| 유형 | 설명 | 주요 기능 |
|------|------|----------|
| **이미지** | Pixel Perfect 어노테이션 | bbox, polygon, segmentation, keypoint, 실시간 AI 학습 |
| **비디오** | 프레임 단위 라벨링 | 타임라인 기반 객체 추적, AI 자동 추적 모델 탑재 |
| **텍스트** | PDF/HTML 라벨링 | NER, 감정/의도 분석, Corpus 관계성 지정 |
| **3D** | 라이다 센서 데이터 | Cuboid, 3D Segmentation, Multi-viewport |
| **프롬프트** | LLM 응답 평가 | 프롬프트 기반 데이터 수집, 품질 검증 |

#### 어노테이터 영역 구조

- **헤더 (Header)**: 상단 메뉴 및 네비게이션
- **툴바 (Tool Bar)**: 라벨링 도구 모음
- **에디터 (Editor)**: 메인 작업 영역
- **패널 (Panel)**: 속성·메타데이터 패널
- **설정 및 단축키**: 작업 환경 커스터마이징

모든 영역은 Core Annotator 기반으로 완전한 커스터마이징 가능 (Python SDK 또는 서드파티 플러그인).

#### AI 보조 기능

- **오토 라벨링**: 자동 객체 감지, 빠른 세그멘테이션
- **전/후처리 자동화**: 라벨링 전후 필요한 작업 자동 수행
- **자동 검토**: 사전 정의 규칙 기반 품질 점검 (라벨 누락, 기준 미달 감지)

### 6. 어사인먼트 (Assignment)

**라벨러/검수자의 어노테이션 작업 결과** (`hitl_assignment` 테이블).

- `data` (JSONField): 어노테이션 데이터 (DM Schema v1 형식)
- `AssignmentData` 테이블: **파일 참조** 저장 (어노테이션 JSON이 아님)
- DM Schema v1 형식:
  ```json
  {
    "assignmentId": "job-123",
    "annotations": {
      "image_1": [
        {"id": "abc123", "type": "bbox", "data": [x, y, w, h], "classification": "car"},
        {"id": "def456", "type": "polygon", "data": [[x1,y1],[x2,y2],...]}
      ]
    }
  }
  ```
- 지원 어노테이션 타입: `bbox`, `polygon`, `polyline`, `keypoint`, `classification`

### 7. 머신러닝 / ML 실험 (Machine Learning)

**모델 학습·실험·배포 관리**.

- 실험 (Experiment): 하나의 목적에 대한 다양한 학습 설정의 묶음
- 신경망, 데이터셋, 하이퍼파라미터, 자원 최적화
- 여러 실험 동시 실행 및 실시간 학습 상태 모니터링
- 완성 모델은 라이브러리에서 관리, 재사용·배포 가능
- 비개발자도 인공신경망에 모델 학습 가능

### 8. 대시보드 (Dashboard)

**프로젝트·워크샵 진행 상황의 시각적 허브**.

- 카드형 시각화 — 클릭 없이 전체 흐름 파악
- 다양한 통계 데이터와 작업/검수 상태 표시
- 작업자부터 관리자까지 직관적 진행 상황 파악
- 데이터셋 분포, 중복, 유사도 시각화 (차트 활용)
- 오학습 가능성 사전 진단·교정

### 9. 스토리지 (Storage)

**사용자 지정 스토리지 연동 관리**.

- 지원 프로토콜: S3, Google Cloud Storage (GCS), SFTP, 로컬 파일시스템
- 사용자 지정 스토리지를 연결하여 데이터 보관·추출
- 외부 유출 없이 안전한 데이터 관리
- 폐쇄망 환경에서도 솔루션 활용 가능
- GPU 서버 연동 지원

### 10. 멤버 관리 (Members)

**워크스페이스 및 프로젝트 단위 사용자·권한 관리**.

- 모듈별 역할 기반 접근 권한 설정
- 최소 권한 원칙 (Principle of Least Privilege)
- 사용자 추가/삭제, 역할 할당
- 프로필 검색 허용/차단 기능

### 11. 튜토리얼 (Tutorial)

**작업자 교육 및 선별 시스템**.

- 자동 채점 튜토리얼 서비스
- 기업 상황에 맞는 커스텀 튜토리얼 생성
- 라벨링 교육 및 작업자 선별

## 데이터 모델 관계도

```
Workspace
├── Project (title 필드, project_id FK)
│   ├── Data Collection
│   │   ├── File Specification (name, file_type, extensions, is_required)
│   │   ├── Data Unit (meta JSONField)
│   │   └── data_unit_meta_schema (JSON Schema)
│   ├── Workshop (hitl_workshop)
│   │   ├── Task (직접 project_id FK — workshop 통한 join 불필요)
│   │   │   └── Assignment (hitl_assignment)
│   │   │       ├── data (JSONField — 어노테이션 데이터, DM Schema v1)
│   │   │       └── AssignmentData (hitl_assignmentdata — 파일 참조, NOT 어노테이션)
│   │   └── Ground Truth Dataset
│   │       └── Ground Truth Version
│   │           └── Ground Truth Event
│   └── ML Experiment
│       └── Training Run
│           └── Model
├── Storage (S3, GCS, SFTP, Local)
├── Members (역할 기반 접근 제어)
└── Plugin (synapse-sdk 확장)
```

## End-to-End 워크플로우

### 기본 데이터 파이프라인

```
1. 데이터 업로드
   └─ 데이터 컬렉션 생성 → 파일 스펙 정의 → 데이터 유닛 업로드

2. 어노테이션
   └─ 워크샵 생성 → 작업 할당 → 라벨링 (어노테이터) → 검수 → 완료

3. 데이터셋 구축
   └─ Ground Truth 생성 → 버전 관리 → Train/Val/Test 분할

4. 모델 학습
   └─ 실험 생성 → 학습 실행 → 결과 비교 → 최적 모델 선택

5. 배포
   └─ 모델 라이브러리 등록 → 플러그인 재사용 또는 추론 서버 배포
```

### 데이터 익스포트 흐름

```
Assignment/GT/Task → 포맷 선택 (JSON, COCO, YOLO, VOC, CSV) → 변환 → 내보내기
```

## 제품 구성 요소 (Components)

### 서버 사이드

| 컴포넌트 | 설명 |
|---------|------|
| **synapse-backend** | 백엔드 API 및 서비스 (Django/DRF 기반) |
| **synapse-agent** | 에이전트 실행 플랫폼 (Ray 클러스터) |

### 클라이언트 사이드

| 컴포넌트 | 설명 |
|---------|------|
| **synapse-annotator** | 어노테이션 도구 UI |
| **synapse-workspace** | 워크스페이스/프로젝트 관리 UI |

### 개발자 도구

| 컴포넌트 | 설명 |
|---------|------|
| **synapse-sdk** | Python SDK (PyPI: `synapse-sdk`) |
| **synapse CLI** | 커맨드라인 인터페이스 |

## 참고 자료

- [시냅스 제품 페이지](https://www.datamaker.io/ko/product/synapse)
- [시냅스 문서](https://docs.datamaker.io)
- [시냅스 플랫폼](https://platform.datamaker.io)
- [시냅스 튜토리얼](https://tutorial.datamaker.io)
- [어노테이터 소개](https://www.datamaker.io/solution/annotator)

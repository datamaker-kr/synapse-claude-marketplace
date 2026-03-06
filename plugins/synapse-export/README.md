# Synapse Export

Synapse 프로젝트에서 어노테이션, 그라운드 트루스, 태스크 데이터를 다양한 형식으로 내보내는 Claude Code 도구입니다.

> **라이선스**: MIT

## 개요

이 플러그인은 Synapse 프로젝트의 어노테이션 데이터를 분석하고, 원하는 형식으로 변환하여 내보내는 전체 워크플로우를 지원합니다:

- **다양한 내보내기 대상**: 어노테이션(Assignment), 그라운드 트루스(GT), 태스크 데이터
- **ML 프레임워크 호환 포맷**: COCO, YOLO, Pascal VOC, CSV, 원본 JSON
- **대화형 워크플로우**: 인자 없이 실행해도 단계별 안내 제공
- **대규모 데이터셋 지원**: `synapse script submit`을 통한 Ray 클러스터 실행

**소속 조직**: [datamaker-kr](https://github.com/datamaker-kr)

## 설치

### 사전 요구사항

| 항목 | 확인 명령어 | 최소 버전 | 비고 |
|------|------------|-----------|------|
| Claude Code | `claude --version` | v2.1.0+ | - |
| Python | `python3 --version` | 3.12+ | 필수 |
| synapse-sdk | `synapse --version` | >= 2026.1.39 | PyPI에서 설치 |
| Synapse 인증 | `synapse doctor` | — | `synapse login` 필요 |

### synapse-sdk 설치

```bash
# uv 사용 (권장)
uv pip install "synapse-sdk[all]>=2026.1.39"

# pip 사용 (대안)
pip install "synapse-sdk[all]>=2026.1.39"
```

### 마켓플레이스를 통한 설치

```bash
# 마켓플레이스 추가
/plugin marketplace add datamaker-kr/synapse-claude-marketplace

# 플러그인 설치
/plugin install synapse-export@synapse-marketplace
```

---

## 명령어

### /synapse-export:help

사용 가능한 모든 기능을 안내합니다.

```bash
/synapse-export:help
```

### /synapse-export:export

프로젝트에서 데이터를 내보냅니다. 모든 인자는 선택 사항이며, 누락된 항목은 대화형으로 안내합니다.

```bash
# 전체 인자 지정
/synapse-export:export --project 42 --target assignment --format coco

# 대화형 (인자 없이)
/synapse-export:export
```

**주요 옵션**:
- `--project <id>`: 프로젝트 ID
- `--gt-version <id>`: 그라운드 트루스 데이터셋 버전 ID
- `--target <type>`: 내보내기 대상 (`assignment`, `ground_truth`, `task`)
- `--format <fmt>`: 출력 형식 (`json`, `coco`, `yolo`, `voc`, `csv`)
- `--output <path>`: 출력 디렉토리 경로
- `--split <ratio>`: Train/Val/Test 분할 비율 (예: `0.8/0.1/0.1`)
- `--save-original-files`: 원본 파일 포함
- `--dry-run`: 실행 없이 계획만 미리보기

### /synapse-export:export-status

내보내기 작업의 상태와 로그를 확인합니다.

```bash
/synapse-export:export-status <job-id>
```

---

## 스킬

스킬은 대화 컨텍스트에 따라 자동으로 활성화됩니다.

| 스킬 | 트리거 키워드 |
|------|---------------|
| **export-workflow** | "export", "download annotations", "ground truth", "COCO format", "YOLO format", "Pascal VOC", "export assignments", "export tasks", "download labels" |

---

## 에이전트

| 에이전트 | 목적 |
|----------|------|
| **export-assistant** | 데이터 분석, 포맷 변환, 내보내기 실행을 포함한 전체 워크플로우 오케스트레이션 |

---

## 빠른 시작

### 프로젝트 어노테이션을 COCO 형식으로 내보내기

```bash
/synapse-export:export --project 42 --format coco
```

### 그라운드 트루스를 YOLO 형식으로 내보내기 (Train/Val 분할)

```bash
/synapse-export:export --target ground_truth --gt-version 15 --format yolo --split 0.8/0.2
```

---

## 내보내기 대상

| 대상 | 소스 | 필수 필터 | 사용 사례 |
|------|------|-----------|-----------|
| **assignment** | 라벨러/리뷰어 작업 결과 | 프로젝트 ID | 라벨링된 어노테이션 내보내기 |
| **ground_truth** | 큐레이션된 GT 데이터셋 | GT 버전 ID | ML 학습/검증 데이터 내보내기 |
| **task** | 태스크 정의 + 어노테이션 | 프로젝트 ID | 태스크 메타데이터 내보내기 |

## 출력 형식

| 형식 | 적합한 용도 | 지원 어노테이션 |
|------|------------|----------------|
| **JSON** (Synapse) | 무손실 백업, 전체 내보내기 | 모든 유형 |
| **COCO** | 객체 탐지, 세그멘테이션 | bbox, polygon, keypoint |
| **YOLO** | 실시간 탐지 모델 | bbox |
| **Pascal VOC** | 클래식 탐지 벤치마크 | bbox |
| **CSV** | 스프레드시트 분석 | 분류, 단순 속성 |

---

## 워크플로우

1. **대상 선택** — 내보낼 데이터 유형 선택 (어노테이션, 그라운드 트루스, 태스크)
2. **데이터 분석** — 어노테이션 샘플링으로 유형 및 클래스 파악
3. **형식 선택** — 어노테이션 유형에 맞는 출력 형식 추천
4. **계획 확인** — 항목 수, 형식, 출력 구조 요약 표시
5. **실행** — 내보내기 스크립트 작성 후 `synapse script submit`으로 제출
6. **결과 보고** — 출력 파일 정보 표시

---

## 문제 해결

### synapse CLI를 찾을 수 없음

```bash
# 현재 디렉토리에서 venv 탐색
ls -d *venv* .venv 2>/dev/null
source .venv/bin/activate

# venv가 없으면 설치
uv pip install "synapse-sdk[all]>=2026.1.39"
```

### 인증 실패

```bash
synapse login
synapse doctor  # 인증 상태 확인
```

### YOLO 형식에서 polygon 어노테이션 경고

YOLO는 bbox만 지원합니다. Polygon 어노테이션이 포함된 프로젝트에서는 COCO 형식을 권장하거나, polygon의 바운딩 박스 변환을 선택할 수 있습니다.

### 대규모 데이터셋 (10,000+ 항목)

`synapse script submit`을 통한 Ray 클러스터 실행을 사용합니다. `list_all=True`로 스트리밍 처리하며, 진행 상황이 주기적으로 출력됩니다.

---

## 라이선스

MIT

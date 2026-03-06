# Synapse Upload

로컬 또는 원격 소스의 파일을 Synapse 데이터 컬렉션에 업로드하는 Claude Code 도구입니다. AI 기반 파일 매핑으로 파일 사양에 맞게 자동 매핑합니다.

> **라이선스**: MIT

## 개요

이 플러그인은 다양한 소스에서 Synapse 데이터 컬렉션으로 파일을 업로드하는 전체 워크플로우를 지원합니다:

- **다양한 소스 지원**: 로컬 파일시스템, Amazon S3, Google Cloud Storage, SFTP
- **업로드 모드**: 단일 경로(Single-path) 및 다중 경로(Multi-path)
- **Excel 메타데이터**: 엑셀 파일로 데이터 유닛별 메타데이터 일괄 설정
- **파일 변환**: TIFF→PNG, MOV→MP4 등 자동 변환 지원
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
/plugin install synapse-upload@synapse-marketplace
```

---

## 명령어

### /synapse-upload:help

사용 가능한 모든 기능을 안내합니다.

```bash
/synapse-upload:help
```

### /synapse-upload:upload

파일을 데이터 컬렉션에 업로드합니다. 모든 인자는 선택 사항이며, 누락된 항목은 대화형으로 안내합니다.

```bash
# 전체 인자 지정
/synapse-upload:upload /data/scans --data-collection 42 --storage 11

# 대화형 (인자 없이)
/synapse-upload:upload
```

**주요 옵션**:
- `<path>`: 소스 경로 (로컬, `s3://`, `gs://`, `sftp://`)
- `--data-collection <id>`: 데이터 컬렉션 ID
- `--storage <id>`: 스토리지 ID
- `--project <id>`: 프로젝트 ID (태스크 자동 생성)
- `--multi-path`: 다중 경로 모드 활성화
- `--assets '<json>'`: 스펙별 소스 경로 JSON 매핑
- `--metadata <path>`: Excel 메타데이터 파일 경로
- `--dry-run`: 실행 없이 계획만 미리보기
- `--batch-size <n>`: 데이터 유닛 생성 배치 크기

### /synapse-upload:upload-status

업로드 작업의 상태와 로그를 확인합니다.

```bash
/synapse-upload:upload-status <job-id>
```

---

## 스킬

스킬은 대화 컨텍스트에 따라 자동으로 활성화됩니다.

| 스킬 | 트리거 키워드 |
|------|---------------|
| **upload-workflow** | "upload", "data collection", "file specifications", "data units", "s3 upload", "multi-path", "excel metadata", "data unit metadata", "meta schema" |
| **file-conversion** | "convert", "tiff to png", "file format", "unsupported extension" |

---

## 에이전트

| 에이전트 | 목적 |
|----------|------|
| **upload-assistant** | 소스 탐색, 파일 매핑 계획, 업로드 실행을 포함한 전체 워크플로우 오케스트레이션 |

---

## 빠른 시작

### 로컬 파일 업로드

```bash
/synapse-upload:upload /data/patient_scans --data-collection 2973 --storage 11
```

### S3에서 업로드

```bash
/synapse-upload:upload s3://my-bucket/datasets/ct --data-collection 42 --storage 11
```

### 실행 전 미리보기 (Dry Run)

```bash
/synapse-upload:upload /data/scans --data-collection 42 --storage 11 --dry-run
```

---

## 지원 소스 유형

| 소스 | 예시 | 비고 |
|------|------|------|
| 로컬 파일시스템 | `/data/scans`, `./data` | Bash/Glob으로 직접 탐색 |
| Amazon S3 / MinIO | `s3://bucket/prefix` | AWS 자격증명 필요 |
| Google Cloud Storage | `gs://bucket/prefix` | GCS 자격증명 필요 |
| SFTP | `sftp://host/path` | SSH 자격증명 필요 |
| 스토리지 상대 경로 | `datasets/batch_42` | 스토리지 설정으로 해석 |

## 업로드 모드

| 모드 | 사용 시점 | 플래그 |
|------|-----------|--------|
| **단일 경로** (기본) | 모든 파일이 같은 디렉토리에 있을 때 | (기본값) |
| **다중 경로** | 파일 유형별로 다른 위치에 있을 때 | `--multi-path` + `--assets` |

### 다중 경로 예시

이미지와 라벨이 서로 다른 위치에 있는 경우:

```bash
/synapse-upload:upload --multi-path --data-collection 42 --storage 11 \
  --assets '{"image_1": "/nas/images", "label_1": "s3://bucket/labels"}'
```

---

## 파일 변환

소스 파일의 확장자가 데이터 컬렉션의 허용 확장자와 맞지 않으면 자동 변환을 지원합니다.

| 변환 유형 | 소스 형식 | 대상 형식 | 필요 도구 |
|-----------|-----------|-----------|-----------|
| 이미지 | `.tiff`, `.bmp`, `.webp`, `.gif` | `.png`, `.jpg` | Pillow |
| 비디오 | `.mov`, `.avi`, `.mkv`, `.webm` | `.mp4` | ffmpeg |
| 오디오 | `.wav`, `.flac`, `.ogg` | `.mp3`, `.aac` | ffmpeg |

---

## DataUnit 구조

데이터 유닛은 데이터 컬렉션의 하나의 논리적 레코드입니다. 각 데이터 유닛은 파일 사양(Spec)별 파일과 선택적 메타데이터로 구성됩니다.

```
Data Unit "patient_001":
  image_1 → patient_001/scan.png
  label_1 → patient_001/annotations.json
  meta    → {"patient_id": "P001", "age": 45}
```

### 메타데이터 스키마

데이터 컬렉션에 `data_unit_meta_schema`가 정의된 경우, 모든 데이터 유닛의 메타데이터는 해당 스키마를 준수해야 합니다. 메타데이터는 다음 방법으로 제공할 수 있습니다:

- **Excel 파일** (`--metadata`): 행별 메타데이터 일괄 제공
- **디렉토리/파일명 파싱**: 구조화된 파일명에서 추출
- **사이드카 파일**: 데이터 유닛별 JSON/YAML 파일
- **수동 입력**: 대화형으로 직접 지정

---

## 워크플로우

1. **검증** — 소스 경로 접근 가능성 확인 (로컬/클라우드)
2. **사양 조회** — 데이터 컬렉션의 파일 사양 및 메타 스키마 조회
3. **소스 탐색** — 소스 유형에 맞게 디렉토리 구조 분석
4. **매핑 계획** — 파일→스펙 매핑, 변환 필요 여부, 메타데이터 소스 결정
5. **확인** — 업로드 계획을 사용자에게 제시 (메타데이터 커버리지 포함)
6. **실행** — 업로드 스크립트 작성 후 `synapse script submit`으로 제출
7. **결과 보고** — 업로드 파일 수, 생성된 데이터 유닛 수 표시

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

### S3/GCS 접근 오류

```bash
# S3 자격증명 설정
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...

# GCS 자격증명 설정
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### 파일 사양 불일치

소스 파일의 확장자가 데이터 컬렉션의 허용 목록에 없으면 자동 변환을 시도합니다. 지원되지 않는 형식은 오류로 보고되며, 수동 변환이 필요합니다.

### 대규모 데이터셋 (10,000+ 파일)

- 전체 파일을 나열하지 않고 2~3개 대표 서브디렉토리를 샘플링합니다
- 배치 크기를 50 이상으로 설정합니다
- `synapse script submit`으로 Ray 클러스터에서 실행합니다

---

## 라이선스

MIT

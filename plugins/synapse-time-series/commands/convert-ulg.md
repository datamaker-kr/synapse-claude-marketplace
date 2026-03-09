---
description: PX4 ULG 파일을 dm_schema JSON으로 변환합니다
argument-hint: [--input <ulg-path>] [--config <yaml-path>] [--output <json-path>] [--input-dir <dir>] [--output-dir <dir>]
allowed-tools: ["Bash", "Read", "Write", "Glob", "AskUserQuestion"]
---

# ULG → dm_schema 변환

PX4 ULG 비행 로그 파일을 트랙 설정 YAML에 따라 dm_schema JSON으로 변환합니다. 단일 파일 또는 디렉토리 일괄 변환을 지원합니다.

## Interactive-First Design

**IMPORTANT**: 이 명령어는 완전한 대화형으로 설계되었습니다. 사용자가 인자 없이 `/synapse-time-series:convert-ulg`만 입력해도 동작합니다. 누락된 정보는 `AskUserQuestion`으로 단계별 안내하세요. 모든 인자를 한꺼번에 제공하면 대화 없이 바로 진행할 수도 있습니다.

## Arguments (모두 선택적 — 누락 시 대화형으로 질문)

- `--input <ulg-path>`: 단일 ULG 파일 경로
- `--input-dir <dir>`: ULG 파일이 있는 디렉토리 (일괄 변환)
- `--config <yaml-path>`: 트랙 설정 YAML 파일 경로 (필수이나 자동 검색 시도)
- `--output <json-path>`: 단일 파일 출력 경로 (기본값: 입력 파일명.json)
- `--output-dir <dir>`: 일괄 변환 출력 디렉토리

## Workflow

### Step 1: Prerequisites 확인

Python 환경과 필수 패키지를 확인합니다:

```bash
python3 -c "import pyulog, yaml, numpy; print('OK')"
```

실패 시 설치를 안내합니다:

```
필수 패키지가 설치되지 않았습니다. 다음 명령어로 설치해주세요:
  pip install pyulog pyyaml numpy
```

`AskUserQuestion`으로 설치 진행 여부를 확인한 뒤:

```bash
pip install pyulog pyyaml numpy
```

### Step 2: 입력 확인

**ULG 파일:**

1. `--input` 또는 `--input-dir`이 있으면 사용
2. 둘 다 없으면 `AskUserQuestion`:

```
"변환할 ULG 파일을 지정해주세요."
Options:
  - "단일 파일 변환" → 파일 경로 입력 요청
  - "폴더 내 일괄 변환" → 디렉토리 경로 입력 요청
```

일괄 변환 시 Glob으로 `*.ulg` 파일 목록을 확인하여 보여줍니다.

**트랙 설정 YAML:**

1. `--config`가 있으면 사용
2. 없으면 현재 디렉토리에서 자동 검색:
   - `track-config.yaml` 우선
   - 없으면 `*.yaml` 파일 검색
3. 못 찾으면 안내:

```
트랙 설정 YAML을 찾을 수 없습니다.
  /synapse-time-series:create-track-config 으로 먼저 YAML을 만드세요.
```

**출력 경로:**

1. `--output` 또는 `--output-dir`이 있으면 사용
2. 없으면 기본값:
   - 단일: 입력 파일과 같은 디렉토리에 `<입력파일명>.json`
   - 일괄: `--input-dir`과 같은 디렉토리에 `output/` 하위 디렉토리

### Step 3: 변환 스크립트 준비

스킬 reference의 `ulg2dm.py` 내용을 임시 파일로 생성합니다. **반드시 `tempfile.mkdtemp()` 등으로 고유 임시 디렉토리를 생성하여 사용하고, `/tmp/ulg2dm.py` 같은 고정 경로는 사용하지 마세요** (경쟁 조건 방지):

```bash
# 정본 스크립트를 임시 파일로 작성 (tempfile 사용, 고정 /tmp 경로 사용 금지)
```

스크립트는 다음 기능을 포함해야 합니다:
- YAML 설정 파일 로드
- ULG 파일에서 지정된 토픽/필드 추출
- scale 적용 (예: degE7 → deg)
- sample_rate에 맞춘 리샘플링 (보간)
- dm_schema JSON 구조로 변환
- 건너뛴 채널(토픽/필드 없음) 경고 출력

### Step 4: 변환 실행

**단일 파일:**

```bash
python3 <tmpdir>/ulg2dm.py --input <ulg-path> --config <yaml-path> --output <json-path>
```

**일괄 변환:**

```bash
python3 <tmpdir>/ulg2dm.py --input-dir <dir> --config <yaml-path> --output-dir <dir>
```

실행 중 진행 상황을 모니터링합니다:
- 처리 중인 파일명
- 추출된 토픽/채널 수
- 건너뛴 채널 경고 (토픽 또는 필드가 ULG에 없는 경우)

### Step 5: 자동 검증

변환 직후 결과 JSON을 검증합니다. 임시 생성된 `validate_dm_schema.py`를 실행합니다:

```bash
python3 <tmpdir>/validate_dm_schema.py <output-json>
```

검증 항목:
- 최상위 구조 (`tracks`, `duration`, `sample_rate` 등)
- 각 트랙의 `channels` 배열 존재 여부
- 각 채널의 `data` 배열 길이 일관성
- 타임스탬프 단조 증가 여부
- NaN/Inf 값 검출

**검증 통과 시:** Step 6으로 진행

**검증 실패 시:**

```
검증 실패:
  - track "gps-position" channel "위도": data 길이 불일치 (2864 vs 2860)
  - track "battery" channel "전류": NaN 값 3개 발견

YAML 설정을 확인해주세요:
  /synapse-time-series:create-track-config --source <ulg-file>

자동 수정이 필요하면: "스키마 오류 수정해줘" → synapse-schema-debugger 에이전트가 자동 진단 및 수정을 도와줍니다.
```

### Step 6: 결과 보고

```
## 변환 완료

- 입력: log_55.ulg (286.4초)
- 설정: track-config.yaml
- 출력: output.json
- 트랙: 5개, 채널: 14개
- 샘플: 2,864개 @ 10Hz
- 검증: 통과

다음 단계:
  - 일괄 변환: /synapse-time-series:convert-ulg --input-dir ./ulg/ --config track-config.yaml
  - 업로드: /synapse-upload:upload
```

일괄 변환 시에는 전체 요약을 표시합니다:

```
## 일괄 변환 완료

- 입력 디렉토리: ./ulg/
- 파일 수: 12개
- 성공: 11개, 실패: 1개
- 설정: track-config.yaml
- 출력 디렉토리: ./output/

| 파일 | 시간(초) | 트랙 | 채널 | 샘플 | 상태 |
|------|----------|------|------|------|------|
| log_01.ulg | 286.4 | 5 | 14 | 2,864 | 통과 |
| log_02.ulg | 142.1 | 5 | 14 | 1,421 | 통과 |
| ... | | | | | |
| log_08.ulg | 0.0 | — | — | — | 실패: 빈 파일 |

실패한 파일을 확인하세요:
  log_08.ulg: ULG 파일이 비어있거나 손상되었습니다
```

## Error Handling

| 오류 | 대응 |
|------|------|
| pyulog 미설치 | `pip install pyulog pyyaml numpy` 안내 |
| Python 3.10 미만 | Python 버전 업그레이드 안내 |
| YAML 파싱 오류 | 오류 행 번호와 내용 표시, 수정 안내 |
| ULG 파일 없음/손상 | 파일 경로 및 무결성 확인 안내 |
| 토픽이 ULG에 없음 | 해당 채널 건너뜀 경고, 가용 토픽 목록 표시 |
| 필드가 토픽에 없음 | 해당 채널 건너뜀 경고, 가용 필드 목록 표시 |
| 빈 ULG (데이터 없음) | 파일 건너뜀, 다른 파일 계속 처리 |
| 변환 후 검증 실패 | 실패 항목 표시, YAML 설정 수정 안내 |
| 디스크 공간 부족 | 출력 경로 변경 또는 정리 안내 |

## Flexibility Note

AI 어시스턴트로서 Bash와 Python에 전체 접근 권한이 있습니다. 표준 워크플로우가 사용자 요구에 맞지 않으면 **유연하게 대응**하세요:
- 커스텀 변환 로직 작성 (비표준 토픽/필드)
- 변환 전 ULG 파일 inspect (`ulog_info -v`)
- 변환 후 JSON 후처리 (필터링, 병합, 다운샘플링)
- 특정 시간 구간만 추출
- 여러 ULG 파일을 하나의 JSON으로 병합
- dm_schema 외 다른 형식으로 변환

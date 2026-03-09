---
description: PX4 ULG 파일의 토픽, 필드, 샘플레이트를 탐색합니다
argument-hint: [--input <ulg-path>]
allowed-tools: ["Bash", "Read", "Glob", "AskUserQuestion"]
---

# ULG 파일 탐색 명령어

PX4 ULog 파일(.ulg)에 포함된 토픽, 필드, 샘플레이트를 분석하여 사용자에게 보여줍니다. 시계열 데이터 파이프라인의 첫 단계로, 트랙 설정을 만들기 전에 어떤 센서 데이터가 있는지 파악할 때 사용합니다.

## Interactive-First Design

**중요**: 이 명령어는 완전한 대화형으로 설계되었습니다. 사용자가 인자 없이 `/synapse-time-series:inspect-ulg`만 입력해도 동작해야 합니다. 인자가 없으면 `AskUserQuestion`으로 단계별로 안내하세요. 모든 인자를 미리 제공하면 대화 없이 바로 실행합니다.

## Arguments (모두 선택적 — 없으면 대화형으로 질문)

- `--input <ulg-path>`: ULG 파일 경로

## Workflow

### Step 1: Prerequisites 확인

`pyulog` 패키지 설치 여부를 확인합니다:

```bash
python3 -c "import pyulog; print('pyulog OK')"
```

미설치 시 사용자에게 안내합니다:
```
"pyulog가 설치되어 있지 않습니다. 다음 명령어로 설치할 수 있습니다:"
→ pip install pyulog
```

`AskUserQuestion`으로 설치 진행 여부를 물은 뒤, 승인하면 설치를 실행합니다:

```bash
pip install pyulog
```

설치 완료 후 다시 import를 확인합니다. 실패하면 중단합니다.

### Step 2: ULG 파일 찾기

`--input`이 제공된 경우 해당 경로를 사용합니다.

없으면 현재 디렉토리에서 `.ulg` 파일을 검색합니다:

```bash
find . -maxdepth 3 -name "*.ulg" -type f 2>/dev/null
```

검색 결과에 따라:

- **1개**: 해당 파일을 사용합니다.
- **여러 개**: `AskUserQuestion`으로 목록을 보여주고 선택하게 합니다.
- **0개**: `AskUserQuestion`으로 경로를 직접 입력받습니다:
  ```
  "현재 디렉토리에서 ULG 파일을 찾을 수 없습니다. ULG 파일의 전체 경로를 입력해주세요."
  ```

파일이 실제로 존재하는지 확인합니다:

```bash
test -f "<ulg-path>" && echo "OK" || echo "NOT_FOUND"
```

### Step 3: 토픽 탐색 실행

스킬 reference의 정본 스크립트(`references/ulg2dm.py`)를 임시 파일로 생성하여 `--list-topics` 옵션으로 실행합니다. **`tempfile.mkdtemp()` 등으로 고유 임시 디렉토리를 사용하세요** (고정 `/tmp/` 경로 사용 금지):

```bash
python3 <tmpdir>/ulg2dm.py --input "<ulg-path>" --list-topics
```

**주의**: 인라인 스크립트를 직접 작성하지 말고, 정본 `ulg2dm.py`의 `list_topics()` 함수를 사용하세요.

### Step 4: 결과 정리 및 안내

실행 결과를 테이블 형태로 요약하여 출력합니다:

```
## ULG 파일 요약

| 항목 | 값 |
|------|-----|
| 파일 | log_001.ulg |
| 비행 시간 | 342.5초 |
| 토픽 수 | 47개 |

## 주요 토픽

| 토픽 | 샘플 수 | 샘플레이트 | 필드 수 |
|------|---------|-----------|---------|
| sensor_accel[0] | 34,250 | ~100.0Hz | 3 |
| sensor_gyro[0] | 34,250 | ~100.0Hz | 3 |
| vehicle_gps_position[0] | 3,425 | ~10.0Hz | 12 |
| ... | ... | ... | ... |
```

마지막에 다음 단계를 안내합니다:
- "트랙 설정을 만들려면 `/synapse-time-series:create-track-config`를 사용하세요"
- PX4 센서 토픽에 대한 자세한 정보는 스킬 reference의 `px4-sensor-catalog.md`를 참조할 수 있음을 안내합니다

## Error Handling

| 오류 | 조치 |
|------|------|
| pyulog 미설치 | `pip install pyulog` 안내 후 승인 시 설치 |
| ULG 파일 없음 | 경로 재확인 요청 |
| ULG 파싱 오류 | 파일 손상 가능성 안내, 다른 파일 시도 제안 |
| 빈 ULG 파일 (토픽 0개) | 유효한 데이터가 없음을 알리고 다른 파일 시도 제안 |
| Python 실행 오류 | Python 3 설치 여부 확인, 에러 메시지 표시 |

## Flexibility Note

AI 어시스턴트로서 Bash와 Python에 완전한 접근 권한이 있습니다. 표준 탐색으로 부족한 경우 **적응**하세요:
- 특정 토픽만 필터링하여 상세 분석
- 특정 필드의 값 범위(min/max)를 미리 확인
- 여러 ULG 파일을 비교 분석
- 토픽 간 타임스탬프 동기화 상태 확인

---
name: synapse-timeseries-workflow
description: >
  시계열 어노테이터 데이터 임포트를 위한 전체 파이프라인 워크플로우.
  Use when user mentions "시계열 데이터 준비", "데이터 임포트", "ULG 변환",
  "dm_schema", "트랙 설정", "track config", "비행 로그 변환",
  "time series", "timeseries", "시계열 변환".
---

# 시계열 데이터 파이프라인

시계열 어노테이터용 데이터 임포트 전체 워크플로우. 원본 센서 로그(ULG 등)를 분석하고, 트랙 설정 YAML을 작성하고, dm_schema JSON으로 변환하여 Synapse 시계열 어노테이터에 로드할 수 있는 형태로 만든다.

## Interactive-First Principle

이 파이프라인의 모든 인자는 **선택적**이다. 사용자가 인자를 누락한 경우, 오류 메시지를 표시하지 말고 `AskUserQuestion`을 사용하여 대화형으로 안내한다.

**대화형 질문 예시:**

| 누락된 정보 | 질문 |
|---|---|
| 원본 파일 경로 | "변환할 ULG 파일의 경로를 알려주세요." |
| 포맷 | "데이터 포맷이 무엇인가요? (현재 ULG 지원)" |
| 샘플레이트 | "리샘플링 주파수를 지정해주세요. (기본값: 10Hz)" |
| 트랙 구성 | "어떤 센서 채널을 차트에 포함할지 알려주세요." |
| 출력 경로 | "변환된 JSON 파일을 저장할 경로를 알려주세요." |

## Prerequisites Validation

파이프라인 실행 전, 필수 도구와 라이브러리가 설치되어 있는지 확인한다.

### Python 버전 확인

```bash
python3 --version
# Python 3.10 이상 필요
```

### 필수 패키지 확인

```bash
python3 -c "
import importlib
required = ['pyulog', 'yaml', 'numpy']
missing = []
for pkg in required:
    try:
        importlib.import_module(pkg)
    except ImportError:
        missing.append(pkg)

if missing:
    print(f'누락된 패키지: {missing}')
    print(f'설치: pip install {\" \".join(p if p != \"yaml\" else \"pyyaml\" for p in missing)}')
else:
    print('모든 필수 패키지가 설치되어 있습니다.')
"
```

누락된 패키지가 있으면 안내 후 설치를 진행한다:

```bash
pip install pyulog pyyaml numpy
```

## Key Concepts

### 1 프로젝트 = 1 YAML

트랙 설정 YAML은 **프로젝트 단위**로 1회 작성한다. 동일 프로젝트 내 모든 원본 파일(ULG 등)에 동일한 설정이 적용된다.

- 고객별로 원하는 차트 구성이 다르므로, 최초 1회 YAML을 작성하면 이후 추가 파일은 자동 변환 가능
- YAML 수정 없이 동일 프로젝트의 새 파일을 추가 변환할 수 있음

### 공통/포맷 분리 아키텍처

파이프라인은 **공통 로직**과 **포맷별 로직**으로 분리되어 있다.

| 구분 | 공통 (포맷 무관) | 포맷별 (현재 ULG) |
|---|---|---|
| 역할 | YAML 작성, dm_schema 검증 | 원본 파일 탐색, 데이터 변환 |
| 커맨드 | `/create-track-config`, `/validate-schema` | `/inspect-{포맷}`, `/convert-{포맷}` |
| 스크립트 | `validate_dm_schema.py` | `{포맷}2dm.py` |

### dm_schema JSON

시계열 어노테이터의 **표준 입력 포맷**이다. 모든 원본 데이터는 이 형식으로 변환되어야 한다.

- 6개 최상위 키: `schemaVersion`, `meta`, `timestamps`, `tracks`, `channels`, `channelMeta`
- 상세 스키마: [references/dm-schema-spec.md](references/dm-schema-spec.md) 참조

### 용어 정리

| 용어 | 정의 |
|---|---|
| **트랙 (track)** | 하나의 차트에 함께 표시되는 채널들의 그룹. 화면의 각 차트 패널에 대응 |
| **채널 (channel)** | 하나의 값 배열을 가진 개별 데이터 시리즈. timestamps와 동일 길이 |
| **채널 메타 (channelMeta)** | 채널의 표시 정보 — 이름, 단위, 색상, 차트 타입 |
| **샘플레이트 (sampleRate)** | 초당 데이터 포인트 수 (Hz). 모든 채널은 공통 샘플레이트로 리샘플링됨 |

## Supported Formats

### 현재 지원

| 포맷 | 확장자 | 설명 | 버전 |
|---|---|---|---|
| **ULG (PX4)** | `.ulg` | PX4 비행 컨트롤러 로그 | v1.0 |

## Pipeline Workflow

전체 파이프라인은 4단계로 구성된다. 각 단계는 독립적인 커맨드로 실행되며, 실패 시 이전 단계로 돌아가 수정할 수 있다.

```
┌─────────────────────────────────────────────────────────────┐
│                    Pipeline Workflow                         │
│                                                             │
│  Step 1          Step 2           Step 3          Step 4    │
│  ┌──────┐       ┌──────────┐     ┌──────────┐   ┌───────┐  │
│  │분석   │──────▶│YAML 작성  │────▶│변환 테스트│──▶│검증   │  │
│  │inspect│       │track-cfg │     │convert   │   │validate│  │
│  └──────┘       └──────────┘     └──────────┘   └───────┘  │
│  (포맷별)        (공통)           (포맷별)        (공통)     │
│                       ▲               │                     │
│                       └───────────────┘                     │
│                        실패 시 복귀                          │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: 분석 — `/inspect-{포맷}`

원본 raw 파일을 탐색하여 포함된 토픽, 필드, 샘플레이트 등을 확인한다. **포맷별** 커맨드를 사용한다.

```bash
# ULG 예시
/inspect-ulg /path/to/flight.ulg
```

**출력 정보:**

- 파일에 포함된 모든 토픽 목록
- 각 토픽의 필드 이름, 타입, 샘플레이트
- 데이터 시간 범위 (시작/종료)
- 파일 크기, 메시지 수 요약

이 정보를 바탕으로 Step 2에서 어떤 채널을 포함할지 결정한다.

### Step 2: YAML 작성 — `/create-track-config`

대화형으로 트랙 설정 YAML을 작성한다. **공통** 커맨드이며, 포맷에 관계없이 동일한 구조를 사용한다.

```bash
/create-track-config
```

**대화형 진행 순서:**

1. 샘플레이트 결정 (기본값: 10Hz)
2. 시간축 설정 (origin, format, timezone)
3. 트랙 설계 — 어떤 센서를 어떤 차트로 묶을지
4. 각 트랙의 채널 정의 — topic, field, name, unit, color, scale

**생성되는 파일:**

```yaml
# track-config.yaml
sample_rate: 10
time_axis:
  origin: absolute
  format: "HH:mm:ss"
  timezone: UTC
tracks:
  - id: attitude
    name: "자세 (Attitude)"
    chart_type: line
    channels:
      - topic: vehicle_attitude_setpoint
        field: roll_body
        name: "Roll"
        unit: "rad"
        color: "#42a5f5"
```

상세 YAML 구조: [references/track-config-spec.md](references/track-config-spec.md) 참조

### Step 3: 변환 테스트 — `/convert-{포맷}`

YAML 설정을 사용하여 원본 파일을 dm_schema JSON으로 변환한다. **포맷별** 커맨드를 사용한다.

```bash
# ULG 예시
/convert-ulg /path/to/flight.ulg --config track-config.yaml --output output.json
```

**변환 과정:**

1. 원본 파일 파싱 (pyulog 등)
2. YAML에 정의된 채널 추출
3. 공통 타임그리드로 리샘플링 (np.interp)
4. UTC 절대 시간 변환
5. scale 적용
6. dm_schema JSON 생성
7. **자동 검증** 실행 (Step 4와 동일)

**변환 실패 시:** 오류 메시지를 확인하고 Step 2로 돌아가 YAML을 수정한다. 흔한 실패 원인:

| 원인 | 해결 |
|---|---|
| 토픽/필드명 오타 | `/inspect-{포맷}`으로 정확한 이름 확인 |
| 존재하지 않는 토픽 | 해당 비행에서 기록되지 않은 센서 — 채널 제거 |
| 샘플 수 불일치 | 리샘플링 오류 — sample_rate 조정 |

### Step 4: 검증 — `/validate-schema`

생성된 dm_schema JSON이 시계열 어노테이터의 요구사항을 충족하는지 검증한다. **공통** 커맨드이다.

```bash
/validate-schema output.json
```

**검증 항목 (체크리스트):**

- [ ] 6개 최상위 키 존재 (`schemaVersion`, `meta`, `timestamps`, `tracks`, `channels`, `channelMeta`)
- [ ] `meta.nSamples` = `timestamps.length`
- [ ] `meta.duration` = `(endTime - startTime) / 1000`
- [ ] `timestamps`가 단조증가
- [ ] 모든 채널 배열 길이 = `timestamps.length`
- [ ] 모든 트랙의 채널 ID가 `channels`에 존재
- [ ] 모든 채널에 대응하는 `channelMeta` 존재

**실패 시:** 오류 내용을 확인하고 Step 2로 복귀하여 YAML을 수정한 뒤 Step 3부터 다시 실행한다.

### 완료 후: synapse-upload 연계

검증이 통과되면, 변환된 dm_schema JSON을 synapse-upload 플러그인으로 업로드한다.

```bash
# synapse-upload 플러그인 사용
/synapse-upload:upload
```

## dm_schema JSON Structure

dm_schema JSON은 5개의 최상위 키로 구성된다. 여기서는 요약만 제공하며, 전체 명세는 [references/dm-schema-spec.md](references/dm-schema-spec.md)를 참조한다.

| 키 | 타입 | 역할 |
|---|---|---|
| `meta` | `object` | 시간 범위, 샘플 수, 샘플레이트, 시간축 설정 |
| `timestamps` | `number[]` | epoch_ms 단위의 공통 시간축 배열 |
| `tracks` | `object[]` | 차트 그룹 정의 (id, name, chartType, channels) |
| `channels` | `object` | 채널ID → 숫자 배열 (실제 센서 데이터) |
| `channelMeta` | `object` | 채널ID → 표시 정보 (name, unit, color, chartType) |

**최소 예제:**

```json
{
  "meta": {
    "startTime": 1613693139891,
    "endTime": 1613693142891,
    "duration": 3.0,
    "sampleRate": 10,
    "nSamples": 31,
    "timeAxis": { "origin": "absolute", "format": "HH:mm:ss" }
  },
  "timestamps": [1613693139891, 1613693139991, "..."],
  "tracks": [
    {
      "id": "battery",
      "name": "배터리",
      "chartType": "line",
      "channels": ["battery_status__voltage_v"]
    }
  ],
  "channels": {
    "battery_status__voltage_v": [11.2, 11.1, "..."]
  },
  "channelMeta": {
    "battery_status__voltage_v": {
      "name": "전압",
      "unit": "V",
      "color": "#ab47bc",
      "chartType": "line"
    }
  }
}
```

## Track Config YAML Structure

트랙 설정 YAML은 3개의 최상위 키로 구성된다. 전체 명세는 [references/track-config-spec.md](references/track-config-spec.md)를 참조한다.

| 키 | 타입 | 역할 |
|---|---|---|
| `sample_rate` | `number` | 리샘플링 주파수 (Hz). 권장: 5~10Hz |
| `time_axis` | `object` | 시간축 설정 (origin, format, timezone) |
| `tracks` | `array` | 차트 그룹 배열. 각 트랙에 id, name, chart_type, channels 포함 |

**채널 객체 구조:**

```yaml
channels:
  - topic: vehicle_gps_position   # 원본 토픽명
    field: lat                     # 필드명
    name: "Latitude"               # 화면 표시 이름
    unit: "deg"                    # 변환 후 단위
    color: "#ffa726"               # 차트 색상
    scale: 1e-7                    # 값 변환 계수 (선택, 기본: 1.0)
```

**채널 ID 자동 생성 규칙:** `{topic}__{field}` (더블 언더스코어). 배열 인덱스의 대괄호는 언더스코어로 치환한다. 예: `actuator_motors` + `control[0]` = `actuator_motors__control_0`

## ULG Format Specifics

PX4 ULog 포맷 변환 시 알아야 할 핵심 사항을 정리한다. 센서 상세 목록은 [references/px4-sensor-catalog.md](references/px4-sensor-catalog.md)를 참조한다.

### PX4 토픽/필드 구조

ULG 파일은 **uORB 토픽**으로 데이터를 구성한다. 각 토픽은 여러 **필드**를 가진다.

```
vehicle_gps_position          ← 토픽
  ├── timestamp               ← 필드 (부팅 이후 마이크로초)
  ├── lat                     ← 필드 (degE7)
  ├── lon                     ← 필드 (degE7)
  ├── alt                     ← 필드 (mm)
  └── ...
```

### 리샘플링

ULG의 각 토픽은 서로 다른 샘플레이트를 가진다 (예: 자세 100Hz, GPS 5Hz, 배터리 1Hz). 변환 시 공통 타임그리드로 선형 보간한다.

```python
import numpy as np

# 공통 타임그리드 생성
common_timestamps = np.linspace(start_time, end_time, n_samples)

# 각 채널을 공통 타임그리드로 리샘플링
resampled = np.interp(common_timestamps, original_timestamps, original_values)
```

### UTC 오프셋 변환

ULG의 timestamp 필드는 **부팅 이후 마이크로초**이다. 절대 시간으로 변환하려면 GPS UTC 시각을 기준으로 오프셋을 계산한다.

```python
# vehicle_gps_position 토픽에서 UTC 오프셋 계산
# time_utc_usec: GPS 수신기가 보고하는 UTC 시각 (마이크로초)
# timestamp: 부팅 이후 마이크로초
utc_offset_us = gps_data['time_utc_usec'][0] - gps_data['timestamp'][0]

# 모든 타임스탬프에 오프셋 적용 후 밀리초로 변환
absolute_ms = (boot_timestamps + utc_offset_us) / 1000.0
```

### scale 변환

PX4의 일부 센서값은 raw 단위가 직관적이지 않다. YAML의 `scale` 필드로 변환한다.

| 변환 | raw 단위 | 변환 후 | scale |
|---|---|---|---|
| degE7 -> deg | 1e-7도 | 도 (deg) | `1e-7` |
| mm -> m | 밀리미터 | 미터 (m) | `0.001` |
| cm -> m | 센티미터 | 미터 (m) | `0.01` |
| mrad -> rad | 밀리라디안 | 라디안 (rad) | `0.001` |

### 센서 카탈로그

PX4의 주요 토픽과 필드, 단위, 권장 scale 값은 [references/px4-sensor-catalog.md](references/px4-sensor-catalog.md)에 정리되어 있다. `/inspect-ulg` 실행 시 이 카탈로그를 참조하여 사용자에게 권장 설정을 안내한다.

## synapse-upload Integration

변환이 완료된 dm_schema JSON을 Synapse 플랫폼에 업로드할 때 synapse-upload 플러그인과 연계한다.

### 워크플로우 연계

변환된 dm_schema JSON을 synapse-upload 플러그인으로 업로드합니다. track-config.yaml은 업로드하지 않으며, 동일 프로젝트의 추가 raw 파일 변환 시 재사용합니다.

1. **track-config.yaml 확정** — 파이프라인 Step 2~4를 거쳐 검증 완료된 YAML
2. **dm_schema JSON 업로드** — 변환된 JSON을 synapse-upload 플러그인으로 업로드
3. **배치 처리** — 동일 프로젝트 내 여러 ULG 파일을 동일 YAML로 일괄 변환 및 업로드

### 추가 파일 자동 처리

확정된 track-config.yaml이 있으면, 새 raw 파일은 수동 설정 없이 자동으로 변환할 수 있다.

```bash
# 동일 설정으로 추가 파일 변환
/convert-ulg /path/to/new_flight.ulg --config track-config.yaml --output new_output.json

# 검증 후 업로드
/validate-schema new_output.json
/synapse-upload:upload
```

## Script References

파이프라인에서 사용하는 Python 스크립트의 **정본(canonical source)**은 references 디렉토리에 있다. 커맨드와 에이전트는 이 스크립트를 임시 파일로 생성하여 실행한다.

| 스크립트 | 경로 | 역할 |
|---|---|---|
| ULG 변환 | `references/ulg2dm.py` | ULG 파일을 dm_schema JSON으로 변환 |
| dm_schema 검증 | `references/validate_dm_schema.py` | 생성된 JSON이 스키마 요구사항을 충족하는지 검증 |

### 실행 방법

커맨드/에이전트는 Read 도구로 정본 스크립트 내용을 읽어 `tempfile.mkdtemp()`로 생성한 임시 디렉토리에 기록합니다.

```python
import tempfile, shutil
from pathlib import Path

# 1. 스킬 reference에서 정본 스크립트를 Read 도구로 읽음
# 2. 임시 파일로 생성
tmpdir = tempfile.mkdtemp()
tmp_script = Path(tmpdir) / "ulg2dm.py"
# Read 도구로 읽은 스크립트 내용을 임시 파일에 기록
tmp_script.write_text(script_content, encoding="utf-8")

# 3. 실행
import subprocess
result = subprocess.run(
    ["python3", str(tmp_script), "--input", input_ulg,
     "--config", yaml_path, "--output", output_json],
    capture_output=True, text=True
)

# 4. 정리
shutil.rmtree(tmpdir)
```


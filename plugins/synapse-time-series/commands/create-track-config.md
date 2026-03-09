---
description: 고객 요구사항 기반으로 프로젝트 트랙 설정 YAML을 대화형으로 생성합니다
argument-hint: [--source <raw-file>] [--output <yaml-path>]
allowed-tools: ["Bash", "Read", "Write", "Glob", "AskUserQuestion"]
---

# 트랙 설정 YAML 생성

고객의 센서 시각화 요구사항을 받아 트랙/채널 구조의 YAML 설정 파일을 대화형으로 생성합니다. 1 프로젝트 = 1 YAML이며, 이 YAML이 프로젝트 전체의 변환 규칙이 됩니다. 현재 ULG(PX4) 포맷을 지원하며, 포맷에 무관한 공통 YAML 구조를 사용합니다.

## Interactive-First Design

**IMPORTANT**: 이 명령어는 완전한 대화형으로 설계되었습니다. 사용자가 인자 없이 `/synapse-time-series:create-track-config`만 입력해도 동작합니다. 누락된 정보는 `AskUserQuestion`으로 단계별 안내하세요. 모든 인자를 한꺼번에 제공하면 대화 없이 바로 진행할 수도 있습니다.

## Arguments (모두 선택적 — 누락 시 대화형으로 질문)

- `--source <raw-file>`: 원본 데이터 파일 경로 (확장자로 포맷 자동 판별)
- `--output <yaml-path>`: 출력 YAML 파일 경로 (기본값: `./track-config.yaml`)

## Workflow

### Step 0: 기존 YAML 확인

작업 디렉토리에 기존 `track-config.yaml`이 존재하는지 확인합니다:

```bash
test -f "./track-config.yaml" && echo "EXISTS" || echo "NOT_FOUND"
```

존재하면 `AskUserQuestion`으로 확인합니다:

```
"기존 track-config.yaml이 발견되었습니다."
Options:
  - "새로 만들기" → Step 1부터 진행
  - "기존 파일 수정" → 기존 YAML을 Read로 읽어 사용자에게 보여주고, 수정할 부분을 대화형으로 편집
```

기존 파일 수정 시: YAML을 읽어 현재 구성을 표시하고, 트랙 추가/삭제/수정을 대화형으로 진행한 뒤 Step 4(미리보기)로 이동합니다.

### Step 1: 포맷 판별

데이터 포맷을 결정합니다:

1. `--source` 파일 확장자로 자동 판별: `.ulg` → ULG (PX4)
2. 없으면 `AskUserQuestion`으로 ULG 파일 경로를 입력받습니다

### Step 2: 고객 요구 수집

`AskUserQuestion`으로 원하는 시각화를 자연어로 수집합니다:

```
"고객이 어떤 센서값들을 어떤 차트로 보고 싶어하나요?
자연어로 설명해주세요.

예시:
  - GPS 위치(위도/경도/고도), 배터리 전압/전류, 모터 출력을 각각 별도 차트로
  - 자이로 XYZ와 가속도 XYZ를 한 차트에, IMU 온도는 별도로"
```

`--source`로 raw 파일이 주어진 경우, 정본 스크립트로 가용 토픽/필드 목록을 먼저 추출하여 함께 제시합니다:

```bash
# ULG 파일인 경우 — 정본 스크립트 사용
python3 <tmpdir>/ulg2dm.py --input "<source-file>" --list-topics
```

이 탐색 결과(토픽, 필드, 샘플레이트)를 Step 3 트랙 설계에서 직접 활용합니다. 사용자에게 가용 센서 목록을 보여주며 선택을 유도합니다.

### Step 3: 트랙 설계

고객 요구사항을 트랙/채널 구조로 변환합니다.

**트랙 구조:**
- `id`: kebab-case 영문 (예: `gps-position`)
- `name`: 한국어 또는 영문 표시명 (예: `GPS 위치`)
- `chart_type`: `line` (기본), `scatter`, `bar`

**채널 구조:**
- `topic`: 센서 토픽 (예: `vehicle_gps_position`)
- `field`: 필드명 (예: `lat`)
- `name`: 채널 표시명 (예: `위도`)
- `unit`: 단위 (예: `deg`)
- `color`: 16진수 색상 코드
- `scale`: 단위 변환 계수 (필요 시)

**PX4 센서 카탈로그 자동 매핑 (ULG):**

| 토픽.필드 | 원본 단위 | scale | unit |
|-----------|-----------|-------|------|
| `vehicle_gps_position.lat` | degE7 | 1e-7 | deg |
| `vehicle_gps_position.lon` | degE7 | 1e-7 | deg |
| `vehicle_gps_position.alt` | mm | 0.001 | m |
| `battery_status.voltage_v` | V | — | V |
| `battery_status.current_a` | A | — | A |
| `sensor_gyro.x/y/z` | rad/s | — | rad/s |
| `sensor_accel.x/y/z` | m/s^2 | — | m/s^2 |
| `actuator_outputs.output[N]` | us | — | us |

**색상 자동 배정:** 차트 내 채널들이 시각적으로 구분되도록 자동 배정합니다.

```
기본 색상 팔레트:
  #2196F3 (파랑), #F44336 (빨강), #4CAF50 (초록),
  #FF9800 (주황), #9C27B0 (보라), #00BCD4 (시안),
  #795548 (갈색), #607D8B (회색)
```

**공통 설정:**
- `sample_rate`: 기본 10 (Hz)
- `time_axis`: `{ origin: "absolute", format: "HH:mm:ss", timezone: "UTC" }`

### Step 4: YAML 미리보기

생성될 YAML 전체를 코드 블록으로 보여줍니다. 예시:

```yaml
sample_rate: 10
time_axis:
  origin: absolute
  format: "HH:mm:ss"
  timezone: UTC

tracks:
  - id: gps-position
    name: GPS 위치
    chart_type: line
    channels:
      - topic: vehicle_gps_position
        field: lat
        name: 위도
        unit: deg
        scale: 1e-7
        color: "#2196F3"
      - topic: vehicle_gps_position
        field: lon
        name: 경도
        unit: deg
        scale: 1e-7
        color: "#F44336"
      - topic: vehicle_gps_position
        field: alt
        name: 고도
        unit: m
        scale: 0.001
        color: "#4CAF50"

  - id: battery
    name: 배터리
    chart_type: line
    channels:
      - topic: battery_status
        field: voltage_v
        name: 전압
        unit: V
        color: "#2196F3"
      - topic: battery_status
        field: current_a
        name: 전류
        unit: A
        color: "#F44336"
```

`AskUserQuestion`으로 확인합니다:

```
"이대로 저장할까요? 수정할 부분이 있으면 말씀해주세요."
Options:
  - "이대로 저장" → Step 5 진행
  - "수정 필요" → 수정 사항 반영 후 다시 미리보기
```

### Step 5: 저장

`--output` 경로 또는 기본값 `./track-config.yaml`에 Write 도구로 저장합니다.

```
track-config.yaml 저장 완료
  - 트랙: 3개
  - 채널: 8개
  - 샘플레이트: 10Hz
```

### Step 6: 다음 단계 안내

```
## 다음 단계

- 변환 테스트: /synapse-time-series:convert-ulg --config <path>
- 설정 수정: /synapse-time-series:create-track-config --source <file> --output <path>
```

## Error Handling

| 오류 | 대응 |
|------|------|
| 지원하지 않는 포맷 | 현재 ULG(PX4)만 지원됨을 안내 |
| `--source` 파일 없음 | 파일 경로 확인 요청 |
| 토픽/필드 매칭 실패 | raw 파일 inspect 결과 보여주고 올바른 토픽/필드 선택 유도 |
| pyulog 미설치 (inspect 시) | `pip install pyulog` 안내 |
| YAML 파싱 오류 (기존 파일 수정 시) | 오류 위치 표시 후 수정 안내 |

## Flexibility Note

AI 어시스턴트로서 Bash와 Python에 전체 접근 권한이 있습니다. 표준 워크플로우가 사용자 요구에 맞지 않으면 **유연하게 대응**하세요:
- raw 파일에서 가용 토픽 자동 탐색
- 기존 YAML에 트랙 추가/수정
- 여러 포맷에 대한 통합 설정 생성
- 커스텀 scale/unit 변환 규칙 적용
- 채널별 개별 sample_rate 설정

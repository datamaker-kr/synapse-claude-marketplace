# Track Config YAML 명세

## 개요

`track-config.yaml`은 시계열 데이터 변환 파이프라인의 설정 파일이다. 원본 센서 로그(ULG 등)를 dm_schema JSON으로 변환할 때, 어떤 센서값들을 어떤 차트로 묶을지, 샘플레이트는 얼마로 할지, 시간축은 어떻게 표시할지를 정의한다.

**1 프로젝트 = 1 YAML 파일**이다. 고객별로 1회 작성하면, 해당 고객의 모든 원본 파일에 동일한 설정을 적용할 수 있다.

## 최상위 구조

```yaml
sample_rate: 10          # Hz 단위 리샘플링 주파수
time_axis:               # 시간축 설정
  origin: absolute
  format: "HH:mm:ss"
  timezone: UTC
tracks:                  # 차트 그룹 배열
  - id: ...
    name: ...
    chart_type: ...
    channels: [...]
```

| 키 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `sample_rate` | `number` | O | 리샘플링 주파수 (Hz) |
| `time_axis` | `object` | O | 시간축 표시 설정 |
| `tracks` | `array` | O | 차트 그룹 정의 배열 |

## sample_rate

모든 채널을 이 주파수(Hz)로 리샘플링한다. 원본 센서 데이터는 채널마다 샘플레이트가 다르므로(예: 자세 20Hz, GPS 5Hz, 배터리 5Hz), 변환 시 공통 타임그리드로 선형 보간(리샘플링)하는 과정이 필요하다.

| 조건 | 결과 |
|---|---|
| 원본보다 높은 sample_rate | 보간된 값이 추가됨 (실제 해상도 향상 아님) |
| 원본보다 낮은 sample_rate | 데이터가 간략해짐 (파일 크기 감소) |

**권장값**:

- **일반 모니터링/시각화**: 10~50Hz가 적절하다. 가장 낮은 채널의 샘플레이트 이상으로 설정한다.
- **진동 분석 (PSD/FFT)**: 원시 센서 레이트(200~400Hz)를 사용하거나, 최소 100Hz 이상으로 설정해야 한다. 나이퀴스트 정리(Nyquist theorem)에 따라 샘플레이트는 관심 주파수의 2배를 초과해야 하며, 드론 진동 주파수는 통상 20~200Hz 범위이다.

```yaml
sample_rate: 10
```

## time_axis

시간축의 기준점과 화면 표시 형식을 정의한다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `origin` | `string` | O | timestamps 기준점. `absolute` 권장 |
| `format` | `string` | O | 화면 표시 시간 형식 (Day.js 포맷 문자열) |
| `timezone` | `string` | X | 타임존 (예: `UTC`, `Asia/Seoul`) |

### origin

| 값 | 설명 |
|---|---|
| `absolute` | Unix Epoch 기준 밀리초 (**어노테이터 기본 작동 기준, 권장**) |
| `relative` | 시작 시간으로부터의 경과 밀리초 |
| `boot` | 시스템 부팅 시간 기준 밀리초 |

어노테이터는 `absolute`만 지원한다. 변환 스크립트는 GPS UTC 시각을 이용해 항상 `absolute`로 변환한다.

### format

[Day.js 포맷](https://day.js.org/docs/en/display/format) 문자열을 사용한다.

| 예시 | 출력 |
|---|---|
| `HH:mm:ss` | 14:05:32 |
| `HH:mm` | 14:05 |
| `s.SSS` | 5.320 |
| `MM-DD HH:mm` | 02-18 14:05 |

### timezone

사용자가 원하는 타임존을 지정한다. 원본 데이터(ULG 등)에는 타임존 정보가 없으므로, 고객과 협의하여 결정한다.

```yaml
time_axis:
  origin: absolute
  format: "HH:mm:ss"
  timezone: UTC
```

## tracks 배열

화면에 표시되는 차트 그룹을 정의한다. 배열 순서가 화면 표시 순서이다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | `string` | O | 트랙 고유 ID (kebab-case 권장) |
| `name` | `string` | O | 화면 표시 이름 |
| `chart_type` | `string` | O | 차트 종류: `line`, `scatter`, `psd`, `fft` |
| `channels` | `array` | O | 이 트랙에 포함된 채널 정의 배열 |

```yaml
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

## 채널 객체

각 채널은 원본 데이터에서 추출할 센서값 하나를 정의한다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `topic` | `string` | O | 원본 데이터의 토픽(메시지) 이름 |
| `field` | `string` | O | 토픽 내 필드 이름 |
| `name` | `string` | O | 화면 표시 이름 |
| `unit` | `string` | O | 변환 후 단위 |
| `color` | `string` | O | 채널 색상 (hex 코드) |
| `scale` | `number` | X | 값 변환 계수 (기본값: `1.0`, 변환 없음) |

변환 스크립트는 `topic`과 `field`를 조합하여 채널 ID를 자동 생성한다:
- `{topic}__{field}` (더블 언더스코어)
- 배열 인덱스의 대괄호는 언더스코어로 치환: `control[0]` -> `control_0`

```yaml
channels:
  - topic: vehicle_gps_position
    field: lat
    name: "Latitude"
    unit: "deg"
    color: "#ffa726"
    scale: 1e-7
```

## scale 변환

원본 데이터의 일부 채널은 raw 값의 단위가 직관적이지 않다. `scale` 필드로 값에 계수를 곱하여 원하는 단위로 변환할 수 있다.

| 변환 | raw 단위 | 변환 후 단위 | scale 값 |
|---|---|---|---|
| degE7 -> deg | 1e-7도 | deg (도) | `1e-7` |
| mm -> m | 밀리미터 | m (미터) | `0.001` |
| cm -> m | 센티미터 | m (미터) | `0.01` |
| mrad -> rad | 밀리라디안 | rad (라디안) | `0.001` |

`scale`을 지정하지 않으면 기본값 `1.0`으로, 원본 값이 그대로 사용된다.

```yaml
# GPS 위도: degE7 -> deg
- topic: vehicle_gps_position
  field: lat
  name: "Latitude"
  unit: "deg"
  color: "#ffa726"
  scale: 1e-7

# GPS 고도: mm -> m
- topic: vehicle_gps_position
  field: alt
  name: "Altitude (MSL)"
  unit: "m"
  color: "#66bb6a"
  scale: 0.001
```

## YAML → JSON 필드 매핑 규칙

track-config YAML은 snake_case를 사용하고, dm_schema JSON은 camelCase를 사용합니다.

| YAML (snake_case) | JSON (camelCase) | 설명 |
|---|---|---|
| `sample_rate` | `sampleRate` | 리샘플링 주파수 |
| `time_axis` | `timeAxis` | 시간축 설정 |
| `chart_type` | `chartType` | 차트 유형 |
| `time_axis.origin` | `timeAxis.origin` | 시간 기준 (동일) |
| `time_axis.format` | `timeAxis.format` | 시간 포맷 (동일) |
| `time_axis.timezone` | `timeAxis.timezone` | 타임존 (동일) |

변환 스크립트(`ulg2dm.py`)가 자동으로 매핑합니다.

## 포맷 확장성

위 예시에서 `topic`과 `field`는 PX4 ULog 포맷의 식별자이다. 다른 데이터 포맷에서는 이 식별자가 달라질 수 있다.

| 데이터 포맷 | topic에 해당 | field에 해당 |
|---|---|---|
| PX4 ULog (.ulg) | uORB 토픽명 (예: `battery_status`) | 메시지 필드명 (예: `voltage_v`) |

YAML의 전체 구조(`sample_rate`, `time_axis`, `tracks`, `channels`)는 포맷에 관계없이 동일하다. 변환 스크립트만 포맷별로 다르게 구현하면 된다.

## 전체 YAML 예제

```yaml
# ULG -> dm_schema 변환을 위한 트랙 설정 파일
#
# 고객이 요구한 차트 그룹과 순서를 여기에 정의합니다.
# 각 track은 하나의 차트가 되며, channels에 포함된 센서값들이 함께 표시됩니다.

sample_rate: 10          # 모든 채널을 이 Hz로 리샘플링
time_axis:
  origin: absolute       # absolute | relative | boot
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
      - topic: vehicle_attitude_setpoint
        field: pitch_body
        name: "Pitch"
        unit: "rad"
        color: "#ef5350"
      - topic: vehicle_attitude_setpoint
        field: yaw_body
        name: "Yaw"
        unit: "rad"
        color: "#66bb6a"

  - id: gps-position
    name: "GPS 위치"
    chart_type: line
    channels:
      - topic: vehicle_gps_position
        field: lat
        name: "Latitude"
        unit: "deg"
        color: "#ffa726"
        scale: 1e-7            # degE7 -> deg 변환
      - topic: vehicle_gps_position
        field: lon
        name: "Longitude"
        unit: "deg"
        color: "#42a5f5"
        scale: 1e-7            # degE7 -> deg 변환
      - topic: vehicle_gps_position
        field: alt
        name: "Altitude (MSL)"
        unit: "m"
        color: "#66bb6a"
        scale: 0.001           # mm -> m 변환

  - id: local-position
    name: "로컬 위치 (NED)"
    chart_type: line
    channels:
      - topic: vehicle_local_position
        field: x
        name: "X (North)"
        unit: "m"
        color: "#ef5350"
      - topic: vehicle_local_position
        field: "y"
        name: "Y (East)"
        unit: "m"
        color: "#42a5f5"
      - topic: vehicle_local_position
        field: z
        name: "Z (Down)"
        unit: "m"
        color: "#66bb6a"

  - id: battery
    name: "배터리"
    chart_type: line
    channels:
      - topic: battery_status
        field: voltage_v
        name: "전압"
        unit: "V"
        color: "#ab47bc"
      - topic: battery_status
        field: current_a
        name: "전류"
        unit: "A"
        color: "#ef5350"

  - id: motor-output
    name: "모터 출력"
    chart_type: line
    channels:
      - topic: actuator_motors
        field: "control[0]"
        name: "Motor 0"
        unit: ""
        color: "#42a5f5"
      - topic: actuator_motors
        field: "control[1]"
        name: "Motor 1"
        unit: ""
        color: "#ef5350"
      - topic: actuator_motors
        field: "control[2]"
        name: "Motor 2"
        unit: ""
        color: "#66bb6a"
      - topic: actuator_motors
        field: "control[3]"
        name: "Motor 3"
        unit: ""
        color: "#ffa726"
```

# dm_schema JSON 스키마 명세

시계열 어노테이터가 로드하는 데이터 파일의 JSON 구조를 정의한다. 하나의 dm_schema JSON 파일은 동일한 시간 범위를 공유하는 센서 채널들의 집합이다.

## dm_schema JSON 구조

최상위에 6개의 키가 존재한다.

| 키 | 타입 | 필수 | 역할 |
|---|---|---|---|
| `schemaVersion` | `string` | O | 스키마 버전. 현재 `"1.0"`. Breaking change 시 버전을 올려 기존 파일과 구분 |
| `meta` | `object` | O | 시간 범위, 샘플 수, 샘플레이트 등 데이터 전체 메타 정보 |
| `timestamps` | `number[]` | O | epoch_ms 단위의 시간 배열. 모든 채널의 공통 시간축 |
| `tracks` | `object[]` | O | 차트 그룹 정의. 화면에 표시되는 각 차트의 구성 |
| `channels` | `object` | O | 채널ID를 키로, 숫자 배열을 값으로 하는 실제 데이터 |
| `channelMeta` | `object` | O | 채널ID를 키로, 표시 정보(이름, 단위, 색상 등)를 값으로 하는 메타데이터 |

## 용어 정의

| 용어 | 정의 | 관계 |
|---|---|---|
| **트랙 (track)** | 하나의 차트에 함께 표시되는 채널들의 그룹. 서로 다른 센서의 채널을 자유롭게 조합할 수 있다. | tracks 배열의 각 요소 |
| **채널 (channel)** | 하나의 값 배열을 가진 개별 데이터 시리즈. timestamps와 동일한 길이의 숫자 배열이다. | channels 객체의 각 키-값 쌍 |
| **채널 메타 (channelMeta)** | 채널의 표시 정보(이름, 단위, 색상, 차트 타입). | channelMeta 객체의 각 키-값 쌍. 키는 channels의 키와 1:1 대응 |

트랙은 여러 채널을 참조하고, 각 채널은 하나의 channelMeta를 가진다. 하나의 채널이 여러 트랙에 포함될 수 있다.

## meta 객체

데이터 전체의 시간 범위와 샘플링 정보를 담는다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `startTime` | `number` | O | 데이터 시작 시각 (epoch_ms) |
| `endTime` | `number` | O | 데이터 종료 시각 (epoch_ms) |
| `duration` | `number` | O | 데이터 길이 (초). `(endTime - startTime) / 1000`과 일치해야 한다 |
| `nSamples` | `number` | O | 전체 샘플 수. `timestamps.length`와 일치해야 한다 |
| `sampleRate` | `number` | O | 샘플레이트 (Hz) |
| `timeAxis` | `object` | O | 시간축 표시 설정 |

### timeAxis 객체

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `origin` | `TimeAxisOrigin` | O | timestamps의 기준점 |
| `format` | `TimeAxisFormat` | O | 화면 표시 시간 형식 (Day.js 포맷 문자열) |
| `timezone` | `string` | X | 타임존 (예: `"UTC"`, `"Asia/Seoul"`) |

## timestamps

- 타입: `number[]`
- epoch_ms(Unix Epoch 기준 밀리초) 값의 배열
- **단조증가**해야 한다 (각 원소는 이전 원소보다 커야 한다)
- 배열 길이는 `meta.nSamples`와 일치해야 한다

```json
"timestamps": [1613693139891, 1613693139991, 1613693140091]
```

## tracks 배열

화면에 표시되는 차트 그룹을 정의한다. 배열 순서가 화면 표시 순서이다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | `string` | O | 트랙 고유 ID (kebab-case 권장) |
| `name` | `string` | O | 화면 표시 이름 |
| `chartType` | `ChartType` | O | 차트 종류 |
| `channels` | `string[]` | O | 이 트랙에 포함된 채널 ID 배열. `channels` 객체의 키를 참조 |
| `yRange` | `YRange` | X | Y축 표시 범위 고정 |
| `thresholds` | `ChannelThreshold[]` | X | Y축 배경색 구간 |

```json
{
  "id": "altitude-estimate",
  "name": "고도 추정",
  "chartType": "line",
  "channels": ["ekf_alt", "gps_alt", "baro_alt"],
  "yRange": { "min": -30, "max": 30 },
  "thresholds": [
    { "max": 4.905, "color": "rgba(34,197,94,0.15)", "label": "Good" },
    { "min": 4.905, "max": 9.81, "color": "rgba(253,203,110,0.15)", "label": "Warning" }
  ]
}
```

## channels 객체

실제 센서 데이터를 담는다. 키는 채널 ID(문자열), 값은 숫자 배열이다.

- 각 채널의 배열 길이는 `timestamps` 배열 길이와 동일해야 한다
- 채널 ID는 `tracks[].channels`에서 참조된다
- 채널 ID 네이밍 규칙: `{토픽명}__{필드명}` (더블 언더스코어). 배열 인덱스의 대괄호는 언더스코어로 치환

```json
"channels": {
  "vehicle_attitude_setpoint__roll_body": [0.01, 0.012, 0.015],
  "battery_status__voltage_v": [11.2, 11.1, 11.0],
  "actuator_motors__control_0": [0.45, 0.46, 0.47]
}
```

## channelMeta 객체

각 채널의 표시 정보를 담는다. 키는 `channels` 객체의 키와 1:1 대응한다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `name` | `string` | O | 화면 표시 이름 |
| `unit` | `string` | O | 단위 (예: `"m/s2"`, `"deg"`, `"V"`) |
| `color` | `string` | O | 채널 색상 (hex 코드) |
| `chartType` | `ChartType` | O | 차트 종류 |

```json
"channelMeta": {
  "vehicle_attitude_setpoint__roll_body": {
    "name": "Roll",
    "unit": "rad",
    "color": "#42a5f5",
    "chartType": "line"
  }
}
```

## 타입 상세

### ChartType

차트의 렌더링 방식을 지정한다.

| 값 | 설명 |
|---|---|
| `line` | 라인 차트 |
| `scatter` | 산점도 |
| `psd` | Power Spectral Density |
| `fft` | Fast Fourier Transform |

### TimeAxisOrigin

timestamps의 기준점을 지정한다. **프로그램은 `absolute` 기준으로만 동작한다.** 다른 origin의 데이터는 별도 컨버터를 통해 `absolute`로 변환한 후 사용해야 한다.

| 값 | 설명 |
|---|---|
| `absolute` | Unix Epoch 기준 밀리초 (**프로그램 기본 작동 기준**) |
| `relative` | 시작 시간으로부터의 경과 밀리초 (컨버터 필요) |
| `boot` | 시스템 부팅 시간 기준 밀리초 (컨버터 필요) |

### TimeAxisFormat

화면에 표시할 시간 형식을 지정한다. [Day.js 포맷](https://day.js.org/docs/en/display/format) 문자열을 사용한다.

| 예시 | 출력 |
|---|---|
| `HH:mm:ss` | 14:05:32 |
| `HH:mm` | 14:05 |
| `s.SSS` | 5.320 |
| `MM-DD HH:mm` | 02-18 14:05 |

### ChannelThreshold

트랙의 Y축에 표시되는 배경색 구간이다. `tracks[].thresholds` 배열의 각 요소이다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `color` | `string` | O | 배경색 (rgba 권장) |
| `label` | `string` | X | 구간 라벨 |
| `min` | `number` | X | Y축 최소값 (미지정 시 -무한대) |
| `max` | `number` | X | Y축 최대값 (미지정 시 +무한대) |

### YRange

트랙의 Y축 표시 범위를 고정한다. `tracks[].yRange` 객체이다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `min` | `number` | O | Y축 하한 |
| `max` | `number` | O | Y축 상한 |

## 제약 조건 요약

모든 유효한 dm_schema JSON은 다음 조건을 만족해야 한다.

- [ ] 최상위에 `schemaVersion`, `meta`, `timestamps`, `tracks`, `channels`, `channelMeta` 6개 키가 모두 존재
- [ ] `schemaVersion`은 유효한 버전 문자열 (현재 `"1.0"`)
- [ ] `meta.startTime` < `meta.endTime`
- [ ] `meta.duration` = `(meta.endTime - meta.startTime) / 1000`
- [ ] `meta.nSamples` = `timestamps.length`
- [ ] `meta.sampleRate` > 0
- [ ] `meta.timeAxis.origin`은 `absolute`, `relative`, `boot` 중 하나
- [ ] `meta.timeAxis.format`은 유효한 Day.js 포맷 문자열
- [ ] `timestamps`는 단조증가하는 숫자 배열
- [ ] `tracks`는 1개 이상의 요소를 가진 배열
- [ ] 각 `tracks[].id`는 고유한 문자열
- [ ] 각 `tracks[].channels`의 모든 채널 ID가 `channels` 객체에 키로 존재
- [ ] 각 `channels[key]`는 `timestamps.length`와 동일한 길이의 숫자 배열
- [ ] `channels`의 모든 키에 대응하는 `channelMeta` 항목이 존재
- [ ] 각 `channelMeta` 항목에 `name`, `unit`, `color`, `chartType` 필드가 존재

## JSON 예제

최소 유효 dm_schema 예제:

```json
{
  "schemaVersion": "1.0",
  "meta": {
    "startTime": 1613693139891,
    "endTime": 1613693142891,
    "duration": 3.0,
    "sampleRate": 10,
    "nSamples": 31,
    "timeAxis": {
      "origin": "absolute",
      "format": "HH:mm:ss"
    }
  },
  "timestamps": [
    1613693139891, 1613693139991, 1613693140091, 1613693140191, 1613693140291,
    1613693140391, 1613693140491, 1613693140591, 1613693140691, 1613693140791,
    1613693140891, 1613693140991, 1613693141091, 1613693141191, 1613693141291,
    1613693141391, 1613693141491, 1613693141591, 1613693141691, 1613693141791,
    1613693141891, 1613693141991, 1613693142091, 1613693142191, 1613693142291,
    1613693142391, 1613693142491, 1613693142591, 1613693142691, 1613693142791,
    1613693142891
  ],
  "tracks": [
    {
      "id": "battery",
      "name": "배터리",
      "chartType": "line",
      "channels": ["battery_status__voltage_v"]
    }
  ],
  "channels": {
    "battery_status__voltage_v": [
      11.2, 11.2, 11.1, 11.1, 11.1, 11.0, 11.0, 11.0, 11.0, 10.9,
      10.9, 10.9, 10.9, 10.8, 10.8, 10.8, 10.8, 10.7, 10.7, 10.7,
      10.7, 10.6, 10.6, 10.6, 10.6, 10.5, 10.5, 10.5, 10.5, 10.4,
      10.4
    ]
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

# PX4 센서 카탈로그

PX4 ULog 파일에서 추출 가능한 토픽/필드 레퍼런스입니다.
백엔드 개발자가 ULG 파일에서 어떤 토픽/필드를 선택해야 하는지 빠르게 찾을 수 있도록 합니다.

## 개요

PX4 ULog(`.ulg`) 파일은 비행 중 기록되는 바이너리 로그 포맷입니다.

- **토픽(Topic)**: 메시지 타입을 의미합니다. 하나의 토픽은 특정 센서나 상태를 나타내며, 고유한 타임스탬프 시퀀스를 가집니다. 예: `vehicle_attitude`, `sensor_gps`
- **필드(Field)**: 토픽 내부의 개별 값입니다. 하나의 토픽에는 여러 필드가 포함됩니다. 예: `vehicle_attitude.roll`, `sensor_gps.lat`
- **multi_id**: 동일 타입의 센서가 여러 개인 경우(예: IMU 3개) 인스턴스를 구분하는 정수 ID (0, 1, 2)

트랙 설정에서 채널을 정의할 때 `topic` + `field` 조합으로 데이터를 지정하며, 필요 시 `scale`을 적용하여 단위를 변환합니다.

---

## 자세 (Attitude)

### `vehicle_attitude`

비행 컨트롤러가 추정한 현재 기체 자세입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `q[0]` | - | - | 쿼터니언 w 성분 |
| `q[1]` | - | - | 쿼터니언 x 성분 |
| `q[2]` | - | - | 쿼터니언 y 성분 |
| `q[3]` | - | - | 쿼터니언 z 성분 |
| `rollspeed` | rad/s | - | Roll 각속도 |
| `pitchspeed` | rad/s | - | Pitch 각속도 |
| `yawspeed` | rad/s | - | Yaw 각속도 |

> 쿼터니언에서 오일러 각(roll, pitch, yaw)으로 변환이 필요합니다. 변환 후 단위는 rad입니다.

### `vehicle_attitude_setpoint`

자동비행/제어기가 요구하는 목표 자세입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `roll_body` | rad | - | 목표 Roll 각도 |
| `pitch_body` | rad | - | 목표 Pitch 각도 |
| `yaw_body` | rad | - | 목표 Yaw 각도 |
| `yaw_sp_move_rate` | rad/s | - | Yaw 목표 변화율 |
| `thrust_body[0]` | - | - | X축 추력 (정규화) |
| `thrust_body[1]` | - | - | Y축 추력 (정규화) |
| `thrust_body[2]` | - | - | Z축 추력 (정규화) |

---

## GPS

### `vehicle_gps_position`

GPS 수신기의 위치/속도 데이터입니다. PX4 v1.13 이전 버전에서 사용됩니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `lat` | degE7 | `1e-7` | 위도 (scale 적용 시 deg) |
| `lon` | degE7 | `1e-7` | 경도 (scale 적용 시 deg) |
| `alt` | mm | `0.001` | 고도 MSL (scale 적용 시 m) |
| `alt_ellipsoid` | mm | `0.001` | 타원체 고도 (scale 적용 시 m) |
| `vel_n_m_s` | m/s | - | 북쪽 방향 속도 |
| `vel_e_m_s` | m/s | - | 동쪽 방향 속도 |
| `vel_d_m_s` | m/s | - | 아래쪽 방향 속도 |
| `eph` | m | - | 수평 위치 정확도 (m), GPS horizontal dilution |
| `epv` | m | - | 수직 위치 정확도 (m), GPS vertical dilution |
| `hdop` | - | - | 수평 정밀도 저하 |
| `vdop` | - | - | 수직 정밀도 저하 |
| `satellites_used` | 개 | - | 사용 중인 위성 수 |
| `fix_type` | - | - | 수신 타입 (0=없음, 2=2D, 3=3D, 4=DGPS, 5=RTK float, 6=RTK fixed) |

### `sensor_gps`

PX4 v1.14 이후 `vehicle_gps_position`을 대체하는 토픽입니다. 필드 구조는 동일합니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `lat` | degE7 | `1e-7` | 위도 |
| `lon` | degE7 | `1e-7` | 경도 |
| `alt` | mm | `0.001` | 고도 MSL |
| `alt_ellipsoid` | mm | `0.001` | 타원체 고도 |
| `vel_n_m_s` | m/s | - | 북쪽 방향 속도 |
| `vel_e_m_s` | m/s | - | 동쪽 방향 속도 |
| `vel_d_m_s` | m/s | - | 아래쪽 방향 속도 |
| `eph` | m | - | 수평 위치 정확도 (GPS horizontal dilution) |
| `epv` | m | - | 수직 위치 정확도 (GPS vertical dilution) |
| `satellites_used` | 개 | - | 사용 중인 위성 수 |
| `fix_type` | - | - | 수신 타입 (0=없음, 2=2D, 3=3D, 4=DGPS, 5=RTK float, 6=RTK fixed) |

> ULG 파일에 두 토픽이 모두 존재할 수 있습니다. `sensor_gps`가 있으면 우선 사용하세요.

---

## 로컬 위치 (Local Position)

### `vehicle_local_position`

EKF가 추정한 NED 좌표계 기반 로컬 위치/속도입니다. 원점은 홈 포지션입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `x` | m | - | 북쪽(North) 방향 위치 |
| `y` | m | - | 동쪽(East) 방향 위치 |
| `z` | m | - | 아래쪽(Down) 방향 위치 (음수 = 위) |
| `vx` | m/s | - | 북쪽 방향 속도 |
| `vy` | m/s | - | 동쪽 방향 속도 |
| `vz` | m/s | - | 아래쪽 방향 속도 |
| `ax` | m/s² | - | 북쪽 방향 가속도 |
| `ay` | m/s² | - | 동쪽 방향 가속도 |
| `az` | m/s² | - | 아래쪽 방향 가속도 |
| `heading` | rad | - | 현재 기수 방향 |
| `xy_valid` | bool | - | 수평 위치 유효 여부 |
| `z_valid` | bool | - | 수직 위치 유효 여부 |

---

## 배터리 (Battery)

### `battery_status`

배터리 상태 정보입니다. 멀티 배터리 구성 시 multi_id로 구분합니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `voltage_v` | V | - | 배터리 전압 |
| `current_a` | A | - | 방전 전류 |
| `remaining` | - | - | 잔량 비율 (0.0~1.0, 표시 시 ×100 = %) |
| `discharged_mah` | mAh | - | 누적 방전량 |
| `temperature` | °C | - | 배터리 온도 |
| `cell_count` | 개 | - | 셀 수 |
| `connected` | bool | - | 연결 상태 |

---

## 모터/액추에이터 (Actuators)

### `actuator_motors`

모터 제어 명령 (정규화된 값)입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `control[0]` | - | - | 모터 0 출력 (0~1 정규화) |
| `control[1]` | - | - | 모터 1 출력 |
| `control[2]` | - | - | 모터 2 출력 |
| `control[3]` | - | - | 모터 3 출력 |
| `control[4]` | - | - | 모터 4 출력 (헥사/옥토) |
| `control[5]` | - | - | 모터 5 출력 |
| `control[6]` | - | - | 모터 6 출력 |
| `control[7]` | - | - | 모터 7 출력 |

> 쿼드콥터는 `control[0]`~`control[3]`, 헥사콥터는 `[0]`~`[5]`, 옥토콥터는 `[0]`~`[7]`을 사용합니다.

### `actuator_outputs`

ESC로 전달되는 실제 PWM 출력입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `output[0]` | µs | - | 채널 0 PWM 출력 |
| `output[1]` | µs | - | 채널 1 PWM 출력 |
| ... | µs | - | ... |
| `output[15]` | µs | - | 채널 15 PWM 출력 |
| `noutputs` | 개 | - | 활성 출력 채널 수 |

> 일반적으로 PWM 범위는 1000~2000µs이며, 1000=최소, 2000=최대입니다.

---

## IMU (관성 측정 장치)

동일 타입 센서가 최대 3개(multi_id: 0, 1, 2)까지 존재할 수 있습니다.

### `sensor_accel`

가속도계 원시 데이터입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `x` | m/s² | - | X축 가속도 |
| `y` | m/s² | - | Y축 가속도 |
| `z` | m/s² | - | Z축 가속도 |
| `temperature` | °C | - | 센서 온도 |

### `sensor_gyro`

자이로스코프 원시 데이터입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `x` | rad/s | - | X축 각속도 |
| `y` | rad/s | - | Y축 각속도 |
| `z` | rad/s | - | Z축 각속도 |
| `temperature` | °C | - | 센서 온도 |

### `sensor_mag`

지자기 센서 원시 데이터입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `x` | gauss | - | X축 자기장 |
| `y` | gauss | - | Y축 자기장 |
| `z` | gauss | - | Z축 자기장 |
| `temperature` | °C | - | 센서 온도 |

> IMU 센서들은 고주파(수백~수천 Hz)로 기록되므로 용도에 따라 적절한 `sample_rate`를 설정해야 합니다.
>
> - **일반 모니터링/시각화**: 10~50Hz로 다운샘플링하면 충분합니다.
> - **진동 분석 (PSD/FFT)**: 원시 센서 레이트(200~400Hz)를 사용하거나, 최소 100Hz 이상이어야 합니다. 나이퀴스트 정리(Nyquist theorem)에 따라 샘플레이트는 관심 주파수의 2배를 초과해야 하며, 드론의 진동 주파수는 통상 20~200Hz 범위입니다.

---

## 기압/고도 (Barometer)

### `sensor_baro`

기압계 원시 데이터입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `pressure` | Pa | - | 대기압 |
| `temperature` | °C | - | 센서 온도 |

### `vehicle_air_data`

기압계 기반 추정 고도입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `baro_alt_meter` | m | - | 기압 고도 |
| `baro_temp_celcius` | °C | - | 기압 센서 온도 |
| `baro_pressure_pa` | Pa | - | 보정된 기압 |

> 기압 고도는 상대 고도(이륙 지점 기준)이므로 GPS 고도(MSL)와 다릅니다.

---

## 비행 모드/상태

### `vehicle_status`

기체의 비행 모드와 시동 상태입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `nav_state` | enum | - | 비행 모드 (아래 표 참조) |
| `arming_state` | enum | - | 시동 상태 (1=대기, 2=시동) |
| `failsafe` | bool | - | 안전장치 활성화 여부 |
| `vehicle_type` | enum | - | 기체 유형 |

**`nav_state` 주요 값:**

| 값 | 모드 |
|----|------|
| 0 | Manual |
| 1 | Altitude |
| 2 | Position |
| 3 | Mission |
| 4 | Loiter |
| 5 | Return to Launch (RTL) |
| 10 | Acro |
| 14 | Offboard |
| 15 | Stabilized |
| 17 | Takeoff |
| 18 | Land |

### `commander_state`

상위 레벨 비행 상태입니다.

| 필드 | 단위 | scale | 설명 |
|------|------|-------|------|
| `main_state` | enum | - | 메인 상태 (0=Manual, 1=Altitude, 2=Position, 3=Mission, ...) |

---

## 흔한 트랙 조합 예시

드론 비행 분석에서 자주 사용되는 트랙 구성입니다.

### 1. 기본 비행 모니터링

```yaml
tracks:
  - id: attitude
    name: "자세 (Attitude)"
    channels:
      - { topic: vehicle_attitude_setpoint, field: roll_body, unit: "rad" }
      - { topic: vehicle_attitude_setpoint, field: pitch_body, unit: "rad" }
      - { topic: vehicle_attitude_setpoint, field: yaw_body, unit: "rad" }
  - id: gps-position
    name: "GPS 위치"
    channels:
      - { topic: vehicle_gps_position, field: lat, unit: "deg", scale: 1e-7 }
      - { topic: vehicle_gps_position, field: lon, unit: "deg", scale: 1e-7 }
      - { topic: vehicle_gps_position, field: alt, unit: "m", scale: 0.001 }
  - id: battery
    name: "배터리"
    channels:
      - { topic: battery_status, field: voltage_v, unit: "V" }
      - { topic: battery_status, field: current_a, unit: "A" }
```

### 2. 모터 출력 분석

```yaml
tracks:
  - id: motor-output
    name: "모터 출력"
    channels:
      - { topic: actuator_motors, field: "control[0]", name: "Motor 0" }
      - { topic: actuator_motors, field: "control[1]", name: "Motor 1" }
      - { topic: actuator_motors, field: "control[2]", name: "Motor 2" }
      - { topic: actuator_motors, field: "control[3]", name: "Motor 3" }
  - id: battery
    name: "배터리"
    channels:
      - { topic: battery_status, field: voltage_v, unit: "V" }
      - { topic: battery_status, field: current_a, unit: "A" }
```

### 3. GPS 품질 진단

```yaml
tracks:
  - id: gps-quality
    name: "GPS 수신 품질"
    channels:
      - { topic: vehicle_gps_position, field: satellites_used, name: "위성 수" }
      - { topic: vehicle_gps_position, field: fix_type, name: "Fix 타입" }
      - { topic: vehicle_gps_position, field: hdop, name: "HDOP" }
  - id: gps-velocity
    name: "GPS 속도"
    channels:
      - { topic: vehicle_gps_position, field: vel_n_m_s, unit: "m/s", name: "North" }
      - { topic: vehicle_gps_position, field: vel_e_m_s, unit: "m/s", name: "East" }
      - { topic: vehicle_gps_position, field: vel_d_m_s, unit: "m/s", name: "Down" }
```

### 4. 3D 위치 추적 (로컬 좌표)

```yaml
tracks:
  - id: local-xy
    name: "로컬 위치 (수평)"
    channels:
      - { topic: vehicle_local_position, field: x, unit: "m", name: "North" }
      - { topic: vehicle_local_position, field: y, unit: "m", name: "East" }
  - id: local-z
    name: "로컬 고도"
    channels:
      - { topic: vehicle_local_position, field: z, unit: "m", name: "Down" }
      - { topic: vehicle_air_data, field: baro_alt_meter, unit: "m", name: "기압 고도" }
```

### 5. IMU 진동 분석

```yaml
tracks:
  - id: accel
    name: "가속도"
    channels:
      - { topic: sensor_accel, field: x, unit: "m/s²" }
      - { topic: sensor_accel, field: y, unit: "m/s²" }
      - { topic: sensor_accel, field: z, unit: "m/s²" }
  - id: gyro
    name: "각속도"
    channels:
      - { topic: sensor_gyro, field: x, unit: "rad/s" }
      - { topic: sensor_gyro, field: y, unit: "rad/s" }
      - { topic: sensor_gyro, field: z, unit: "rad/s" }
```

### 6. 비행 모드 + 고도 상관 분석

```yaml
tracks:
  - id: flight-mode
    name: "비행 모드"
    channels:
      - { topic: vehicle_status, field: nav_state, name: "Nav State" }
      - { topic: vehicle_status, field: arming_state, name: "Arming" }
  - id: altitude
    name: "고도 비교"
    channels:
      - { topic: vehicle_gps_position, field: alt, unit: "m", scale: 0.001, name: "GPS 고도" }
      - { topic: vehicle_air_data, field: baro_alt_meter, unit: "m", name: "기압 고도" }
      - { topic: vehicle_local_position, field: z, unit: "m", name: "로컬 Z" }
```

### 7. 배터리 수명 분석

```yaml
tracks:
  - id: battery-full
    name: "배터리 상세"
    channels:
      - { topic: battery_status, field: voltage_v, unit: "V" }
      - { topic: battery_status, field: current_a, unit: "A" }
      - { topic: battery_status, field: remaining, name: "잔량 (0~1)" }
      - { topic: battery_status, field: discharged_mah, unit: "mAh" }
  - id: motor-output
    name: "모터 출력"
    channels:
      - { topic: actuator_motors, field: "control[0]", name: "Motor 0" }
      - { topic: actuator_motors, field: "control[1]", name: "Motor 1" }
      - { topic: actuator_motors, field: "control[2]", name: "Motor 2" }
      - { topic: actuator_motors, field: "control[3]", name: "Motor 3" }
```

### 8. 자기장 캘리브레이션 확인

```yaml
tracks:
  - id: mag
    name: "지자기 센서"
    channels:
      - { topic: sensor_mag, field: x, unit: "gauss" }
      - { topic: sensor_mag, field: y, unit: "gauss" }
      - { topic: sensor_mag, field: z, unit: "gauss" }
  - id: heading
    name: "기수 방향"
    channels:
      - { topic: vehicle_local_position, field: heading, unit: "rad" }
      - { topic: vehicle_attitude_setpoint, field: yaw_body, unit: "rad" }
```

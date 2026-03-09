---
description: synapse-time-series 플러그인의 사용법과 워크플로우를 안내합니다
allowed-tools: []
---

아래 도움말을 그대로 출력하세요. 도구를 사용하지 마세요.

# synapse-time-series 도움말

## 개요
시계열 어노테이터 데이터 임포트 전용 플러그인.
고객 raw 데이터(ULG 등)를 dm_schema JSON으로 변환하는 전체 워크플로우를 제공합니다.

## 지원 포맷
| 포맷 | 상태 | 명령어 |
|---|---|---|
| ULG (PX4) | ✅ 지원 | inspect-ulg, convert-ulg |

## 명령어
| 명령어 | 유형 | 설명 |
|---|---|---|
| `/synapse-time-series:help` | 공통 | 이 도움말 |
| `/synapse-time-series:inspect-ulg` | ULG | ULG 파일의 토픽/필드/샘플레이트 탐색 |
| `/synapse-time-series:create-track-config` | 공통 | 고객 요구 기반 트랙 설정 YAML 생성 |
| `/synapse-time-series:convert-ulg` | ULG | ULG → dm_schema JSON 변환 |
| `/synapse-time-series:validate-schema` | 공통 | dm_schema JSON 검증 |

## 권장 워크플로우
```
1. 분석    → /synapse-time-series:inspect-ulg
2. YAML    → /synapse-time-series:create-track-config
3. 변환    → /synapse-time-series:convert-ulg
4. 검증    → /synapse-time-series:validate-schema
```

또는 스킬이 전체 워크플로우를 자동 안내합니다: "시계열 데이터 준비 도와줘"

## 에이전트
| 에이전트 | 설명 |
|---|---|
| synapse-data-pipeline-assistant | 전체 파이프라인 자율 실행 |
| synapse-schema-debugger | dm_schema 검증 오류 자동 디버깅 |

## 핵심 개념
- **1 프로젝트 = 1 YAML**: 프로젝트 단위로 track-config.yaml 확정
- **공통/포맷 분리**: YAML 설계와 검증은 공통, 탐색과 변환은 포맷별
- **synapse-upload 연계**: 변환된 dm_schema JSON을 업로드

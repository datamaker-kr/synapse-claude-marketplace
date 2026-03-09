# synapse-time-series

시계열 어노테이터 데이터 임포트 플러그인. 고객 raw 데이터(ULG 등)를 dm_schema JSON으로 변환하는 전체 워크플로우를 제공합니다.

> **라이선스**: SEE LICENSE IN LICENSE

## 개요

이 플러그인은 PX4 ULG 등 다양한 시계열 raw 데이터를 Synapse 시계열 어노테이터가 사용하는 dm_schema JSON으로 변환하는 파이프라인을 제공합니다:

- **대상 사용자**: 백엔드 개발자, 데이터 엔지니어
- **1 프로젝트 = 1 YAML**: 프로젝트 단위로 track-config.yaml을 확정하고, 이를 기반으로 변환 실행
- **공통/포맷 분리**: 트랙 설정(YAML)과 스키마 검증은 공통, 파일 탐색과 변환은 포맷별로 분리

**소속 조직**: [datamaker-kr](https://github.com/datamaker-kr)

## 지원 포맷

| 포맷 | 상태 | 버전 | 비고 |
|------|------|------|------|
| ULG (PX4) | ✅ 지원 | v1.0 | inspect-ulg, convert-ulg |

## 설치

### 사전 요구사항

| 항목 | 확인 명령어 | 최소 버전 | 비고 |
|------|------------|-----------|------|
| Claude Code | `claude --version` | v2.1.0+ | - |
| Python | `python3 --version` | 3.10+ | 필수 |
| synapse-sdk | `synapse --version` | >= 2026.1.39 | PyPI에서 설치 |
| Synapse 인증 | `synapse doctor` | — | `synapse login` 필요 |
| pyulog | `pip show pyulog` | — | ULG 파싱에 필요 |

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
/plugin install synapse-time-series@synapse-marketplace
```

---

## 빠른 시작

4단계로 ULG 파일을 dm_schema JSON으로 변환할 수 있습니다:

```bash
# 1. ULG 파일 구조 분석 (토픽, 필드, 샘플레이트 확인)
/synapse-time-series:inspect-ulg

# 2. 고객 요구사항 기반 트랙 설정 YAML 생성
/synapse-time-series:create-track-config

# 3. ULG → dm_schema JSON 변환
/synapse-time-series:convert-ulg

# 4. 생성된 dm_schema JSON 검증
/synapse-time-series:validate-schema
```

또는 자연어로 요청하면 스킬이 전체 워크플로우를 자동 안내합니다:

```
"시계열 데이터 준비 도와줘"
```

---

## 명령어

### 공통 명령어

| 명령어 | 설명 |
|--------|------|
| `/synapse-time-series:help` | 사용 가능한 모든 기능 안내 |
| `/synapse-time-series:create-track-config` | 고객 요구사항 기반 트랙 설정 YAML 생성 |
| `/synapse-time-series:validate-schema` | dm_schema JSON 검증 |

### ULG 전용 명령어

| 명령어 | 설명 |
|--------|------|
| `/synapse-time-series:inspect-ulg` | ULG 파일의 토픽/필드/샘플레이트 탐색 |
| `/synapse-time-series:convert-ulg` | ULG → dm_schema JSON 변환 |

---

## 스킬

스킬은 대화 컨텍스트에 따라 자동으로 활성화됩니다.

| 스킬 | 트리거 키워드 |
|------|---------------|
| **synapse-timeseries-workflow** | "시계열 데이터 준비", "ULG 변환", "dm_schema 생성", "트랙 설정" |

---

## 에이전트

| 에이전트 | 목적 |
|----------|------|
| **synapse-data-pipeline-assistant** | ULG 탐색부터 스키마 검증까지 전체 파이프라인 자율 실행 |
| **synapse-schema-debugger** | dm_schema 검증 오류를 자동으로 진단하고 수정 제안 |

---

## synapse-upload 연계

변환이 완료되면 확정된 `track-config.yaml`을 synapse-upload 플러그인에 추가 데이터로 전달하여 업로드할 수 있습니다. YAML 파일은 프로젝트별로 1개만 유지하며, 동일 YAML로 여러 ULG 파일을 일괄 변환할 수 있습니다.

---

## 핵심 개념

- **1 프로젝트 = 1 YAML**: 프로젝트 단위로 track-config.yaml을 확정. 동일 설정으로 다수의 raw 파일을 변환
- **공통/포맷 분리**: YAML 설계와 스키마 검증은 포맷에 무관한 공통 로직, 파일 탐색과 변환은 포맷별 전용 로직
- **dm_schema**: Synapse 시계열 어노테이터가 사용하는 표준 JSON 스키마

---

## 라이선스

SEE LICENSE IN LICENSE

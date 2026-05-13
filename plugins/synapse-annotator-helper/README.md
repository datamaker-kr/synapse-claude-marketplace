# synapse-annotator-helper

Synapse 어노테이터 데이터 임포트 헬퍼 플러그인. 어노테이션 type 별 1차 진입 **subagent** 가 raw 데이터를 dm_schema JSON 까지 자율 변환합니다. 명령어는 subagent 가 dispatch 하는 도구로 제공되며, 직접 호출/스크립팅 경로로도 사용할 수 있습니다.

> **라이선스**: SEE LICENSE IN LICENSE

## 개요

- **대상 사용자**: 백엔드 개발자, 데이터 엔지니어
- **설계 원칙**: type 별 1개의 1차 진입 subagent → 자연어 호출 → 워크플로우 자율 진행
- **공통/포맷 분리**: 트랙 설정(YAML) 과 스키마 검증은 공통, 파일 탐색·변환은 포맷별
- **1 프로젝트 = 1 YAML**: 프로젝트 단위로 track-config.yaml 을 확정 후 동일 YAML 로 다수의 raw 파일을 변환

**소속 조직**: [datamaker-kr](https://github.com/datamaker-kr)

## 지원 어노테이션 type

| Type | 상태 | 1차 진입 subagent | 보조 subagent | 도움말 |
|------|------|-------------------|----------------|--------|
| `time-series` | ✅ 지원 | `annotator-time-series` | `annotator-time-series-schema-debugger` | `/synapse-annotator-helper:time-series:help` |
| `image` | ⏳ 미지원 | — | — | — |
| `video` | ⏳ 미지원 | — | — | — |
| `3d` | ⏳ 미지원 | — | — | — |
| `text` | ⏳ 미지원 | — | — | — |
| `audio` | ⏳ 미지원 | — | — | — |

## 설치

### 사전 요구사항 (time-series type)

| 항목 | 확인 명령어 | 최소 버전 | 비고 |
|------|------------|-----------|------|
| Claude Code | `claude --version` | v2.1.0+ | — |
| Python | `python3 --version` | 3.10+ | 필수 |
| synapse-sdk | `synapse --version` | >= 2026.1.39 | PyPI 에서 설치 |
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
/plugin install synapse-annotator-helper@synapse-marketplace
```

---

## 빠른 시작 — time-series type

### 1) 권장: 자연어로 subagent 호출

`annotator-time-series` subagent 가 자동 활성화되어 4단계 워크플로우(inspect → config → convert → validate) 를 자율 진행합니다.

```
"ULG 변환 도와줘"
"비행 로그를 dm_schema 로 만들어줘"
"시계열 데이터 준비 도와줘"
```

검증 실패 등 정밀 진단이 필요한 경우 `annotator-time-series-schema-debugger` 보조 subagent 로 자동 위임됩니다.

### 2) 직접 명령어 호출 (스크립팅·반복 작업)

```bash
# 1. ULG 파일 구조 분석 (토픽, 필드, 샘플레이트 확인)
/synapse-annotator-helper:time-series:inspect-ulg

# 2. 고객 요구사항 기반 트랙 설정 YAML 생성
/synapse-annotator-helper:time-series:create-track-config

# 3. ULG → dm_schema JSON 변환
/synapse-annotator-helper:time-series:convert-ulg

# 4. 생성된 dm_schema JSON 검증
/synapse-annotator-helper:time-series:validate-schema
```

### 3) 보조 스킬 (subagent 미사용 시)

특정 키워드("시계열 데이터 준비", "ULG 변환" 등) 입력 시 `annotator-time-series-workflow` 스킬이 워크플로우를 안내합니다. subagent 가 활성화되면 subagent 가 우선 처리합니다.

---

## 명령어

### 전역

| 명령어 | 설명 |
|--------|------|
| `/synapse-annotator-helper:help` | 지원 어노테이션 type 및 subagent 안내 |

### time-series type

| 명령어 | 설명 |
|--------|------|
| `/synapse-annotator-helper:time-series:help` | time-series 워크플로우 도움말 |
| `/synapse-annotator-helper:time-series:inspect-ulg` | ULG 파일의 토픽/필드/샘플레이트 탐색 |
| `/synapse-annotator-helper:time-series:create-track-config` | 트랙 설정 YAML 생성 |
| `/synapse-annotator-helper:time-series:convert-ulg` | ULG → dm_schema JSON 변환 |
| `/synapse-annotator-helper:time-series:validate-schema` | dm_schema JSON 검증 |

---

## 스킬

| 스킬 | 트리거 키워드 | 역할 |
|------|---------------|------|
| **annotator-time-series-workflow** | "시계열 데이터 준비", "ULG 변환", "dm_schema 생성", "트랙 설정" | subagent 미사용 시 보조 트리거 |

---

## Subagent

| Subagent | 역할 |
|----------|------|
| **annotator-time-series** | ★ 1차 진입 subagent — ULG 탐색부터 스키마 검증까지 자율 실행 |
| **annotator-time-series-schema-debugger** | 보조 subagent — dm_schema 검증 오류를 자동 진단하고 수정 제안 |

---

## synapse-upload 연계

변환이 완료되면 확정된 `track-config.yaml` 을 synapse-upload 플러그인에 추가 데이터로 전달하여 업로드할 수 있습니다. YAML 파일은 프로젝트별로 1개만 유지하며, 동일 YAML 로 여러 ULG 파일을 일괄 변환할 수 있습니다.

---

## 어노테이션 type 추가하기

새로운 어노테이션 type 을 추가하려면:

1. **1차 진입 subagent 작성 (필수)**
   - 경로: `agents/<type>/annotator-<type>.md`
   - frontmatter `name: annotator-<type>` 필수 (식별자 충돌 방지)
   - description 에 type 의 자연어 트리거 키워드를 한·영 양쪽으로 명시

2. **결정적 도구 (선택)** — 스크립팅·반복 작업이 필요하면
   - 경로: `commands/<type>/<cmd>.md`
   - 사용자 호출 형식: `/synapse-annotator-helper:<type>:<cmd>`

3. **보조 스킬 (선택)** — 키워드 기반 트리거가 필요하면
   - 경로: `skills/<type>/<skill-name>/SKILL.md`
   - frontmatter `name: annotator-<type>-<purpose>` 컨벤션
   - 본문에 "subagent 가 활성화된 경우 subagent 가 우선" 안내 포함

4. **보조 subagent (선택)** — 좁은 책임의 디버깅/검증 등
   - 경로: `agents/<type>/annotator-<type>-<purpose>.md`
   - frontmatter `name: annotator-<type>-<purpose>`

5. **plugin.json 등록**
   - `commands`, `skills`, `agents` 배열에 해당 경로 추가

6. **type 도움말**
   - 권장: `/synapse-annotator-helper:<type>:help` 명령어로 type 워크플로우 요약 제공
   - 전역 `/synapse-annotator-helper:help` 의 지원 type 표에도 행 추가

### 네이밍 컨벤션 요약

| 자산 | 컨벤션 | 예시 |
|------|--------|------|
| 1차 진입 subagent | `annotator-<type>` | `annotator-time-series` |
| 보조 subagent | `annotator-<type>-<purpose>` | `annotator-time-series-schema-debugger` |
| 보조 스킬 | `annotator-<type>-<purpose>` | `annotator-time-series-workflow` |
| 명령어 (사용자 호출) | `/synapse-annotator-helper:<type>:<cmd>` | `/synapse-annotator-helper:time-series:inspect-ulg` |
| 디렉토리 | `commands\|skills\|agents/<type>/` | `commands/time-series/` |

---

## 핵심 개념

- **Subagent-first 하이브리드**: type 별 1개의 1차 진입 subagent 가 사용자 1차 인터페이스. 명령어는 subagent 가 dispatch 하는 도구로 유지 + 직접 호출 가능.
- **1 프로젝트 = 1 YAML**: 프로젝트 단위로 track-config.yaml 확정. 동일 설정으로 다수의 raw 파일을 변환.
- **공통/포맷 분리**: YAML 설계와 스키마 검증은 포맷에 무관한 공통 로직, 파일 탐색과 변환은 포맷별 전용 로직.
- **dm_schema**: Synapse 시계열 어노테이터가 사용하는 표준 JSON 스키마.

---

## 라이선스

SEE LICENSE IN LICENSE

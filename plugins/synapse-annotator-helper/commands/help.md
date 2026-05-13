---
description: synapse-annotator-helper 플러그인 전체 도움말 — 지원 어노테이션 type 및 subagent 사용법
allowed-tools: []
---

아래 도움말을 그대로 출력하세요. 도구를 사용하지 마세요.

# synapse-annotator-helper 도움말

Synapse 어노테이터의 데이터 임포트를 type 별로 자동화하는 헬퍼 플러그인.
어노테이션 type 마다 1개의 **1차 진입 subagent** 가 raw 데이터를 dm_schema JSON 까지 변환합니다.

## 지원 어노테이션 type

| Type | 상태 | 1차 진입 subagent | 보조 subagent | 직접 호출 도움말 |
|------|------|-------------------|----------------|------------------|
| `time-series` | ✅ 지원 | `annotator-time-series` | `annotator-time-series-schema-debugger` | `/synapse-annotator-helper:time-series:help` |
| `image` | ⏳ 미지원 | — | — | — |
| `video` | ⏳ 미지원 | — | — | — |
| `3d` | ⏳ 미지원 | — | — | — |
| `text` | ⏳ 미지원 | — | — | — |
| `audio` | ⏳ 미지원 | — | — | — |

## 사용 방법

### 1) 권장: 자연어로 subagent 호출

사용 사례에 맞는 type subagent 가 자동으로 활성화되어 워크플로우를 자율 진행합니다.

```
"ULG 변환 도와줘"            → annotator-time-series subagent
"시계열 데이터 준비"         → annotator-time-series subagent
"비행 로그를 dm_schema 로"   → annotator-time-series subagent
```

오류가 발생하면 보조 subagent (예: `annotator-time-series-schema-debugger`) 로 자동 위임됩니다.

### 2) 직접 명령어 호출 (스크립팅·반복 작업)

type 도움말로 각 type 의 워크플로우와 명령어 목록을 확인하세요.

```
/synapse-annotator-helper:time-series:help
```

### 3) 보조 스킬 (subagent 미사용 시)

특정 키워드("시계열 데이터 준비", "ULG 변환" 등) 입력 시 `annotator-time-series-workflow` 스킬이 활성화되어 4단계 워크플로우를 안내합니다. subagent 가 활성화된 경우 subagent 가 우선 처리합니다.

## 어노테이션 type 추가하기

새로운 type 을 추가하려면:

1. `agents/<type>/annotator-<type>.md` 작성 (1차 진입 subagent — **필수**)
2. (선택) `commands/<type>/<cmd>.md` 로 결정적 도구 추가
3. (선택) `skills/<type>/<name>/SKILL.md` 로 키워드 트리거 추가
4. (선택) 보조 subagent `agents/<type>/annotator-<type>-<purpose>.md`
5. 모든 subagent/skill `name` 은 `annotator-<type>-*` prefix 로 식별자 충돌 방지
6. `plugin.json` 의 `commands` / `skills` / `agents` 배열에 경로 등록

자세한 절차는 `plugins/synapse-annotator-helper/README.md` 의 "어노테이션 type 추가하기" 섹션을 참조하세요.

## 라이선스

SEE LICENSE IN LICENSE

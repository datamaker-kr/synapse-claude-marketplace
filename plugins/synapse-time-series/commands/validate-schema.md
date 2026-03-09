---
description: dm_schema JSON 파일이 시계열 어노테이터 스키마에 맞는지 검증합니다
argument-hint: [<json-path>] [--dir <directory>]
allowed-tools: ["Bash", "Read", "Write", "Glob", "AskUserQuestion"]
---

# dm_schema 검증 명령어

시계열 어노테이터가 기대하는 dm_schema JSON 형식에 맞는지 검증합니다. 위반 사항이 있으면 원인과 해결 방법을 안내하고, 자동 수정 가능한 오류는 사용자 승인 후 수정합니다.

## Interactive-First Design

**중요**: 이 명령어는 완전한 대화형으로 설계되었습니다. 사용자가 인자 없이 `/synapse-time-series:validate-schema`만 입력해도 동작해야 합니다. 인자가 없으면 `AskUserQuestion`으로 단계별로 안내하세요. 모든 인자를 미리 제공하면 대화 없이 바로 실행합니다.

## Arguments (모두 선택적 — 없으면 대화형으로 질문)

- `<json-path>`: 검증할 JSON 파일 경로 (위치 인자)
- `--dir <directory>`: JSON 파일이 있는 디렉토리 (일괄 검증)

## Workflow

### Step 1: 대상 파일 확인

인자로 파일 경로가 제공된 경우 해당 파일을 사용합니다.

`--dir`이 제공된 경우 해당 디렉토리의 모든 `.json` 파일을 대상으로 합니다.

둘 다 없으면 현재 디렉토리에서 `.json` 파일을 검색합니다:

```bash
find . -maxdepth 2 -name "*.json" -type f 2>/dev/null
```

검색 결과에 따라:

- **1개**: 해당 파일을 사용합니다.
- **여러 개**: `AskUserQuestion`으로 목록을 보여주고 선택하게 합니다:
  ```
  "검증할 JSON 파일을 선택하세요. 또는 '전체'를 선택하면 모든 파일을 검증합니다."
  ```
- **0개**: `AskUserQuestion`으로 경로를 직접 입력받습니다:
  ```
  "현재 디렉토리에서 JSON 파일을 찾을 수 없습니다. 검증할 JSON 파일의 전체 경로를 입력해주세요."
  ```

### Step 2: 검증 스크립트 준비

스킬 reference의 정본 스크립트(`references/validate_dm_schema.py`)를 임시 파일로 생성하여 실행합니다. **`tempfile.mkdtemp()` 등으로 고유 임시 디렉토리를 사용하세요** (고정 `/tmp/` 경로 사용 금지 — 경쟁 조건 방지).

**주의**: 검증 스크립트의 정본(canonical source)은 `skills/timeseries-data-pipeline/references/validate_dm_schema.py`입니다. 인라인 코드를 직접 작성하지 말고 반드시 정본을 복사하세요.

### Step 3: 검증 실행

대상에 따라 실행합니다:

**단일 파일:**
```bash
python3 <tmpdir>/validate_dm_schema.py "<json-path>"
```

**디렉토리 (일괄 검증):**
```bash
python3 <tmpdir>/validate_dm_schema.py --dir "<directory>"
```

### Step 4: 결과 보고

**통과 시** 요약 정보와 다음 단계를 보여줍니다:

```
## 검증 결과: 통과

| 항목 | 값 |
|------|-----|
| 파일 | output.json |
| 시간 | 342.5초 |
| 샘플 | 34,250개 @ 100Hz |
| 트랙 | 5개 |
| 채널 | 12개 |

## 다음 단계
  - 일괄 변환: /synapse-time-series:convert-ulg --input-dir ./raw/ --config track-config.yaml
  - 업로드: /synapse-upload:upload
```

**실패 시** 오류별 원인과 힌트를 표시하고, 자동 디버깅 에이전트를 안내합니다:

```
## 검증 결과: 3개 오류

| # | 위치 | 오류 | 힌트 |
|---|------|------|------|
| 1 | channelMeta.accel_x | channels에 존재하지만 channelMeta에 없음 | channelMeta에 항목 추가 필요 |
| 2 | meta.duration | startTime/endTime 차이와 불일치 | duration = (endTime - startTime) / 1000 |
| 3 | meta.nSamples | timestamps 길이와 불일치 | len(timestamps)로 재계산 필요 |

자동 수정이 필요하면: "스키마 오류 수정해줘" → synapse-schema-debugger 에이전트가 자동 진단 및 수정을 도와줍니다.
```

### Step 5: 자동 수정 제안

자동 수정 가능한 오류가 발견되면 `AskUserQuestion`으로 수정 여부를 묻습니다:

```
"다음 오류는 자동으로 수정할 수 있습니다:
1. channelMeta 누락 → channels 키에서 기본값으로 자동 생성
2. meta.duration 불일치 → (endTime - startTime) / 1000으로 재계산
3. meta.nSamples 불일치 → len(timestamps)로 재계산

자동 수정을 진행할까요?"
```

승인하면 Python 스크립트로 수정합니다. 자동 수정 로직(channelMeta 자동 생성, meta.duration/nSamples 재계산)을 임시 Python 스크립트로 작성하여 실행하세요. 복잡한 오류는 **synapse-schema-debugger 에이전트**로 위임합니다.

수정 후 다시 검증을 실행하여 통과 여부를 확인합니다.

## Error Handling

| 오류 | 조치 |
|------|------|
| JSON 파싱 오류 | 파일 내용이 유효한 JSON인지 확인 안내 |
| 파일 없음 | 경로 재확인 요청 |
| 빈 파일 | 유효한 dm_schema JSON이 아님을 안내 |
| 디렉토리에 JSON 없음 | 경로 재확인 또는 직접 파일 지정 요청 |
| 수정 스크립트 실행 오류 | 오류 내용 표시 후 수동 수정 방법 안내 |

## Flexibility Note

AI 어시스턴트로서 Bash와 Python에 완전한 접근 권한이 있습니다. 표준 검증으로 부족한 경우 **적응**하세요:
- 특정 필드만 선택적으로 검증
- 커스텀 검증 규칙 추가 (예: 특정 채널 필수 존재 확인)
- 여러 파일 간 일관성 검사 (동일 트랙 구조 등)
- 수정 전 백업 파일 생성
- 스키마 차이 비교 (두 JSON 파일의 구조 diff)

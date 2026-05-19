---
description: Generate changelog for the latest plugin release and update GitHub Release body
argument-hint: [--code <plugin-code>] [--version <version>] [--variant <variant>] [--lang <ko|en>]
allowed-tools: ["Bash", "Read", "Edit", "AskUserQuestion"]
---

# Generate Plugin Changelog

Publish 후 GitHub Release body에 이전 버전 대비 변경사항(Changelog)을 자동 생성합니다.
GitHub Compare API로 diff를 수집하고, Keep a Changelog 형식으로 정리하여 Release body를 업데이트합니다.

> **참조 skill**: `plugin-changelog` — Changelog 형식, 카테고리 분류 기준, variant 비교 규칙, Release body 구조 등 모든 컨벤션은 이 skill에 정의되어 있습니다. Changelog 생성 시 반드시 skill의 규칙을 따르세요.

**Arguments:** $ARGUMENTS

Parse the arguments above to extract `--code`, `--version`, `--variant`, and `--lang` values.

---

## Pre-Requisites

- `synapse plugin publish`가 완료된 상태여야 합니다 (GitHub Release가 존재해야 함).
- GitHub config가 설정되어 있어야 합니다 (`synapse plugin github-setup`).
- `gh` CLI가 인증되어 있어야 합니다.

---

## Workflow

### Step 1: 플러그인 정보 수집

인자가 제공되지 않은 경우, 현재 디렉토리의 `config.yaml`에서 플러그인 정보를 읽습니다.

1. `config.yaml` (또는 `synapse.yaml`) 파일을 찾아서 읽습니다.
2. 다음 필드를 추출합니다:
   - `code`: 플러그인 코드 (e.g., `sam2-smart-tool`)
   - `version`: 현재 버전 (e.g., `2.0.8`)
   - `variant`: variant 태그 (e.g., `lig`), 없으면 null
   - `name`: 플러그인 이름
3. `--code`, `--version`, `--variant` 인자가 있으면 해당 값을 우선 사용합니다.
4. `--lang`이 없으면 기본값 `ko` (한국어) 사용.

```bash
# config.yaml 파싱 예시
cat config.yaml | grep -E "^(code|version|variant|name):"
```

### Step 2: GitHub 설정 확인

1. GitHub org를 확인합니다:
   ```bash
   # 환경변수 우선
   echo $SYNAPSE_GITHUB_ORG

   # 없으면 config 파일에서 읽기
   cat ~/.synapse/config.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('github',{}).get('org',''))"
   ```

2. org가 비어있으면 중단:
   > GitHub 설정이 없습니다. `synapse plugin github-setup`을 먼저 실행하세요.

3. `gh auth status`로 인증 상태 확인.

### Step 3: 현재 태그 결정 및 Release 확인

1. 태그 결정:
   - variant 있음: `{version}+{variant}` (e.g., `2.0.8+lig`)
   - variant 없음: `{version}` (e.g., `2.0.8`)

2. **URL 인코딩 주의**: 태그에 `+`가 포함된 경우, `gh api` 호출 시 `+`를 `%2B`로 인코딩해야 합니다.
   ```bash
   # 예: 2.0.8+lig → 2.0.8%2Blig
   ENCODED_TAG=$(echo "$TAG" | sed 's/+/%2B/g')
   ```

3. 현재 Release가 존재하는지 확인:
   ```bash
   gh api repos/{org}/{code}/releases/tags/{ENCODED_TAG} --jq '.id' 2>/dev/null
   ```

3. Release가 없으면 중단:
   > Release `{tag}`가 존재하지 않습니다. 먼저 `synapse plugin publish`를 실행하세요.

### Step 4: 이전 태그 탐색

1. 해당 repo의 전체 릴리스 목록을 가져옵니다:
   ```bash
   gh api repos/{org}/{code}/releases --jq '.[].tag_name'
   ```

2. 같은 variant의 태그만 필터링합니다:
   - **variant 있음**: `+{variant}`로 끝나는 태그만 선택
   - **variant 없음**: `+`를 포함하지 않는 태그만 선택

3. 현재 태그를 제외하고, 나머지 중 가장 최근 태그를 이전 태그로 선택합니다.
   (릴리스 API 응답은 기본적으로 최신순 정렬)

4. 이전 태그가 없으면 → **"첫 릴리스" 모드**로 전환합니다.

### Step 5: Diff 수집

#### 일반 모드 (이전 태그 존재)

GitHub Compare API로 두 태그 사이의 변경사항을 수집합니다.
**주의**: 태그에 `+`가 포함된 경우 `%2B`로 인코딩하여 호출합니다.

```bash
gh api repos/{org}/{code}/compare/{encoded_prev_tag}...{encoded_current_tag} \
  --jq '{
    total_commits: .total_commits,
    files: [.files[] | {filename, status, additions, deletions, patch}]
  }'
```

**주의**: diff가 매우 클 경우 (파일 100개 이상), patch 내용은 생략하고 파일 목록과 status만 사용합니다.

```bash
# 파일 요약만 (diff가 큰 경우)
gh api repos/{org}/{code}/compare/{prev_tag}...{current_tag} \
  --jq '{
    total_commits: .total_commits,
    files: [.files[] | {filename, status, additions, deletions}]
  }'
```

#### 첫 릴리스 모드 (이전 태그 없음)

현재 태그의 커밋이 가리키는 tree의 파일 목록을 가져옵니다:

```bash
# 태그의 커밋 SHA 가져오기
COMMIT_SHA=$(gh api repos/{org}/{code}/git/ref/tags/{current_tag} --jq '.object.sha')

# 파일 목록 가져오기
gh api repos/{org}/{code}/git/trees/$COMMIT_SHA?recursive=1 \
  --jq '[.tree[] | select(.type=="blob") | .path]'
```

### Step 6: Changelog 생성

수집한 diff 정보를 분석하여 Keep a Changelog 형식으로 정리합니다.

**분류 기준:**
- **Added**: 새 파일 추가, 새 함수/클래스/기능 추가
- **Changed**: 기존 파일 수정, 로직 변경, 리팩터링, 성능 개선
- **Fixed**: 버그 수정, 에러 처리 개선
- **Removed**: 파일/함수/기능 삭제

**작성 규칙:**
- `--lang ko` (기본): 한국어로 작성
- `--lang en`: 영어로 작성
- 각 항목은 한 줄로 간결하게 (무엇이 바뀌었는지 중심)
- 파일명이나 코드 요소는 backtick으로 감싸기
- 기술적 세부사항보다 **사용자 관점의 변경 효과**를 설명

**출력 형식:**

```markdown
### Changelog (from v{prev_version})

#### Added
- 새로운 전처리 액션 `preprocess` 추가
- `config.yaml`에 `serve_options` 설정 지원

#### Changed
- 추론 속도 개선 (배치 처리 방식 변경)
- 모델 로딩 로직을 lazy loading으로 전환

#### Fixed
- GPU 메모리 누수 수정
```

첫 릴리스인 경우:
```markdown
### Changelog (Initial Release)

#### Added
- `train` 액션: 모델 학습 기능
- `infer` 액션: 추론 기능
- `config.yaml`: 플러그인 설정 파일
- `requirements.txt`: Python 의존성 정의
```

### Step 7: 미리보기 및 승인

생성된 changelog를 사용자에게 보여주고 승인을 받습니다.

```
╔══════════════════════════════════════════════════╗
║           CHANGELOG PREVIEW                      ║
╠══════════════════════════════════════════════════╣
║ Plugin: {code}                                   ║
║ Version: {prev_tag} → {current_tag}              ║
╚══════════════════════════════════════════════════╝
```

그 다음 생성된 changelog 마크다운을 표시합니다.

AskUserQuestion으로 확인합니다:
- **적용**: Release body에 바로 업데이트
- **수정**: 사용자가 내용을 수정한 후 재적용
- **취소**: 적용하지 않음

### Step 8: GitHub Release Body 업데이트

1. 현재 Release body를 가져옵니다:
   ```bash
   gh api repos/{org}/{code}/releases/tags/{tag} --jq '.body'
   ```

2. 기존 body에서 `### Plugin Info` 앞에 changelog 섹션을 삽입합니다.
   - 기존에 `### Changelog` 섹션이 있으면 교체합니다.
   - 없으면 `### Plugin Info` 바로 앞에 삽입합니다.

3. Release body를 업데이트합니다:
   ```bash
   gh api repos/{org}/{code}/releases/{release_id} \
     -X PATCH \
     -f body="{updated_body}"
   ```

4. 완료 메시지:
   ```
   ✓ Changelog가 Release body에 반영되었습니다.
     https://github.com/{org}/{code}/releases/tag/{tag}
   ```

---

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--code` | 플러그인 코드 | config.yaml에서 읽기 |
| `--version` | 대상 버전 | config.yaml에서 읽기 |
| `--variant` | variant 태그 | config.yaml에서 읽기 |
| `--lang` | changelog 언어 (ko/en) | ko |

---

## Error Handling

**config.yaml을 찾을 수 없음:**
```
✗ config.yaml을 찾을 수 없습니다.
  --code와 --version 인자를 직접 지정하세요.
```

**GitHub 설정 없음:**
```
✗ GitHub 설정이 없습니다.
  synapse plugin github-setup을 먼저 실행하세요.
```

**Release가 존재하지 않음:**
```
✗ Release '{tag}'가 GitHub에 존재하지 않습니다.
  synapse plugin publish를 먼저 실행하세요.
```

**비교할 이전 버전 없음 (첫 릴리스):**
```
ℹ 이전 릴리스가 없습니다. Initial Release로 changelog를 생성합니다.
```

---

## Examples

```bash
# 기본 사용 (config.yaml 자동 감지, 한국어)
/synapse-plugin-helper:add-changelog

# 영어로 생성
/synapse-plugin-helper:add-changelog --lang en

# 특정 플러그인 지정
/synapse-plugin-helper:add-changelog --code sam2-smart-tool --version 2.0.8

# variant 플러그인
/synapse-plugin-helper:add-changelog --code sam2-smart-tool --version 2.0.8 --variant lig
```

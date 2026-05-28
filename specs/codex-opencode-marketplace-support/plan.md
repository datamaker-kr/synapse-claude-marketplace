# Codex 및 OpenCode 지원을 위한 Marketplace 전환 계획

## 개요

현재 저장소는 Claude Code 플러그인 marketplace 구조를 기준으로 작성되어 있다. 목표는 기존 Claude Code 설치 경험을 유지하면서 Codex에서도 플러그인별로 설치해 활용할 수 있게 만들고, 이후 OpenCode 같은 다른 agent 환경도 지원할 수 있는 공통 원본 구조를 마련하는 것이다.

핵심 방향은 다음과 같다.

- 현재 `plugins/*` 단위를 유지해 플러그인별 설치를 지원한다.
- 플랫폼별 manifest를 직접 관리하지 않고, 공통 원본 manifest에서 생성한다.
- 생성된 플랫폼별 산출물은 git에 커밋해 사용자가 별도 빌드 없이 설치할 수 있게 한다.
- Claude slash command는 Codex에서 `skills/*/SKILL.md` 형태로 변환해 노출한다.
- OpenCode는 우선 adapter 산출물을 제공해 `.opencode` 기반 사용 가능성을 연다.

## 현재 상태

저장소는 루트 `.claude-plugin/marketplace.json`을 marketplace 인덱스로 사용하고, 실제 플러그인은 `plugins/<plugin>/` 아래에 위치한다.

현재 플러그인 구성은 다음과 같다.

| 플러그인 | commands | skills | agents |
| --- | ---: | ---: | ---: |
| `platform-dev-team-common` | 5 | 7 | 3 |
| `sdd-helper` | 0 | 6 | 1 |
| `speckit-helper` | 11 | 4 | 2 |
| `synapse-applications` | 0 | 1 | 0 |
| `synapse-export` | 3 | 1 | 1 |
| `synapse-plugin-helper` | 10 | 7 | 2 |
| `synapse-upload` | 3 | 2 | 1 |

Codex는 `.codex-plugin/plugin.json`과 `skills/` 디렉터리 중심의 구조를 사용한다. Codex manifest 검증 기준에서 Claude의 `commands`와 `agents` 필드는 허용되지 않으므로, 기존 `plugin.json`을 그대로 재사용할 수 없다.

OpenCode는 marketplace manifest보다 프로젝트 또는 사용자 설정의 `.opencode/commands`, `.opencode/skills`, `.opencode/agent` 계열 구성이 중요하므로 별도 adapter 산출물이 필요하다.

## 목표 구조

### 공통 원본 manifest

각 플러그인에 공통 원본 manifest를 추가한다.

```text
plugins/<plugin>/agent-plugin.yaml
```

공통 manifest는 다음 정보를 가진다.

- 기본 메타데이터: `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `category`
- 리소스 목록: `commands`, `skills`, `agents`, `mcp_servers`
- 제품 표시 정보: `display_name`, `short_description`, `long_description`, `capabilities`
- 플랫폼별 override: `targets.claude`, `targets.codex`, `targets.opencode`

`plugins/<plugin>/plugin.json`은 Claude Code 산출물로 유지하되, 장기적으로는 `agent-plugin.yaml`에서 생성된 파일로 취급한다.

### Claude Code 산출물

기존 구조를 유지한다.

```text
.claude-plugin/marketplace.json
plugins/<plugin>/plugin.json
plugins/<plugin>/commands/*.md
plugins/<plugin>/skills/*/SKILL.md
plugins/<plugin>/agents/*
```

Claude Code 사용자의 기존 설치 명령과 slash command 이름이 깨지지 않아야 한다.

### Codex 산출물

각 플러그인 루트에 Codex manifest를 추가한다.

```text
plugins/<plugin>/.codex-plugin/plugin.json
```

Codex manifest는 다음 원칙을 따른다.

- `skills`는 `./skills/`를 가리킨다.
- `commands`, `agents` 같은 Claude 전용 필드는 포함하지 않는다.
- `interface` 필드는 Codex 검증 기준에 맞게 채운다.
- 기존 skill은 가능한 한 그대로 재사용한다.
- Claude command는 Codex 전용 command-derived skill로 변환한다.

Claude command 변환 예시는 다음과 같다.

```text
plugins/<plugin>/commands/upload.md
-> plugins/<plugin>/skills/upload-command/SKILL.md
```

변환된 skill은 다음 규칙을 따른다.

- frontmatter에 `name`, `description`을 포함한다.
- 본문에는 원본 command의 목적, 입력 방식, 실행 절차를 유지한다.
- Claude 전용 도구명인 `Read`, `Write`, `Edit`, `AskUserQuestion`, `TodoWrite` 등은 Codex가 이해할 수 있는 일반 지침으로 바꾼다.
- `$ARGUMENTS` 같은 slash command 변수는 "사용자 요청 본문 또는 명시 인자"로 표현한다.

Codex marketplace 파일은 다음 위치에 추가한다.

```text
.agents/plugins/marketplace.json
```

각 entry는 다음 형태를 기본으로 한다.

```json
{
  "name": "<plugin>",
  "source": {
    "source": "local",
    "path": "./plugins/<plugin>"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "<category>"
}
```

### OpenCode 산출물

OpenCode용 산출물은 `dist/opencode/<plugin>/` 아래 생성한다.

```text
dist/opencode/<plugin>/.opencode/skills/<skill>/SKILL.md
dist/opencode/<plugin>/.opencode/commands/<command>.md
dist/opencode/<plugin>/.opencode/agent/<agent>.md
```

OpenCode adapter는 다음 원칙을 따른다.

- 원본 skill과 command의 의미를 유지한다.
- Claude Code 전용 frontmatter 필드는 OpenCode에서 의미 있는 필드로 매핑하거나 제거한다.
- agent 산출물은 모델명, 색상, Claude 도구명 같은 호스트별 값을 최소화한다.
- OpenCode 설치 방식은 초기에는 문서 기반으로 제공하고, native marketplace 여부는 후속 검토한다.

## 구현 단계

### 1. 공통 manifest 도입

- 각 `plugins/<plugin>/agent-plugin.yaml`을 작성한다.
- 기존 `plugin.json`과 `.claude-plugin/marketplace.json`의 메타데이터를 공통 manifest로 이전한다.
- `synapse-applications`처럼 marketplace version과 plugin version이 다른 항목을 정리한다.
- 루트 README의 플러그인 버전 표기가 실제 plugin version과 일치하는지 점검한다.

### 2. 생성 도구 추가

다음 도구를 추가한다.

```text
tools/generate-agent-marketplaces.py
tools/validate-agent-marketplaces.py
```

`generate-agent-marketplaces.py`는 다음 산출물을 생성한다.

- `.claude-plugin/marketplace.json`
- `plugins/<plugin>/plugin.json`
- `.agents/plugins/marketplace.json`
- `plugins/<plugin>/.codex-plugin/plugin.json`
- `plugins/<plugin>/skills/*-command/SKILL.md`
- `dist/opencode/<plugin>/.opencode/**`

`--check` 옵션을 제공해 생성 산출물이 최신인지 CI에서 확인할 수 있게 한다.

`validate-agent-marketplaces.py`는 다음을 검증한다.

- 공통 manifest schema가 올바른지
- 선언된 `commands`, `skills`, `agents` 경로가 실제 파일과 일치하는지
- Codex manifest가 허용 필드만 사용하는지
- command-derived skill에 필수 frontmatter가 있는지
- OpenCode adapter 산출물의 경로와 이름 규칙이 맞는지

### 3. Codex 지원 추가

- 각 플러그인에 `.codex-plugin/plugin.json`을 생성한다.
- 기존 `skills/*/SKILL.md`가 Codex skill 규칙을 만족하는지 검증한다.
- `commands/*.md`를 `skills/*-command/SKILL.md`로 변환한다.
- Codex marketplace 파일 `.agents/plugins/marketplace.json`을 생성한다.
- Codex 설치 안내를 루트 README와 각 플러그인 README에 추가한다.

### 4. OpenCode adapter 추가

- `dist/opencode/<plugin>/.opencode` 구조를 생성한다.
- command, skill, agent 변환 규칙을 generator에 구현한다.
- OpenCode 사용 안내를 문서에 추가한다.
- OpenCode native marketplace 배포는 이번 단계의 필수 범위에서 제외하고 후속 과제로 남긴다.

### 5. 문서 갱신

다음 문서를 갱신한다.

- `README.md`: Claude Code, Codex, OpenCode 설치 및 사용 섹션 분리
- `docs/CONTRIBUTING.md`: 공통 manifest 수정 후 generator 실행 방식 추가
- `AGENTS.md`: 플랫폼별 산출물 관리 규칙과 버전 관리 규칙 추가
- `CHANGELOG.md`: Codex/OpenCode 지원 준비 항목 추가
- 각 플러그인 `README.md`: Codex 설치 방법과 지원 범위 추가

## 검증 계획

기본 검증 명령은 다음과 같다.

```bash
python tools/validate-agent-marketplaces.py
python tools/generate-agent-marketplaces.py --check
```

Claude Code 검증:

- `.claude-plugin/marketplace.json`이 기존 구조와 호환되는지 확인한다.
- `plugins/<plugin>/plugin.json`의 `commands`, `skills`, `agents` 목록이 실제 파일과 일치하는지 확인한다.
- 기존 slash command 이름이 변경되지 않았는지 확인한다.

Codex 검증:

- 모든 `plugins/<plugin>/.codex-plugin/plugin.json`이 Codex manifest 규칙을 만족하는지 확인한다.
- `.agents/plugins/marketplace.json`의 `source.path`가 실제 플러그인 디렉터리를 가리키는지 확인한다.
- command-derived skill의 `name`, `description` frontmatter가 유효한지 확인한다.
- Codex에서 플러그인별 설치가 가능한지 수동 확인한다.

OpenCode 검증:

- `dist/opencode/<plugin>/.opencode/skills` 아래 skill 구조가 올바른지 확인한다.
- command adapter가 원본 command의 목적과 절차를 보존하는지 확인한다.
- Claude 전용 도구명과 모델명이 OpenCode 산출물에 그대로 남지 않았는지 확인한다.

## 범위와 비범위

이번 계획의 범위:

- agent-neutral 공통 manifest 설계 및 도입
- Claude Code 기존 구조 유지
- Codex 설치 가능 구조 추가
- Codex용 command-to-skill 변환
- OpenCode adapter 산출물 생성
- generator, validator, 문서 갱신

이번 계획의 비범위:

- OpenCode native marketplace 배포 자동화
- 각 command workflow의 기능 재설계
- Synapse SDK 자체 기능 변경
- Claude Code slash command 이름 변경

## 가정

- 기존 Claude Code 사용자는 현재 설치 명령과 slash command를 계속 사용할 수 있어야 한다.
- Codex는 우선 skill 중심으로 지원한다.
- OpenCode는 초기에는 adapter 산출물과 문서화된 설치 방식으로 지원한다.
- 플랫폼별 산출물은 생성 파일이지만 git에 커밋한다.
- 공통 manifest와 원본 markdown이 사람이 수정하는 주요 소스가 된다.

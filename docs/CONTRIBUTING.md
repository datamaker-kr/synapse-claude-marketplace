# 기여 가이드

Synapse Plugin Marketplace에 기여해 주셔서 감사합니다. 이 문서는 기존 플러그인 개선과 새 플러그인 추가에 대한 가이드를 제공합니다.

## 기여 개요

이 마켓플레이스는 Synapse 제품군 개발을 위한 Claude Code 플러그인의 중앙 등록소입니다. 버그 수정, 기능 개선, 새 플러그인 추가 등 모든 형태의 기여를 환영합니다.

---

## 기존 플러그인 기여

### 버그 리포트

1. [GitHub Issues](https://github.com/datamaker-kr/synapse-claude-marketplace/issues)에 이슈를 생성합니다.
2. 다음 정보를 포함해 주세요:
   - 사용한 플러그인 이름과 버전
   - 재현 단계
   - 예상 동작 vs 실제 동작
   - 관련 에러 메시지

### 기능 개선 제안

1. GitHub Issues에 `enhancement` 라벨로 이슈를 생성합니다.
2. 변경의 목적과 기대 효과를 설명합니다.

### PR 작성

1. `main` 브랜치에서 기능 브랜치를 생성합니다.
2. 변경을 커밋합니다. 커밋 메시지 규칙은 [AGENTS.md](../AGENTS.md)의 "Commit & Pull Request Guidelines"를 참조하세요.
3. PR에는 다음을 포함합니다:
   - 변경 요약
   - 관련 이슈 링크 (있는 경우)
   - 실행한 명령어/테스트
4. 커맨드 동작을 변경한 경우, 해당 플러그인의 `README.md`와 `commands/` 파일도 함께 업데이트합니다.

### 코드 스타일

[AGENTS.md](../AGENTS.md)의 "Coding Style & Naming Conventions"를 따릅니다:

- Markdown이 주 형식이며, 커맨드 파일은 YAML frontmatter를 상단에 배치합니다.
- 플러그인 코드와 폴더명은 kebab-case를 사용합니다 (예: `my-plugin`).
- YAML 예시는 2-space 들여쓰기를 사용합니다.

---

## 새 플러그인 추가 가이드

### 디렉토리 구조

새 플러그인은 `plugins/<plugin-name>/` 디렉토리에 다음 구조로 생성합니다:

```
plugins/<plugin-name>/
├── plugin.json              # 플러그인 메타데이터 (필수)
├── README.md                # 플러그인 사용 설명서 (필수)
├── commands/                # 슬래시 명령어 (선택)
│   ├── help.md
│   └── <command>.md
├── skills/                  # 스킬 모듈 (선택)
│   └── <skill-name>/
│       └── SKILL.md
└── agents/                  # 에이전트 플레이북 (선택)
    └── <agent-name>.md
```

### plugin.json 작성

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "플러그인에 대한 한 줄 설명",
  "author": {
    "name": "datamaker-kr Organization"
  },
  "homepage": "https://github.com/datamaker-kr/synapse-claude-marketplace",
  "repository": "https://github.com/datamaker-kr/synapse-claude-marketplace.git",
  "license": "SEE LICENSE IN LICENSE",
  "keywords": ["관련", "키워드"],
  "commands": [
    "./commands/help.md"
  ],
  "skills": [
    "./skills/my-skill/SKILL.md"
  ],
  "agents": [
    "./agents/my-agent.md"
  ]
}
```

**주의**: `commands`, `skills`, `agents` 목록은 실제 파일 경로와 정확히 일치해야 합니다.

### 커맨드 파일 규칙

커맨드 파일(`commands/*.md`)은 YAML frontmatter를 상단에 포함합니다:

```yaml
---
description: 커맨드에 대한 간결한 설명
argument-hint: [--option <value>]
allowed-tools: ["Bash", "Read", "Glob", "Grep", "AskUserQuestion"]
---
```

### 스킬 파일 규칙

스킬 파일(`skills/<name>/SKILL.md`)은 YAML frontmatter로 트리거 조건을 정의합니다:

```yaml
---
name: my-skill-name
description: >
  Use when user mentions "keyword1", "keyword2", "keyword3".
---
```

### 에이전트 파일 규칙

에이전트 파일(`agents/<name>.md`)은 YAML frontmatter로 활성화 조건을 정의합니다:

```yaml
---
name: my-agent-name
description: >
  Use when user wants to perform a specific task.
model: sonnet
color: blue
allowed-tools: ["Read", "Bash", "Glob", "Grep", "AskUserQuestion"]
---
```

### README.md 필수 섹션

모든 플러그인의 README.md는 다음 섹션을 포함해야 합니다:

1. **제목 및 한 줄 설명**
2. **개요** — 기능 요약
3. **설치** — 사전 요구사항 테이블 + 마켓플레이스 설치 명령어
4. **명령어** — 각 명령어별 설명 및 사용법
5. **스킬** — 트리거 키워드 포함
6. **에이전트** — 역할 설명
7. **빠른 시작** — 대표 사용 시나리오
8. **라이선스**

문서는 한글로 작성합니다 (코드 예시, 명령어, 변수명 제외).

### 루트 README.md 등록

새 플러그인을 추가한 후 반드시 다음을 업데이트합니다:

1. 루트 `README.md`의 "사용 가능한 플러그인" 테이블에 항목 추가
2. 플러그인 상세 섹션 추가 (명령어, 스킬, 에이전트 테이블)
3. "빠른 시작" 섹션에 설치 명령어 추가

### 네이밍 컨벤션

- 플러그인 코드: kebab-case (예: `synapse-export`, `sdd-helper`)
- 폴더명: kebab-case
- 커맨드명: kebab-case (예: `export-status.md`)
- 스킬명: kebab-case (예: `export-workflow`)

---

## 리뷰 프로세스

PR 제출 시 다음 사항을 확인합니다:

- [ ] `plugin.json`의 파일 목록이 실제 파일과 일치하는가
- [ ] README.md 필수 섹션이 모두 포함되어 있는가
- [ ] 루트 README.md가 업데이트되었는가 (새 플러그인의 경우)
- [ ] 한글 문서 규칙을 따르는가
- [ ] 민감 정보(토큰, 비밀번호)가 포함되지 않았는가
- [ ] 기존 플러그인의 동작이 변경된 경우 해당 문서가 업데이트되었는가

---

## 로컬 테스트

플러그인을 로컬에서 테스트하려면:

```bash
# 마켓플레이스 루트에서 실행
claude --plugin-dir .

# 또는 특정 플러그인 디렉토리에서
cd plugins/<plugin-name>
claude --plugin-dir .
```

자동화된 테스트 스위트는 없으므로, 관련 슬래시 명령어를 직접 실행하여 출력을 검증합니다.

---

## 참고

- [AGENTS.md](../AGENTS.md) — 코딩 스타일, 커밋 규칙, 보안 가이드
- [README.md](../README.md) — 마켓플레이스 개요 및 전체 플러그인 목록

# Repository Guidelines

## Project Structure & Module Organization
- `.claude-plugin/plugin.json` defines plugin metadata used by Claude Code.
- `commands/` contains slash-command specs (`*.md`) with YAML frontmatter and step-by-step workflows.
- `skills/` holds skill modules; each `skills/<skill>/SKILL.md` may link to `skills/<skill>/references/`.
- `agents/` provides autonomous agent playbooks invoked by the plugin.
- `docs/claude-code-docs/` stores supporting documentation used for onboarding and reference.

## Build, Test, and Development Commands
- `claude --plugin-dir .` runs this plugin locally in Claude Code for manual verification.
- `/synapse-plugin:help` prints the available commands and requirements.
- `/synapse-plugin:create --name <name> --code <code> --category <type>` scaffolds a new Synapse plugin.
- `/synapse-plugin:test <action> --params '{"key": "value"}'` runs a plugin action locally.
- `/synapse-plugin:update-config` syncs action metadata into config.yaml.
- `/synapse-plugin:dry-run` validates `config.yaml`, entrypoints, and dependencies before publish.
- `/synapse-plugin:publish` publishes the plugin (requires `synapse login`).
- Install prerequisites as needed: `uv pip install synapse-sdk` (or `pip install synapse-sdk`).

## Coding Style & Naming Conventions
- Markdown is the primary format; keep YAML frontmatter at the top of command files.
- Use kebab-case for plugin codes and folder names (e.g., `my-plugin`).
- Keep instructions direct and deterministic; prefer numbered steps and fenced code blocks for commands.
- Use 2-space indentation in YAML examples and align tables for readability.

## Testing Guidelines
- There is no automated test suite in this repo.
- Validate changes by running the relevant slash command in Claude Code and verifying outputs.
- For release readiness, run `/synapse-plugin:dry-run` and at least one `/synapse-plugin:test`.

## Commit & Pull Request Guidelines
- No Git history is available here; use short, imperative messages (e.g., `docs: update dry-run steps`).
- PRs should include: a brief summary, related issue link (if any), and commands run.
- If you change command behavior, update `README.md` and the corresponding file in `commands/`.

## Plugin Documentation Requirements
- 모든 플러그인은 `plugins/<name>/README.md`를 반드시 포함해야 합니다.
- README 필수 섹션: 개요, 설치(사전 요구사항 테이블), 명령어, 스킬, 에이전트, 빠른 시작, 라이선스.
- 새 플러그인 추가 시 루트 `README.md`의 "사용 가능한 플러그인" 테이블에 반드시 등록해야 합니다.
- 문서는 한글로 작성합니다 (코드 예시, 명령어, 변수명 제외).
- `plugin.json`의 `commands`, `skills`, `agents` 목록은 실제 파일과 일치해야 합니다.
- 기여 가이드: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)를 참조하세요.

## Plugin Version Management

Claude Code의 플러그인 업데이트 트리거는 다음 우선순위로 결정됩니다 (공식 문서 [Version management](https://code.claude.com/docs/en/plugins-reference#version-management)):

1. `plugins/<plugin>/plugin.json`의 `version` (있으면 이것만 사용)
2. `.claude-plugin/marketplace.json`의 `plugins[].version` (1번 fallback)
3. git commit SHA (1·2번 모두 없을 때 fallback)

> ⚠️ `plugin.json`에 `version`이 명시돼 있으면 **반드시 매 변경마다 bump**해야 사용자에게 업데이트가 적용됩니다. 커밋만 푸시하는 것으로는 업데이트되지 않습니다 (캐시된 동일 버전 유지).

### 각 위치 의미와 갱신 규칙

| 위치 | 역할 | 신규 플러그인 추가 | 기존 플러그인 코드 변경 |
|------|------|-------------------|-------------------------|
| `plugins/<plugin>/plugin.json` `version` | **플러그인 자체 버전 (update trigger 1순위)** | ✅ 필수 (예: `1.0.0`) | ✅ **필수 bump** |
| `.claude-plugin/marketplace.json` `plugins[].version` | 마켓플레이스 엔트리의 fallback 버전 | ✅ 위와 동일 값으로 등록 | ⚠️ 권장 (위와 동기화) |
| `.claude-plugin/marketplace.json` `metadata.version` | **마켓플레이스 카탈로그 자체** 버전 (플러그인 업데이트와 무관) | ✅ minor bump (카탈로그 변경) | ❌ 불필요 |
| `.claude-plugin/plugin.json` `version` | 마켓플레이스 자체의 plugin.json (Claude Code update detection 비사용) | ❌ 불필요 | ❌ 불필요 |

### SemVer 가이드

- **Major** (X.0.0): 기존 명령/스킬/에이전트의 인터페이스 breaking change
- **Minor** (X.Y.0): 하위 호환되는 기능 추가, 새 명령/스킬/에이전트 추가
- **Patch** (X.Y.Z): 버그 수정, 문서 보완, 내부 리팩토링

### 체크리스트 (변경 종류별)

**신규 플러그인 추가 시**
- [ ] `plugins/<plugin>/plugin.json`에 `"version": "1.0.0"` 명시
- [ ] `.claude-plugin/marketplace.json`의 `plugins[]`에 동일 `version` 등록
- [ ] `.claude-plugin/marketplace.json`의 `metadata.version` minor bump
- [ ] 루트 `README.md`·`CHANGELOG.md`에 등록

**기존 플러그인 코드/문서 변경 시**
- [ ] **`plugins/<plugin>/plugin.json`의 `version` bump** (필수)
- [ ] `.claude-plugin/marketplace.json`의 해당 `plugins[].version` 동기화 (권장)
- [ ] `CHANGELOG.md` Unreleased 항목 추가
- [ ] `metadata.version` 및 `.claude-plugin/plugin.json`은 손대지 않음

## Security & Configuration Tips
- Do not commit secrets; reference env vars in examples (`SYNAPSE_TOKEN`) instead.
- Keep `plugin.json` metadata accurate and avoid introducing local paths or credentials.

# Changelog

이 문서는 Synapse Plugin Marketplace의 모든 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 사용합니다.

## [Unreleased] - yyyy-mm-dd

### Added

- Codex 및 OpenCode 지원을 위한 agent-neutral marketplace 구조 추가
  - 루트 `.agent-marketplace.yaml`과 각 `plugins/<plugin>/agent-plugin.yaml`을 공통 원본 manifest로 도입.
  - `tools/generate-agent-marketplaces.py` 추가 — Claude Code, Codex, OpenCode 산출물을 공통 manifest에서 재생성.
  - `tools/validate-agent-marketplaces.py` 추가 — manifest schema, 선언 파일, Codex manifest, command-derived skill, OpenCode adapter 검증.
  - `.agents/plugins/marketplace.json` Codex marketplace 생성.
  - 각 플러그인에 `.codex-plugin/plugin.json` 생성.
  - Claude slash command를 Codex용 `skills/*-command/SKILL.md`로 변환.
  - `dist/opencode/<plugin>/.opencode/` adapter 생성.
  - `specs/codex-opencode-marketplace-support/plan.md` 구현 계획 문서 추가.
- `sdd-helper` 플러그인 1.1.0으로 확장 — 난이도 기반 파이프라인 분기 + Jira MCP 연동 (SYN-6873)
  - **신규 스킬 `/plan-with-requirements`** — lite 파이프라인. `low` 난이도 작업에서 `requirements.md` → `plans.md`로 직행 (specs.md 단계 건너뜀).
  - **신규 스킬 `/sync-to-jira`** — 완성된 `specs.md` / `plans.md`를 Jira 이슈 description으로 push-back. `<!-- sdd:start --> ~ <!-- sdd:end -->` 마커 사이만 교체하므로 사람이 직접 작성한 description은 보존됨. `--target spec|plan|both`, `--field description|customfield_<id>` 옵션 지원.
  - **`/init-specs` 확장** — `--difficulty low|medium|high`, `--pipeline lite|full`, `--no-jira` 플래그 추가. Jira MCP가 가용하고 ticket ID가 주어지면 `jira_get_ticket`으로 summary/description/AC를 가져와 `requirements.md` 초안을 자동 작성. `priority` / `labels` 휴리스틱으로 난이도 추론 가능.
  - **`/specify-with-requirements` 확장** — lite로 시작한 슬러그에서 호출 시 lite→full 승격 흐름 추가 (사용자 확인 → specs.md 생성 → 기존 plans.md를 `Stale (specs added)`로 마킹).
  - **`/update-requirements` 확장** — `Pipeline:` 헤더를 인식해 lite에서는 specs cascade 단계를 자동 건너뜀.
  - **`requirements.md` 헤더 확장** — `Difficulty`, `Pipeline`, `Source` 필드 추가.
  - **`spec-manager` 에이전트 갱신** — lite/full 5단계 오케스트레이터 (Initialize → Specify → Plan → Update → Sync).
- `sdd-helper` 플러그인 추가 (v1.0.0)
  - 4개 스킬: init-specs, specify-with-requirements, plan-with-specs, update-requirements
  - 1개 에이전트: spec-manager
  - Spec-Driven Development 경량 워크플로우 지원
  - 한국어 README 포함
- `platform-dev-team-common` Jira MCP 1.1.0 — Markdown 기반 티켓 업데이트 도구 추가
  - 신규 도구 `jira_update_ticket_from_markdown` — markdown을 ADF로 자동 변환한 뒤 description / custom field에 PUT. 마커 splice 모드로 description의 특정 구간만 갱신 가능.
  - 신규 모듈 `src/markdown-to-adf.ts` — `marked` 기반 ADF 변환기. heading 1–6, 단락, bold/italic/code/strike 마크, fenced code block (언어 보존), bullet/ordered list, task list (`[ ]`/`[x]` → `TODO`/`DONE`), GFM table, link, blockquote, image fallback 지원. 미지원 마크업은 paragraph fallback + `warnings` 반환.
  - 단위 테스트 13개 (`node --test`/`tsx --test`) — markdown→ADF 골든 9건 + splice 로직 3건.
  - 의존성 추가: `marked@^15.0.0`.
- `platform-dev-team-common` 플러그인에 Jira 연동 기능 추가 (v1.3.0)
  - Jira MCP Server: TypeScript 기반 MCP 서버 (11개 도구)
    - 티켓 CRUD: `jira_get_ticket`, `jira_search_tickets`, `jira_create_ticket`, `jira_update_ticket`
    - 상태 전이: `jira_list_transitions`, `jira_transition`
    - 커스텀 필드: `jira_update_field`
    - 보드/스프린트: `jira_get_board`, `jira_get_sprint`
    - CHANGELOG 유틸리티: `changelog_extract_tickets`, `changelog_check_branches`
  - 1개 스킬: `jira-sync` (CHANGELOG 기반 상태 전이 규칙)
  - 1개 커맨드: `/sync-jira-tickets` (Git 브랜치 상태에 따른 Jira 티켓 일괄 동기화)
- `synapse-export` 플러그인 README.md 추가
  - 개요, 설치, 명령어, 스킬, 에이전트, 빠른 시작, 내보내기 대상/형식, 문제 해결
- `synapse-upload` 플러그인 README.md 추가
  - 개요, 설치, 명령어, 스킬, 에이전트, 빠른 시작, 소스 유형, 업로드 모드, 파일 변환, DataUnit 구조, 문제 해결
- `docs/CONTRIBUTING.md` 기여 가이드 추가
  - 기존 플러그인 기여 방법 (버그 리포트, PR 작성)
  - 새 플러그인 추가 가이드 (디렉토리 구조, plugin.json, README 필수 섹션)
  - 리뷰 프로세스, 로컬 테스트 방법

### Changed

- `platform-dev-team-common`·`sdd-helper`의 Jira 연동을 자체 MCP 서버에서 **공식 Atlassian Rovo MCP 서버**(원격 호스티드, OAuth 2.1)로 전환
  - 엔드포인트 `https://mcp.atlassian.com/v1/mcp` — `claude mcp add --transport http atlassian https://mcp.atlassian.com/v1/mcp` 후 `/mcp` OAuth 인증으로 설정 (API 토큰·`JIRA_*` 환경변수 저장 불필요)
  - `/sync-jira-tickets`: 도구 매핑 교체 (`jira_get_ticket`→`getJiraIssue`, `jira_transition`/`jira_list_transitions`→`transitionJiraIssue`/`getTransitionsForJiraIssue`, `jira_update_field`→`editJiraIssue`). 공식 MCP에 없는 `changelog_extract_tickets`/`changelog_check_branches`는 Read 및 Git(`git log --grep`)으로 대체. cloudId는 `getVisibleJiraProjects`로 확보
  - `sdd-helper`의 `/sync-to-jira`: 공식 MCP에 없는 `jira_update_ticket_from_markdown`을 대체 — `getJiraIssue`(description을 markdown으로 조회)·`editJiraIssue`(markdown으로 기록; ADF 변환은 Atlassian MCP가 서버측 수행)를 사용하고, description 마커 splice는 스킬이 markdown 레벨에서 처리
  - `sdd-helper`의 `init-specs`/`spec-manager`의 Jira 도구 탐지·호출을 `mcp__atlassian__getJiraIssue` 기준으로 갱신
- 마켓플레이스 카탈로그 버전 1.6.0으로 업데이트.
- 모든 플러그인 patch version bump 및 Claude/Codex marketplace version 동기화.
- `synapse-applications` marketplace version을 plugin version 계열과 동기화.
- 루트 README.md 플러그인 테이블과 설치 안내를 Claude Code/Codex/OpenCode 기준으로 갱신.
- AGENTS.md와 CONTRIBUTING.md에 공통 manifest, generator, validator 운영 규칙 추가.
- `platform-dev-team-common` Jira MCP 도구 응답 확장 및 일관화
  - `jira_get_ticket`: `fields`에 `description`(ADF JSON), `comment` 포함 가능. `commentLimit` 인자 추가 (기본 10)
  - 댓글은 `/issue/{id}/comment?orderBy=-created&maxResults=N` 별도 호출로 **최신순 정확히 N개** 보장 (이전 슬라이싱 방식의 정렬·페이지네이션 한계 제거)
  - `jira_search_tickets`: 공통 필드 매퍼 도입으로 요청한 `fields`가 응답에 정확히 반영. `description` 필드 지원
  - `jira_search_tickets` 응답에 `statusId` 추가 (status를 name+id 페어로 노출)
  - README에 `jira_get_ticket` 응답 상세 섹션 및 `jira_search_tickets` 미지원 사항 명시

### Fixed

- `platform-dev-team-common` Jira MCP 타입·기능 결함 수정
  - `jira-client.ts` 빈 응답 본문(204 No Content) 처리 시 TypeScript `T` 타입 할당 오류 해소
  - `jira_search_tickets`가 `fields` 인자를 무시하고 고정 4개 키만 반환하던 동작 수정 — 이제 요청 필드가 응답에 반영됨
  - `jira_search_tickets`에서 `comment` 요청 시 N+1 호출 비용을 명확히 거절하고 `jira_get_ticket` 개별 호출로 안내

### Removed

- `platform-dev-team-common`의 자체 Jira MCP 서버(`mcp-servers/jira/`, TypeScript 기반 11개 도구) 제거 — 공식 Atlassian Rovo MCP로 대체. 공식 MCP에 대응 도구가 없는 보드/스프린트 조회(`jira_get_board`/`jira_get_sprint`)와 `jira_update_ticket_from_markdown` 헬퍼도 함께 제거(후자의 기능은 `/sync-to-jira` 스킬로 이관)
- `docs/images/README.md` 미사용 스크린샷 가이드 삭제 (스크린샷 미생성, 참조 문서 없음)

### 등록된 플러그인

| 플러그인 | 버전 | 설명 |
|---------|------|------|
| synapse-plugin-helper | 1.0.1 | Synapse SDK 플러그인 개발 도구 |
| platform-dev-team-common | 1.3.2 | TDD, 문서 관리, PR 자동화, Jira 연동 플러그인 |
| speckit-helper | 1.0.1 | 명세 기반 개발(SDD) 플러그인 |
| synapse-upload | 1.0.1 | AI 기반 Synapse 데이터 업로드 |
| synapse-export | 1.0.1 | AI 기반 Synapse 어노테이션 내보내기 |
| sdd-helper | 1.1.1 | SDD 경량 워크플로우 플러그인 |
| synapse-applications | 0.3.4 | Synapse App 빌드 및 OCI 배포 |

## [1.1.1] - 2026-02-06

### Fixed

- `plugin.json` 매니페스트 스키마 오류 수정 (`speckit-helper`, 마켓플레이스 루트)
  - 미지원 필드 `displayName` 제거
  - `repository`를 object에서 string으로 변경 (공식 스키마 준수)
  - `author`를 string에서 object로 변경 (speckit-helper)

## [1.1.0] - 2026-02-05

### Added

- `speckit-helper` 플러그인 추가 (v1.0.0)
  - 11개 명령어: specify, clarify, refine, plan, tasks, implement, analyze, checklist, constitution, tasks-to-issues, help
  - 4개 스킬: spec-authoring, task-decomposition, consistency-analysis, checklist-generation
  - 2개 에이전트: spec-workflow, quality-gate

### 등록된 플러그인

| 플러그인 | 버전 | 설명 |
|---------|------|------|
| synapse-plugin-helper | 1.0.0 | Synapse SDK 플러그인 개발 도구 |
| platform-dev-team-common | 1.0.0 | TDD, 문서 관리, PR 자동화 플러그인 |
| speckit-helper | 1.0.0 | 명세 기반 개발(SDD) 플러그인 |

## [1.0.0] - 2026-01-27

### Added

- 마켓플레이스 초기 구성 완료
- `.claude-plugin/marketplace.json` 플러그인 레지스트리 생성
- `.claude-plugin/plugin.json` 마켓플레이스 메타데이터 생성
- `plugins/` 디렉토리 구조 도입

### Changed

- Repository 목적 변경: Synapse SDK 도구 -> Synapse Products 마켓플레이스
- 기존 synapse-plugin을 `synapse-plugin-helper` 플러그인으로 재구성
- README.md 전면 개편 (마켓플레이스 문서화)

### Migrated

- `platform-dev-team` 플러그인을 `platform-dev-team-common`으로 마이그레이션
  - 원본: platform-dev-team-claude-marketplace 저장소
  - 버전: 1.0.0 (SemVer로 통일)

### 등록된 플러그인

| 플러그인 | 버전 | 설명 |
|---------|------|------|
| synapse-plugin-helper | 1.0.0 | Synapse SDK 플러그인 개발 도구 |
| platform-dev-team-common | 1.0.0 | TDD, 문서 관리, PR 자동화 플러그인 |

### Breaking Changes

- 명령어 prefix 변경: `/synapse-plugin:*` -> `/synapse-plugin-helper:*`
- 설치 명령어 변경: `/plugin install synapse-sdk@synapse-marketplace` -> `/plugin install synapse-plugin-helper@synapse-marketplace`

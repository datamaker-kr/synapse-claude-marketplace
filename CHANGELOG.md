# Changelog

이 문서는 Synapse Plugin Marketplace의 모든 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 사용합니다.

## [Unreleased] - yyyy-mm-dd

### Added

- `sdd-helper` 플러그인 추가 (v1.0.0)
  - 4개 스킬: init-specs, specify-with-requirements, plan-with-specs, update-requirements
  - 1개 에이전트: spec-manager
  - Spec-Driven Development 경량 워크플로우 지원
  - 한국어 README 포함
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

- 마켓플레이스 버전 1.2.0으로 업데이트
- 루트 README.md 플러그인 테이블 확장 (2개 → 6개)
  - synapse-export, synapse-upload, speckit-helper, sdd-helper 상세 섹션 추가
- AGENTS.md에 플러그인 문서화 필수 규칙 추가
  - README 필수, 필수 섹션, 루트 README 등록, 한글 문서, plugin.json 정합성
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

- `docs/images/README.md` 미사용 스크린샷 가이드 삭제 (스크린샷 미생성, 참조 문서 없음)

### 등록된 플러그인

| 플러그인 | 버전 | 설명 |
|---------|------|------|
| synapse-plugin-helper | 1.0.0 | Synapse SDK 플러그인 개발 도구 |
| platform-dev-team-common | 1.3.0 | TDD, 문서 관리, PR 자동화, Jira 연동 플러그인 |
| speckit-helper | 1.0.0 | 명세 기반 개발(SDD) 플러그인 |
| synapse-upload | 1.0.0 | AI 기반 Synapse 데이터 업로드 |
| synapse-export | 1.0.0 | AI 기반 Synapse 어노테이션 내보내기 |
| sdd-helper | 1.0.0 | SDD 경량 워크플로우 플러그인 |

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

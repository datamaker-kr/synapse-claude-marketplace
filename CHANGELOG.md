# Changelog

이 문서는 Synapse Plugin Marketplace의 모든 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 사용합니다.

## [Unreleased] - yyyy-mm-dd

### Added

### Changed

### Fixed

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

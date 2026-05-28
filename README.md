# Synapse Agent Plugin Marketplace

Synapse 제품군 개발을 위한 공식 agent plugin marketplace입니다.

## 개요

이 저장소는 Claude Code 플러그인을 기준으로 시작했지만, 이제 공통 manifest에서 Claude Code, Codex, OpenCode용 산출물을 함께 생성합니다.

### 지원 제품

- synapse-backend
- synapse-annotator
- synapse-workspace
- synapse-sdk
- synapse-agent

## 빠른 시작

### Claude Code

#### 1. 마켓플레이스 추가

```bash
/plugin marketplace add datamaker-kr/synapse-claude-marketplace
```

#### 2. 사용 가능한 플러그인 탐색

```bash
/plugin > Discover
```

#### 3. 플러그인 설치

```bash
# Synapse SDK 플러그인 개발 도구
/plugin install synapse-plugin-helper@synapse-marketplace

# 개발팀 공통 도구 (TDD, 문서 관리, PR 자동화)
/plugin install platform-dev-team-common@synapse-marketplace

# Synapse 데이터 내보내기
/plugin install synapse-export@synapse-marketplace

# Synapse 데이터 업로드
/plugin install synapse-upload@synapse-marketplace

# 명세 기반 개발 (SDD) — 상세 워크플로우
/plugin install speckit-helper@synapse-marketplace

# 명세 기반 개발 (SDD) — 경량 워크플로우
/plugin install sdd-helper@synapse-marketplace

# Synapse App 개발
/plugin install synapse-applications@synapse-marketplace
```

### Codex

Codex는 repo-local marketplace 파일을 사용합니다.

```bash
codex plugin marketplace add .
codex plugin install synapse-plugin-helper@synapse-marketplace
codex plugin install synapse-upload@synapse-marketplace
```

각 플러그인에는 `plugins/<plugin>/.codex-plugin/plugin.json`이 포함되어 있고, Claude slash command는 `skills/*-command/SKILL.md` 형태의 Codex skill로 제공됩니다.

### OpenCode

OpenCode adapter는 `dist/opencode/<plugin>/.opencode/` 아래에 생성됩니다.

```bash
# 예: synapse-upload adapter를 프로젝트에 복사
cp -R dist/opencode/synapse-upload/.opencode ./
```

OpenCode native marketplace 배포는 아직 범위 밖이며, 현재는 `.opencode/commands`, `.opencode/skills`, `.opencode/agent` 산출물을 제공합니다.

## 사용 가능한 플러그인

| 플러그인 | 설명 | 버전 | 카테고리 |
|---------|------|------|----------|
| [synapse-plugin-helper](#synapse-plugin-helper) | Synapse SDK 플러그인 개발 도구 | 1.0.1 | development |
| [platform-dev-team-common](#platform-dev-team-common) | TDD, 문서 관리, PR 자동화 | 1.3.2 | development |
| [synapse-export](#synapse-export) | AI 기반 Synapse 어노테이션 내보내기 | 1.0.1 | data-management |
| [synapse-upload](#synapse-upload) | AI 기반 Synapse 데이터 업로드 | 1.0.1 | data-management |
| [speckit-helper](#speckit-helper) | 명세 기반 개발(SDD) 플러그인 | 1.0.1 | development |
| [sdd-helper](#sdd-helper) | SDD 경량 워크플로우 플러그인 | 1.1.1 | development |
| [synapse-applications](#synapse-applications) | Synapse App 빌드 및 OCI 배포 | 0.3.4 | development |

---

## synapse-plugin-helper

Synapse SDK 플러그인 개발을 위한 Claude Code 도구입니다.

### 명령어 (10개)

| 명령어 | 설명 |
|--------|------|
| `/synapse-plugin-helper:help` | 사용 가능한 모든 기능 안내 |
| `/synapse-plugin-helper:create` | 새 Synapse 플러그인 생성 |
| `/synapse-plugin-helper:config` | 플러그인 설정, 카테고리, 연결된 에이전트 조회 |
| `/synapse-plugin-helper:test` | 로컬에서 액션 테스트 실행 |
| `/synapse-plugin-helper:logs` | 실행 중인 작업의 로그 스트리밍 |
| `/synapse-plugin-helper:debug` | 플러그인 문제 진단 및 해결 |
| `/synapse-plugin-helper:update-config` | 코드 기반 메타데이터를 config.yaml에 동기화 |
| `/synapse-plugin-helper:dry-run` | 배포 전 검증 |
| `/synapse-plugin-helper:publish` | 플러그인 배포 |
| `/synapse-plugin-helper:migrate-plugin-to-server` | 서버 간 플러그인 마이그레이션 |

### 스킬 (7개)

| 스킬 | 트리거 키워드 |
|------|---------------|
| **action-development** | "액션 만들기", "@action", "BaseAction", "Pydantic" |
| **config-yaml-guide** | "config.yaml", "플러그인 설정", "액션 정의" |
| **plugin-execution** | "run_plugin", "ExecutionMode", "RayActorExecutor" |
| **result-schemas** | "TrainResult", "InferenceResult", "result_model" |
| **runtime-context-api** | "RuntimeContext", "ctx.", "set_progress", "log_message" |
| **specialized-actions** | "BaseTrainAction", "BaseExportAction", "BaseUploadAction" |
| **step-workflow** | "BaseStep", "StepRegistry", "Orchestrator" |

### 에이전트 (2개)

| 에이전트 | 목적 |
|----------|------|
| **plugin-validator** | config.yaml, 엔트리포인트, 의존성 검증 |
| **troubleshooter** | 에러 분석 및 해결책 제안 |

---

## platform-dev-team-common

개발팀 공통 도구로 TDD, 문서 관리, PR 자동화를 지원합니다.

### 명령어 (5개)

| 명령어 | 설명 |
|--------|------|
| `/platform-dev-team-common:update-pr-title` | PR 제목 자동 생성 |
| `/platform-dev-team-common:update-pr-desc` | PR 설명 및 Mermaid 다이어그램 자동 생성 |
| `/platform-dev-team-common:update-docs` | 문서 업데이트 분석 및 제안 |
| `/platform-dev-team-common:add-changelog` | CHANGELOG 항목 추가 |
| `/platform-dev-team-common:sync-jira-tickets` | Git 브랜치/CHANGELOG 기반 Jira 티켓 동기화 |

### 스킬 (7개)

| 스킬 | 설명 |
|------|------|
| **tdd-workflow** | Kent Beck의 TDD 방법론 및 Tidy First 원칙 가이드 |
| **docs-analyzer** | 코드 변경 분석 및 문서 갭 식별 |
| **docs-bootstrapper** | 프로젝트 문서 구조 초기화 |
| **mermaid-expert** | Light/Dark 모드 호환 Mermaid 다이어그램 생성 |
| **commit-with-message** | 한국어/영어 이중 언어 커밋 메시지 규칙 |
| **changelog-manager** | Keep a Changelog 형식의 변경 로그 관리 |
| **jira-sync** | Jira 티켓 조회, 업데이트, 상태 전이 가이드 |

### 에이전트 (3개)

| 에이전트 | 목적 |
|----------|------|
| **docs-manager** | 문서 자동 분석 및 업데이트 제안 |
| **planner** | 구현 계획 설계 |
| **update-pr** | PR 자동 업데이트 |

---

## synapse-export

Synapse 프로젝트에서 어노테이션, 그라운드 트루스, 태스크 데이터를 다양한 형식으로 내보냅니다.

### 명령어 (3개)

| 명령어 | 설명 |
|--------|------|
| `/synapse-export:help` | 사용 가능한 모든 기능 안내 |
| `/synapse-export:export` | 프로젝트에서 데이터 내보내기 |
| `/synapse-export:export-status` | 내보내기 작업 상태 확인 |

### 스킬 (1개)

| 스킬 | 트리거 키워드 |
|------|---------------|
| **export-workflow** | "export", "COCO format", "YOLO format", "ground truth", "download annotations" |

### 에이전트 (1개)

| 에이전트 | 목적 |
|----------|------|
| **export-assistant** | 데이터 분석, 포맷 변환, 내보내기 실행 오케스트레이션 |

---

## synapse-upload

로컬 또는 원격 소스의 파일을 Synapse 데이터 컬렉션에 업로드합니다.

### 명령어 (3개)

| 명령어 | 설명 |
|--------|------|
| `/synapse-upload:help` | 사용 가능한 모든 기능 안내 |
| `/synapse-upload:upload` | 파일을 데이터 컬렉션에 업로드 |
| `/synapse-upload:upload-status` | 업로드 작업 상태 확인 |

### 스킬 (2개)

| 스킬 | 트리거 키워드 |
|------|---------------|
| **upload-workflow** | "upload", "data collection", "s3 upload", "multi-path", "excel metadata" |
| **file-conversion** | "convert", "tiff to png", "file format", "unsupported extension" |

### 에이전트 (1개)

| 에이전트 | 목적 |
|----------|------|
| **upload-assistant** | 소스 탐색, 파일 매핑, 업로드 실행 오케스트레이션 |

---

## speckit-helper

명세 기반 개발(Spec-Driven Development)을 위한 상세 워크플로우 플러그인입니다.

### 명령어 (11개)

| 명령어 | 설명 |
|--------|------|
| `/speckit-helper:help` | 사용 가능한 모든 기능 안내 |
| `/speckit-helper:specify` | 자연어 요구사항에서 명세 생성 |
| `/speckit-helper:clarify` | 명세의 불명확한 부분 질문 |
| `/speckit-helper:refine` | 명세 개선 |
| `/speckit-helper:plan` | 명세에서 구현 계획 생성 |
| `/speckit-helper:tasks` | 구현 태스크 분해 |
| `/speckit-helper:implement` | 태스크 구현 가이드 |
| `/speckit-helper:analyze` | 일관성 분석 |
| `/speckit-helper:checklist` | 체크리스트 생성 |
| `/speckit-helper:constitution` | 프로젝트 규칙 정의 |
| `/speckit-helper:tasks-to-issues` | 태스크를 GitHub 이슈로 변환 |

### 스킬 (4개)

| 스킬 | 설명 |
|------|------|
| **spec-authoring** | 명세 작성 가이드 |
| **task-decomposition** | 태스크 분해 |
| **consistency-analysis** | 일관성 분석 |
| **checklist-generation** | 체크리스트 생성 |

### 에이전트 (2개)

| 에이전트 | 목적 |
|----------|------|
| **spec-workflow** | 명세 워크플로우 오케스트레이션 |
| **quality-gate** | 품질 검증 게이트 |

---

## sdd-helper

SDD(Spec-Driven Development) 경량 워크플로우 플러그인입니다. 요구사항 → 명세 → 계획 → Jira 동기화의 라이프사이클을 6개의 스킬로 관리합니다.

### 스킬 (6개)

| 스킬 | 설명 |
|------|------|
| **init-specs** | 스펙 문서 초기화 (Git 브랜치 자동 생성) |
| **specify-with-requirements** | 요구사항에서 기술 명세 자동 생성 |
| **plan-with-specs** | 명세에서 구현 계획 자동 생성 |
| **plan-with-requirements** | 낮은 난이도 요구사항에서 구현 계획 직행 생성 |
| **update-requirements** | 요구사항 변경 및 연쇄 업데이트 |
| **sync-to-jira** | specs/plans 문서를 Jira description으로 동기화 |

### 에이전트 (1개)

| 에이전트 | 목적 |
|----------|------|
| **spec-manager** | 스펙 문서 라이프사이클 관리 |

---

## synapse-applications

Synapse Workspace App을 OCI 이미지로 빌드하고 게시하는 플러그인입니다.

### 스킬 (1개)

| 스킬 | 설명 |
|------|------|
| **synapse-applications** | React, Vue, Next.js, Nuxt 3, Gradio, Streamlit, Static HTML, Django, FastAPI 기반 Synapse App 생성 및 게시 |

---

## 요구 사항

### 필수 사항

| 항목 | 확인 명령어 | 최소 버전 |
|------|------------|-----------|
| Claude Code | `claude --version` | v2.1.0+ |
| Codex | `codex --version` | 플러그인 지원 버전 |
| OpenCode | `opencode --version` | `.opencode` 지원 버전 |
| GITHUB_TOKEN | `echo $GITHUB_TOKEN` | - |

### synapse-plugin-helper 추가 요구 사항

| 항목 | 확인 명령어 | 최소 버전 | 비고 |
|------|------------|-----------|------|
| Python | `python3 --version` | 3.12+ | 필수 |
| synapse-sdk | `synapse --version` | latest | PyPI에서 설치 |
| uv (권장) | `uv --version` | any | 패키지 관리자 |

### Personal Access Token 설정

Claude Code 마켓플레이스에서 private 레포지토리를 사용하려면 GitHub 토큰 설정이 필요합니다.

```bash
# ~/.zshrc 또는 ~/.bashrc에 추가
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
source ~/.zshrc
```

## 문제 해결

### GITHUB_TOKEN 인증 실패

**증상**: 마켓플레이스 추가 시 "authentication failed" 오류

**해결**:
```bash
echo $GITHUB_TOKEN  # 토큰 확인
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### 조직 접근 권한 오류

**증상**: `404 Not Found` 또는 `Repository not found`

**해결**:
1. [datamaker-kr](https://github.com/datamaker-kr) 조직 멤버인지 확인
2. Personal Access Token의 `repo` 스코프 확인

---

## 기존 사용자 마이그레이션

v1.0.0부터 synapse-plugin 명령어 prefix가 변경되었습니다:

| 이전 | 현재 |
|------|------|
| `/synapse-plugin:help` | `/synapse-plugin-helper:help` |
| `/synapse-plugin:create` | `/synapse-plugin-helper:create` |
| `/synapse-plugin:config` | `/synapse-plugin-helper:config` |
| `/synapse-plugin:test` | `/synapse-plugin-helper:test` |
| `/synapse-plugin:logs` | `/synapse-plugin-helper:logs` |
| `/synapse-plugin:debug` | `/synapse-plugin-helper:debug` |
| `/synapse-plugin:update-config` | `/synapse-plugin-helper:update-config` |
| `/synapse-plugin:dry-run` | `/synapse-plugin-helper:dry-run` |
| `/synapse-plugin:publish` | `/synapse-plugin-helper:publish` |

---

## 라이선스

MIT

## 지원

- GitHub Issues: [이슈 생성](https://github.com/datamaker-kr/synapse-claude-marketplace/issues)
- 조직: [datamaker-kr](https://github.com/datamaker-kr)

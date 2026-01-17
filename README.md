# Synapse Plugin Development Toolkit

Claude Code 플러그인으로 Synapse SDK 플러그인 개발을 지원합니다.

## 개요

이 플러그인은 synapse-sdk-v2의 CLI 도구를 활용하여 Synapse 플러그인 개발의 전체 워크플로우를 지원합니다:

- **플러그인 생성**: 새로운 Synapse 플러그인 스캐폴딩
- **개발 지원**: 액션, 설정, 컨텍스트 API 가이드
- **테스트 및 디버깅**: 로컬 테스트, 로그 스트리밍, 문제 해결
- **배포**: 검증 및 퍼블리싱

---

## 사전 준비

### 조직 접근 권한 확인

이 플러그인은 **datamaker-kr 조직의 private 레포지토리**입니다.

- GitHub에서 [datamaker-kr](https://github.com/datamaker-kr) 조직 멤버여야 합니다
- 레포지토리 접근 권한이 있어야 합니다

> 💡 조직 멤버가 아니라면 팀 관리자에게 초대를 요청하세요.

<!-- 📸 스크린샷: docs/images/github-org-member.png - GitHub 조직 멤버 확인 화면 -->

### Personal Access Token 설정 (마켓플레이스 사용 시 필수)

Claude Code 마켓플레이스에서 private 레포지토리를 사용하려면 GitHub 토큰 설정이 필요합니다.

**1단계: GitHub Personal Access Token 생성**

1. GitHub 접속 → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" 클릭
3. **`repo` 스코프** 선택 (private 레포지토리 접근 권한)
4. 토큰 생성 후 복사 (다시 볼 수 없으니 안전한 곳에 저장)

<!-- 📸 스크린샷: docs/images/github-pat-creation.png - GitHub PAT 생성 화면 -->

**2단계: 환경 변수 설정**

```bash
# ~/.zshrc 또는 ~/.bashrc에 추가
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

<!-- 📸 스크린샷: docs/images/env-variable-setup.png - 환경 변수 설정 화면 -->

**3단계: 설정 적용**

```bash
source ~/.zshrc  # 또는 source ~/.bashrc
```

**4단계: 설정 확인**

```bash
echo $GITHUB_TOKEN  # 토큰이 출력되면 성공
```

> ⚠️ **주의**: `GITHUB_TOKEN` 또는 `GH_TOKEN` 중 하나를 사용하면 됩니다. Claude Code가 자동으로 인식합니다.

---

## 설치

### 방법 1: 로컬 클론 설치 (개발자용)

플러그인을 직접 수정하거나 개발에 참여하려면 이 방법을 사용하세요.

**1단계: 저장소 클론**

```bash
git clone https://github.com/datamaker-kr/synapse-claude-plugin.git
```

**2단계: Claude Code에서 플러그인 로드**

```bash
claude --plugin-dir ./synapse-claude-plugin
```

<!-- 📸 스크린샷: docs/images/plugin-load-success.png - 플러그인 로드 성공 화면 -->

**3단계: 설치 확인**

```
/synapse-plugin:help
```

<!-- 📸 스크린샷: docs/images/help-command-result.png - help 명령어 실행 결과 -->

> ✅ 성공 시 사용 가능한 명령어 목록이 표시됩니다.

---

### 방법 2: 마켓플레이스 등록 (팀 공유용)

팀 전체가 동일한 버전을 사용하려면 마켓플레이스를 통해 설치하세요.

**1단계: GITHUB_TOKEN 환경 변수 설정**

[사전 준비](#personal-access-token-설정-마켓플레이스-사용-시-필수) 섹션을 참조하세요.

**2단계: 마켓플레이스 추가**

```
/plugin marketplace add https://github.com/datamaker-kr/synapse-claude-plugin.git
```

<!-- 📸 스크린샷: docs/images/marketplace-add.png - 마켓플레이스 추가 화면 -->

**3단계: 플러그인 설치**

```
/plugin install synapse-sdk@synapse-marketplace
```

<!-- 📸 스크린샷: docs/images/plugin-install.png - 플러그인 설치 화면 -->

**4단계: 설치 확인**

```
/synapse-plugin:help
```

> ✅ 성공 시 사용 가능한 명령어 목록이 표시됩니다.

---

## 플러그인 업데이트

마켓플레이스를 통해 설치한 경우, 최신 버전으로 업데이트할 수 있습니다:

```
/plugin marketplace update
```

<!-- 📸 스크린샷: docs/images/plugin-update.png - 업데이트 명령 실행 화면 -->

> 💡 플러그인이 업데이트되면 자동으로 최신 기능과 버그 수정이 반영됩니다.

---

## 요구사항

### 사전 확인 체크리스트

| 항목 | 확인 명령어 | 최소 버전 | 비고 |
|------|------------|-----------|------|
| Claude Code | `claude --version` | latest | - |
| Python | `python3 --version` | 3.12+ | 필수 |
| synapse-sdk | `synapse --version` | latest | PyPI에서 설치 |
| 인증 상태 | `synapse doctor` | - | 연결 상태 확인 |
| uv (권장) | `uv --version` | any | 패키지 관리자 |

### synapse-sdk 설치

```bash
# uv 사용 (권장 - 빠르고 안정적)
uv pip install synapse-sdk

# pip 사용 (대안)
pip install synapse-sdk
```

### uv 설치 (선택)

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

---

## 문제 해결

### 플러그인이 로드되지 않을 때

**증상**: `/synapse-plugin:help` 명령어가 인식되지 않음

**해결 방법**:

```bash
# 1. 플러그인 경로 확인
ls ./synapse-claude-plugin/.claude-plugin/plugin.json

# 2. Claude Code 재시작
claude --plugin-dir ./synapse-claude-plugin
```

### GITHUB_TOKEN 인증 실패

**증상**: 마켓플레이스 추가 시 "authentication failed" 오류

**해결 방법**:

```bash
# 1. 토큰 환경 변수 확인
echo $GITHUB_TOKEN

# 2. 토큰이 비어있으면 설정
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
source ~/.zshrc
```

**추가 확인**:
- GitHub에서 토큰의 `repo` 권한이 있는지 확인
- 토큰이 만료되었다면 재발급

### synapse-sdk 명령어 오류

**증상**: `synapse: command not found`

**해결 방법**:

```bash
# synapse-sdk 설치
pip install synapse-sdk

# 또는 uv 사용
uv pip install synapse-sdk

# 설치 확인
synapse --version
```

### Python 버전 불일치

**증상**: `Python 3.12+ required` 오류

**해결 방법**:

```bash
# 현재 버전 확인
python3 --version

# Python 3.12 이상 설치 필요
# macOS: brew install python@3.12
# Ubuntu: sudo apt install python3.12
```

### 조직 접근 권한 오류

**증상**: `404 Not Found` 또는 `Repository not found`

**해결 방법**:
1. [datamaker-kr](https://github.com/datamaker-kr) 조직 멤버인지 확인
2. 레포지토리 접근 권한이 있는지 팀 관리자에게 확인
3. Personal Access Token의 `repo` 스코프 확인

---

## 빠른 시작

### 1. 새 플러그인 만들기

```
/synapse-plugin:create --name "My Plugin" --code my-plugin --category neural_net
```

### 2. 액션 개발하기

Claude에게 물어보세요:
- "BaseAction 클래스로 훈련 액션 만들어줘"
- "@action 데코레이터 사용법 알려줘"

### 3. 테스트하기

```
/synapse-plugin:test train --params '{"epochs": 10}'
```

### 4. 설정 동기화

```
/synapse-plugin:update-config
```

### 5. 검증 및 배포

```
/synapse-plugin:dry-run
/synapse-plugin:publish
```

---

## 기능

### Commands (슬래시 명령어)

| 명령어 | 설명 |
|--------|------|
| `/synapse-plugin:help` | 사용 가능한 모든 기능 안내 |
| `/synapse-plugin:create` | 새 Synapse 플러그인 생성 |
| `/synapse-plugin:config` | 플러그인 설정, 카테고리, 연결된 에이전트 조회 |
| `/synapse-plugin:test` | 로컬에서 액션 테스트 실행 |
| `/synapse-plugin:logs` | 실행 중인 작업의 로그 스트리밍 |
| `/synapse-plugin:debug` | 플러그인 문제 진단 및 해결 |
| `/synapse-plugin:update-config` | 코드 기반 메타데이터를 config.yaml에 동기화 |
| `/synapse-plugin:dry-run` | 배포 전 검증 |
| `/synapse-plugin:publish` | 플러그인 배포 |

### Skills (자동 활성화)

대화 맥락에 따라 자동으로 활성화되는 지식 제공:

| 스킬 | 트리거 키워드 |
|------|---------------|
| **action-development** | "액션 만들기", "@action", "BaseAction", "Pydantic" |
| **config-yaml-guide** | "config.yaml", "플러그인 설정", "액션 정의" |
| **plugin-execution** | "run_plugin", "ExecutionMode", "RayActorExecutor" |
| **result-schemas** | "TrainResult", "InferenceResult", "result_model" |
| **runtime-context-api** | "RuntimeContext", "ctx.", "set_progress", "log_message" |
| **specialized-actions** | "BaseTrainAction", "BaseExportAction", "BaseUploadAction" |
| **step-workflow** | "BaseStep", "StepRegistry", "Orchestrator" |

### Agents (자율 에이전트)

특정 상황에서 자동으로 호출되는 전문 에이전트:

| 에이전트 | 목적 |
|----------|------|
| **plugin-validator** | config.yaml, 엔트리포인트, 의존성 검증 |
| **troubleshooter** | 에러 분석 및 해결책 제안 |

---

## 구조

```
synapse-claude-plugin/
├── .claude-plugin/
│   └── plugin.json          # 플러그인 매니페스트
├── commands/                 # 슬래시 명령어 (9개)
│   ├── help.md
│   ├── create.md
│   ├── config.md
│   ├── test.md
│   ├── logs.md
│   ├── debug.md
│   ├── update-config.md
│   ├── dry-run.md
│   └── publish.md
├── skills/                   # 자동 활성화 스킬 (7개)
│   ├── action-development/
│   ├── config-yaml-guide/
│   ├── plugin-execution/
│   ├── result-schemas/
│   ├── runtime-context-api/
│   ├── specialized-actions/
│   └── step-workflow/
├── agents/                   # 자율 에이전트 (2개)
│   ├── plugin-validator.md
│   └── troubleshooter.md
└── README.md
```

---

## 라이선스

MIT

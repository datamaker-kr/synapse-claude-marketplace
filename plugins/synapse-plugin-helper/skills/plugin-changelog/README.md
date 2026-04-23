# plugin-changelog Skill

Synapse 플러그인의 GitHub Release body에 Changelog를 생성하고 관리하는 스킬입니다.

## 개요

**활성화**: `/synapse-plugin-helper:add-changelog` 커맨드 실행 시

**목적**: publish 후 GitHub Release body에 이전 버전 대비 변경사항을 Keep a Changelog 형식으로 추가

## 동작 방식

### 일반적인 워크플로우

```
synapse plugin publish          ← 플러그인 배포 (GitHub Release 생성)
         │
         ▼
/add-changelog                  ← Claude Code에서 실행
         │
         ├─ config.yaml에서 code, version, variant 읽기
         ├─ GitHub org 설정 확인 (~/.synapse/config.json)
         ├─ 현재 태그 결정 (1.1.0 또는 1.1.0+lig)
         ├─ 같은 variant의 이전 태그 탐색
         ├─ GitHub Compare API로 diff 수집
         ├─ diff 분석 → Added/Changed/Fixed/Removed 정리
         ├─ 미리보기 → 사용자 승인
         └─ GitHub Release body 업데이트
```

### 첫 릴리스인 경우

```
이전 태그가 없음
         │
         ├─ 현재 태그의 tree 전체 파일 목록 수집
         ├─ 파일 구조 분석 → "Initial Release" changelog 생성
         └─ GitHub Release body 업데이트
```

## Variant 처리

플러그인은 variant별로 별도 브랜치와 태그를 사용합니다:

```
github.com/{org}/sam2-smart-tool/
├── main 브랜치
│   └── tags: 1.0.0, 1.1.0, 2.0.0
├── variant/lig 브랜치
│   └── tags: 1.0.0+lig, 1.1.0+lig
└── variant/ke 브랜치
    └── tags: 1.0.0+ke
```

**비교 규칙**: 같은 variant끼리만 비교합니다.

```
현재: 1.1.0+lig → 이전: 1.0.0+lig (같은 variant끼리)
현재: 2.0.0     → 이전: 1.1.0     (variant 없는 것끼리)
```

## 예시 시나리오

### 시나리오 1: 일반 릴리스

```bash
# sam2-smart-tool v2.0.8을 publish한 직후
/synapse-plugin-helper:add-changelog
```

**자동 감지**:
- config.yaml → code: `sam2-smart-tool`, version: `2.0.8`, variant: null
- 현재 태그: `2.0.8`
- 이전 태그: `2.0.7` (variant 없는 태그 중 직전)

**GitHub Compare API**: `2.0.7...2.0.8`

**분석 결과**:
```
변경된 파일:
  actions/segment.py    (modified, +45 -12)
  actions/preprocess.py (added, +120)
  config.yaml           (modified, +3 -1)
  requirements.txt      (modified, +1)
```

**생성된 changelog**:
```markdown
### Changelog (from v2.0.7)

#### Added
- 새로운 전처리 액션 `preprocess` 추가

#### Changed
- `segment` 액션에 멀티포인트 프롬프트 지원
- `onnxruntime` 의존성 버전 업데이트
```

### 시나리오 2: Variant 릴리스

```bash
/synapse-plugin-helper:add-changelog --variant lig
```

**자동 감지**:
- 현재 태그: `2.0.8+lig`
- 이전 태그: `2.0.7+lig` (같은 variant)

**생성된 changelog**:
```markdown
### Changelog (from v2.0.7+lig)

#### Changed
- LIG 전용 모델 가중치 경로 변경
- 배치 크기 기본값 32 → 64로 조정
```

### 시나리오 3: 첫 릴리스

```bash
/synapse-plugin-helper:add-changelog --code new-plugin --version 1.0.0
```

**이전 태그 없음 → Initial Release 모드**

**생성된 changelog**:
```markdown
### Changelog (Initial Release)

#### Added
- `train` 액션: 모델 학습 기능
- `infer` 액션: 추론 기능
- `config.yaml`: 플러그인 설정 정의
- `requirements.txt`: Python 의존성
```

### 시나리오 4: 영어로 생성

```bash
/synapse-plugin-helper:add-changelog --lang en
```

**생성된 changelog**:
```markdown
### Changelog (from v2.0.7)

#### Added
- Add new `preprocess` action

#### Changed
- Add multi-point prompt support to `segment` action
- Update `onnxruntime` dependency version
```

## Release Body 구조

업데이트 후 GitHub Release body:

```markdown
## sam2-smart-tool v2.0.8

SAM2 기반 스마트 어노테이션 도구

### Changelog (from v2.0.7)

#### Added
- 새로운 전처리 액션 `preprocess` 추가

#### Changed
- `segment` 액션에 멀티포인트 프롬프트 지원

### Plugin Info
- Code: `sam2-smart-tool`
- Category: smart_tool
- Actions: `segment`, `preprocess`

---
*Published via Synapse SDK*
```

## 참고 자료

- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) - Changelog 형식 가이드
- [Semantic Versioning](https://semver.org/) - SemVer 설명
- [GitHub Compare API](https://docs.github.com/en/rest/commits/commits#compare-two-commits) - 태그 간 비교 API

# synapse-product

**Synapse Product Master** — 시냅스 제품 정의 및 제품 기획 guardrail/guideline 플러그인

## 개요

`synapse-product` 플러그인은 데이터메이커 시냅스(Synapse) 제품의 Product Master 역할을 수행합니다.

- **제품 정의**: 시냅스가 무엇인지, 핵심 모듈/페이지 구조, 데이터 모델, 사용자 흐름을 정의
- **제품 가드레일**: 제품 기획 원칙, UX 패턴, 기능 범위 경계, 금지 패턴 정의
- **제품 점검**: 새로운 기능/변경이 제품 원칙에 부합하는지 검증

## 설치

```bash
/plugin install synapse-product@synapse-marketplace
```

## 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/synapse-product:help` | 도움말 표시 |
| `/synapse-product:product-check` | 제품 원칙 부합 여부 검증 |

## 스킬

### product-definition

시냅스의 제품 구조, 페이지 계층, 데이터 모델, 사용자 흐름을 정의하는 핵심 지식 베이스.

**자동 트리거**: "시냅스란", "제품 구조", "페이지 구성", "데이터 모델", "사용자 흐름"

### product-guardrails

제품 기획 원칙, UX 설계 가이드라인, 기능 범위 경계를 정의하는 가드레일.

**자동 트리거**: "제품 원칙", "가드레일", "이 기능이 맞는지", "제품 범위", "설계 원칙"

## 에이전트

### product-master

새로운 기능 기획이나 변경사항을 제품 원칙에 따라 종합적으로 평가하는 오케스트레이터.

**5가지 핵심 원칙으로 평가**:
1. All-in-One MLOps
2. 라벨링 최적화 우선
3. No/Low/High Code 지원
4. 보안 우선
5. 플러그인 확장성

**범위 판단**: In-Scope (플랫폼 내장) / 플러그인 / Out-of-Scope

## 사용 예시

```
# 제품 구조 파악
"시냅스의 기본 페이지 구조를 설명해줘"
"데이터 컬렉션의 파일 스펙이란?"

# 기능 검증
/synapse-product:product-check
"DICOM 의료 영상 뷰어를 어노테이터에 추가하려는데 제품 범위에 맞는가?"

# 설계 원칙 확인
"새 목록 페이지를 만드는데 UI 패턴은 어떻게 해야 하는가?"
```

## 라이선스

SEE LICENSE IN LICENSE

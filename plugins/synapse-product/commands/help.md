---
description: Show synapse-product plugin help and available commands
argument-hint: ""
allowed-tools: []
---

# Synapse Product Plugin Help

## 개요

**synapse-product** 플러그인은 Synapse Product Master 역할을 수행합니다.
제품 자체를 정의하고, 제품 기획자 관점에서 guardrail 및 guideline을 제공합니다.

## 사용 가능한 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/synapse-product:help` | 이 도움말 표시 |
| `/synapse-product:product-check` | 새 기능/변경사항의 제품 원칙 부합 여부 검증 |

## 자동 활성화 스킬

이 플러그인은 대화 중 관련 키워드가 감지되면 자동으로 활성화됩니다.

### product-definition 스킬

시냅스 제품의 구조, 데이터 모델, 사용자 흐름 등을 설명합니다.

**트리거 키워드**: "시냅스란", "제품 구조", "페이지 구성", "데이터 모델", "사용자 흐름", "product overview"

### product-guardrails 스킬

제품 기획 원칙, UX 패턴, 기능 범위 경계를 검증합니다.

**트리거 키워드**: "제품 원칙", "가드레일", "guardrail", "이 기능이 맞는지", "제품 범위", "설계 원칙"

## 에이전트

### product-master 에이전트

새로운 기능 기획이나 변경사항을 제품 원칙에 따라 종합적으로 평가하는 오케스트레이터입니다.

**트리거**: 기능 기획 리뷰, 제품 적합성 검증, 범위 판단이 필요한 경우

## 예시 사용법

```
# 시냅스 제품에 대해 알고 싶을 때
"시냅스의 기본 페이지 구조는?"
"데이터 컬렉션의 핵심 개념을 설명해줘"

# 새 기능이 제품 원칙에 맞는지 검증
/synapse-product:product-check
"데이터 크롤링 기능을 추가하려는데 제품 범위에 맞는가?"

# 설계 원칙 확인
"시냅스의 UX 설계 원칙은?"
"카드형 UI 패턴은 어디에 사용해야 하는가?"
```

# TDD Workflow

테스트 주도 개발(Test-Driven Development)과 Kent Beck의 Tidy First 원칙을 따르는 개발 가이드 스킬입니다.

## 개요

**활성화**: 개발 세션 중 자동으로 활성화

**목적**: 테스트 주도 개발과 Tidy First 원칙을 따르는 개발 가이드

## 핵심 원칙

- **Red → Green → Refactor 사이클**
- 실패하는 테스트를 먼저 작성
- 테스트를 통과하는 최소한의 코드 구현
- 구조적 변경과 행동적 변경 분리
- 테스트가 통과할 때만 커밋

## 활성화 시점

- 기능 구현 중
- 버그 수정 시
- 리팩토링 중

## 예제 워크플로우

1. **사용자**: "사용자 인증을 추가하고 싶어요"
2. **TDD Skill**: "실패하는 테스트부터 시작합시다. 먼저 로그인 기능에 대한 테스트를 만들어요..."
3. Red → Green → Refactor → Commit 사이클 가이드

## TDD 사이클 상세

### Red (빨강) 단계

1. **실패하는 테스트 작성**
   - 구현하려는 기능의 기대 동작을 테스트로 작성
   - 테스트가 실패하는지 확인 (아직 구현되지 않았으므로)

### Green (초록) 단계

2. **테스트를 통과하는 최소한의 코드 작성**
   - 테스트를 통과시키는 가장 간단한 구현
   - 코드 품질보다 테스트 통과에 집중

### Refactor (리팩토링) 단계

3. **코드 개선**
   - 중복 제거
   - 코드 구조 개선
   - 테스트는 계속 통과해야 함

### Commit (커밋) 단계

4. **변경사항 커밋**
   - 테스트가 모두 통과할 때만 커밋
   - 의미 있는 단위로 커밋

## Tidy First 원칙

Kent Beck의 Tidy First 방법론을 따릅니다:

### 구조적 변경 vs 행동적 변경

- **구조적 변경**: 코드의 동작은 변경하지 않고 구조만 개선 (리팩토링)
- **행동적 변경**: 새로운 기능 추가 또는 버그 수정

### 원칙

1. **먼저 정리하기**: 새 기능을 추가하기 전에 코드를 정리
2. **분리된 커밋**: 구조적 변경과 행동적 변경은 별도 커밋
3. **작은 단위**: 큰 리팩토링은 작은 단위로 분리

## 사용 예시

### 예시 1: 새 기능 추가

```python
# 1. Red: 실패하는 테스트 작성
def test_user_login():
    user = User(username="test", password="password123")
    assert user.login() == True

# 2. Green: 최소 구현
class User:
    def __init__(self, username, password):
        self.username = username
        self.password = password

    def login(self):
        return True  # 일단 통과만 시킴

# 3. Refactor: 실제 로직 구현
class User:
    def __init__(self, username, password):
        self.username = username
        self.password = password

    def login(self):
        # 실제 인증 로직
        return authenticate(self.username, self.password)

# 4. Commit: 테스트가 통과하면 커밋
```

### 예시 2: 버그 수정

```python
# 1. Red: 버그를 재현하는 테스트 작성
def test_divide_by_zero():
    with pytest.raises(ZeroDivisionError):
        calculate(10, 0, 'divide')

# 2. Green: 버그 수정
def calculate(a, b, operation):
    if operation == 'divide':
        if b == 0:
            raise ZeroDivisionError("Cannot divide by zero")
        return a / b

# 3. Refactor: 필요시 코드 정리
# 4. Commit: 테스트 통과 후 커밋
```

## 커밋 규칙

- **테스트가 통과할 때만 커밋**
- **각 커밋은 논리적으로 완전해야 함**
- **구조적 변경과 행동적 변경은 별도 커밋**

### 좋은 커밋 예시

```
커밋 1: 리팩토링: User 클래스 메서드 분리
커밋 2: 기능: 사용자 로그인 기능 추가
커밋 3: 테스트: 로그인 실패 케이스 추가
```

### 나쁜 커밋 예시

```
❌ 커밋 1: User 클래스 리팩토링하고 로그인 기능도 추가
   (구조적 변경과 행동적 변경을 한 커밋에 포함)
```

## 참고 자료

- [SKILL.md](SKILL.md) - 스킬 정의 및 상세 가이드
- Kent Beck's "Test-Driven Development: By Example"
- Kent Beck's "Tidy First?: A Personal Exercise in Empirical Software Design"

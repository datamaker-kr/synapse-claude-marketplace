# API Documentation

> {{PROJECT_NAME}} REST API 문서

## 📋 목차

1. [개요](#개요)
2. [인증](#인증)
3. [엔드포인트](#엔드포인트)
4. [에러 처리](#에러-처리)
5. [Rate Limiting](#rate-limiting)

## 🌐 개요

### Base URL

```
Development: http://localhost:{{PORT}}/api
Production: https://{{DOMAIN}}/api
```

### API 버전

현재 버전: `v1`

모든 엔드포인트는 `/api/v1/` 경로를 사용합니다.

### 응답 형식

모든 API 응답은 JSON 형식입니다.

**성공 응답**:
```json
{
  "success": true,
  "data": {
    // 응답 데이터
  },
  "message": "요청이 성공적으로 처리되었습니다" // OPTIONAL
}
```

**에러 응답**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": {} // OPTIONAL
  }
}
```

## 🔐 인증

### 인증 방식

이 API는 **{{AUTH_METHOD}}** 방식을 사용합니다.

#### JWT 인증 [if AUTH_METHOD == JWT]

로그인 후 받은 JWT 토큰을 모든 요청의 헤더에 포함:

```http
Authorization: Bearer <your_jwt_token>
```

**토큰 유효기간**: {{TOKEN_EXPIRY}} (예: 24시간)

**토큰 갱신**: `/api/v1/auth/refresh` 엔드포인트 사용

#### OAuth 2.0 [if AUTH_METHOD == OAuth]

OAuth 2.0 플로우:
1. 사용자를 `/api/v1/oauth/authorize`로 리다이렉트
2. 사용자가 권한 승인
3. 콜백 URL로 authorization code 수신
4. `/api/v1/oauth/token`에서 access token 교환

#### API Key [if AUTH_METHOD == API_Key]

API Key를 헤더에 포함:

```http
X-API-Key: <your_api_key>
```

### 인증 예시

**로그인 요청**:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**로그인 응답**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

**인증된 요청**:
```http
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📡 엔드포인트

### 인증 엔드포인트

#### POST `/api/v1/auth/login`

사용자 로그인

**요청 바디**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "string",
    "user": {
      "id": "number",
      "email": "string",
      "name": "string"
    }
  }
}
```

**에러**:
- `401 Unauthorized`: 잘못된 자격 증명
- `400 Bad Request`: 유효하지 않은 입력

---

#### POST `/api/v1/auth/register`

새 사용자 등록

**요청 바디**:
```json
{
  "email": "string (required)",
  "password": "string (required, min 8 chars)",
  "name": "string (required)"
}
```

**응답** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "number",
      "email": "string",
      "name": "string"
    },
    "message": "회원가입이 완료되었습니다"
  }
}
```

**에러**:
- `409 Conflict`: 이메일이 이미 존재
- `400 Bad Request`: 유효하지 않은 입력

---

#### POST `/api/v1/auth/logout`

사용자 로그아웃

**헤더**:
```http
Authorization: Bearer <token>
```

**응답** (200 OK):
```json
{
  "success": true,
  "message": "로그아웃되었습니다"
}
```

---

### [리소스 이름] 엔드포인트

#### GET `/api/v1/[resources]`

[리소스] 목록 조회

**쿼리 파라미터**:
- `page` (number, optional): 페이지 번호 (기본값: 1)
- `limit` (number, optional): 페이지당 항목 수 (기본값: 10, 최대: 100)
- `sort` (string, optional): 정렬 필드
- `order` (string, optional): 정렬 순서 (`asc` 또는 `desc`)
- `filter` (string, optional): 필터 조건

**예시 요청**:
```http
GET /api/v1/[resources]?page=1&limit=10&sort=created_at&order=desc
Authorization: Bearer <token>
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        // 리소스 필드들
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "total_pages": 10
    }
  }
}
```

---

#### GET `/api/v1/[resources]/{id}`

특정 [리소스] 조회

**경로 파라미터**:
- `id` (number, required): 리소스 ID

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    // 리소스 필드들
  }
}
```

**에러**:
- `404 Not Found`: 리소스가 존재하지 않음
- `403 Forbidden`: 접근 권한 없음

---

#### POST `/api/v1/[resources]`

새 [리소스] 생성

**요청 바디**:
```json
{
  "field1": "string (required)",
  "field2": "number (optional)",
  // 리소스 필드들
}
```

**응답** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "field1": "value",
    "field2": 123,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**에러**:
- `400 Bad Request`: 유효하지 않은 입력
- `403 Forbidden`: 권한 없음

---

#### PUT `/api/v1/[resources]/{id}`

[리소스] 전체 업데이트

**경로 파라미터**:
- `id` (number, required): 리소스 ID

**요청 바디**:
```json
{
  "field1": "string (required)",
  "field2": "number (optional)"
}
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "field1": "updated_value",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

#### PATCH `/api/v1/[resources]/{id}`

[리소스] 부분 업데이트

**경로 파라미터**:
- `id` (number, required): 리소스 ID

**요청 바디** (변경할 필드만):
```json
{
  "field1": "new_value"
}
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "field1": "new_value",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

#### DELETE `/api/v1/[resources]/{id}`

[리소스] 삭제

**경로 파라미터**:
- `id` (number, required): 리소스 ID

**응답** (200 OK):
```json
{
  "success": true,
  "message": "리소스가 삭제되었습니다"
}
```

**에러**:
- `404 Not Found`: 리소스가 존재하지 않음
- `403 Forbidden`: 삭제 권한 없음

---

## ❌ 에러 처리

### HTTP 상태 코드

- `200 OK`: 요청 성공
- `201 Created`: 리소스 생성 성공
- `204 No Content`: 요청 성공 (응답 본문 없음)
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 필요
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 충돌 (예: 중복 이메일)
- `422 Unprocessable Entity`: 유효성 검증 실패
- `429 Too Many Requests`: Rate limit 초과
- `500 Internal Server Error`: 서버 에러

### 에러 응답 형식

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 친화적인 에러 메시지",
    "details": {
      "field": "field_name",
      "reason": "구체적인 에러 이유"
    }
  }
}
```

### 에러 코드 목록

| 코드 | 설명 | HTTP 상태 |
|------|------|-----------|
| `INVALID_CREDENTIALS` | 잘못된 로그인 정보 | 401 |
| `UNAUTHORIZED` | 인증 필요 | 401 |
| `FORBIDDEN` | 권한 없음 | 403 |
| `NOT_FOUND` | 리소스 없음 | 404 |
| `VALIDATION_ERROR` | 유효성 검증 실패 | 422 |
| `DUPLICATE_EMAIL` | 이메일 중복 | 409 |
| `RATE_LIMIT_EXCEEDED` | Rate limit 초과 | 429 |
| `INTERNAL_ERROR` | 서버 에러 | 500 |

### 유효성 검증 에러 예시

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 유효하지 않습니다",
    "details": {
      "email": "유효한 이메일 주소를 입력하세요",
      "password": "비밀번호는 최소 8자 이상이어야 합니다"
    }
  }
}
```

## ⏱️ Rate Limiting

API 남용 방지를 위한 Rate Limiting 적용:

### 제한 규칙

- **인증된 요청**: 분당 60회
- **미인증 요청**: 분당 10회
- **로그인 엔드포인트**: 분당 5회

### Rate Limit 헤더

응답에 다음 헤더 포함:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640000000
```

### Rate Limit 초과 시

HTTP 429 응답:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "요청 횟수 제한을 초과했습니다. 잠시 후 다시 시도하세요",
    "details": {
      "retry_after": 60
    }
  }
}
```

## 📝 예제 코드

### JavaScript (Fetch API)

```javascript
// 로그인
const login = async (email, password) => {
  const response = await fetch('{{BASE_URL}}/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('token', data.data.token);
    return data.data.user;
  } else {
    throw new Error(data.error.message);
  }
};

// 인증된 요청
const fetchUserProfile = async () => {
  const token = localStorage.getItem('token');

  const response = await fetch('{{BASE_URL}}/api/v1/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data.data;
};
```

### Python (requests)

```python
import requests

BASE_URL = "{{BASE_URL}}/api/v1"

# 로그인
def login(email, password):
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )

    data = response.json()

    if data["success"]:
        token = data["data"]["token"]
        return token
    else:
        raise Exception(data["error"]["message"])

# 인증된 요청
def get_user_profile(token):
    response = requests.get(
        f"{BASE_URL}/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )

    data = response.json()
    return data["data"]
```

### cURL

```bash
# 로그인
curl -X POST {{BASE_URL}}/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 인증된 요청
curl -X GET {{BASE_URL}}/api/v1/users/me \
  -H "Authorization: Bearer <your_token>"
```

## 🔗 관련 문서

- [Architecture Documentation](architecture.md)
- [프로젝트 README](../README.md)
- [OpenAPI Specification](openapi.yaml) [OPTIONAL]

---

**참고**:
- 이 문서는 docs-bootstrapper에 의해 자동 생성되었습니다.
- 실제 API 엔드포인트와 필드를 추가하여 업데이트하세요.
- [리소스 이름] 부분을 실제 리소스명으로 교체하세요.
- 프로젝트별 특화된 엔드포인트를 추가하세요.

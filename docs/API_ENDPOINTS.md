# API 엔드포인트 설계

## Base URL
```
Production: https://api.interior-app.com/v1
Staging: https://api-staging.interior-app.com/v1
```

---

## 1. 인증 (Auth)

### POST /auth/google
Google OAuth 로그인/회원가입

**Request:**
```json
{
  "idToken": "google_id_token_here"
}
```

**Response (200):**
```json
{
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "홍길동",
    "profileImage": "https://...",
    "userType": "customer",
    "isNewUser": true
  }
}
```

### POST /auth/refresh
토큰 갱신

**Request:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response (200):**
```json
{
  "accessToken": "new_jwt_access_token",
  "refreshToken": "new_jwt_refresh_token"
}
```

### POST /auth/logout
로그아웃

**Headers:** `Authorization: Bearer {accessToken}`

**Response (200):**
```json
{
  "message": "로그아웃 되었습니다"
}
```

### PUT /auth/user-type
회원 유형 설정 (최초 가입 시)

**Headers:** `Authorization: Bearer {accessToken}`

**Request:**
```json
{
  "userType": "customer" | "contractor"
}
```

---

## 2. 사용자 (Users)

### GET /users/me
내 정보 조회

**Headers:** `Authorization: Bearer {accessToken}`

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@gmail.com",
  "name": "홍길동",
  "profileImage": "https://...",
  "userType": "customer",
  "phone": "010-1234-5678",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### PATCH /users/me
내 정보 수정

**Request:**
```json
{
  "name": "김철수",
  "phone": "010-9876-5432",
  "profileImage": "https://..."
}
```

---

## 3. 시공업체 (Contractors)

### POST /contractors/apply
업체 가입 신청

**Headers:** `Authorization: Bearer {accessToken}`

**Request:**
```json
{
  "companyName": "행복인테리어",
  "businessNumber": "123-45-67890",
  "description": "20년 경력의 인테리어 전문 업체입니다",
  "specialties": ["bathroom", "kitchen", "full_remodel"],
  "serviceAreas": ["서울", "경기"],
  "contactPhone": "02-1234-5678",
  "contactEmail": "contact@company.com"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "status": "pending",
  "message": "가입 신청이 완료되었습니다. 심사 후 승인됩니다."
}
```

### GET /contractors/:id
업체 상세 조회

**Response (200):**
```json
{
  "id": "uuid",
  "companyName": "행복인테리어",
  "description": "20년 경력의 인테리어 전문 업체입니다",
  "specialties": ["bathroom", "kitchen", "full_remodel"],
  "serviceAreas": ["서울", "경기"],
  "profileImage": "https://...",
  "portfolioCount": 15,
  "contractCount": 50,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### GET /contractors/me
내 업체 정보 조회 (업체용)

### PATCH /contractors/me
내 업체 정보 수정 (업체용)

---

## 4. 포트폴리오 (Portfolios)

### GET /portfolios
시공 사례 목록 (피드)

**Query Parameters:**
- `category`: 카테고리 필터 (full, bathroom, kitchen 등)
- `city`: 지역 필터 (서울, 경기 등)
- `cursor`: 페이지네이션 커서
- `limit`: 페이지 크기 (기본 20)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "30평 아파트 전체 리모델링",
      "thumbnailUrl": "https://...",
      "category": "full",
      "areaSize": 30,
      "locationCity": "서울",
      "locationDistrict": "강남구",
      "likeCount": 120,
      "isLiked": false,
      "isSaved": true,
      "contractor": {
        "id": "uuid",
        "companyName": "행복인테리어",
        "profileImage": "https://..."
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "nextCursor": "cursor_string",
  "hasMore": true
}
```

### GET /portfolios/:id
시공 사례 상세

**Response (200):**
```json
{
  "id": "uuid",
  "title": "30평 아파트 전체 리모델링",
  "description": "모던한 스타일로 전체 리모델링했습니다...",
  "category": "full",
  "subCategory": null,
  "apartmentName": "래미안 아파트",
  "areaSize": 30,
  "locationCity": "서울",
  "locationDistrict": "강남구",
  "durationDays": 45,
  "costMin": 5000,
  "costMax": 6000,
  "likeCount": 120,
  "saveCount": 45,
  "viewCount": 1500,
  "isLiked": false,
  "isSaved": true,
  "completedAt": "2024-01-15",
  "images": [
    {
      "id": "uuid",
      "imageUrl": "https://...",
      "thumbnailUrl": "https://...",
      "imageType": "after",
      "displayOrder": 0
    }
  ],
  "contractor": {
    "id": "uuid",
    "companyName": "행복인테리어",
    "profileImage": "https://...",
    "description": "20년 경력...",
    "portfolioCount": 15
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### POST /portfolios
시공 사례 등록 (업체용)

**Headers:** `Authorization: Bearer {accessToken}`

**Request:**
```json
{
  "title": "30평 아파트 전체 리모델링",
  "description": "모던한 스타일로...",
  "category": "full",
  "subCategory": null,
  "apartmentName": "래미안 아파트",
  "areaSize": 30,
  "locationCity": "서울",
  "locationDistrict": "강남구",
  "durationDays": 45,
  "costMin": 5000,
  "costMax": 6000,
  "completedAt": "2024-01-15",
  "images": [
    {
      "imageUrl": "https://...",
      "imageType": "before",
      "displayOrder": 0
    },
    {
      "imageUrl": "https://...",
      "imageType": "after",
      "displayOrder": 1
    }
  ]
}
```

### PATCH /portfolios/:id
시공 사례 수정 (업체용)

### DELETE /portfolios/:id
시공 사례 삭제 (업체용)

### POST /portfolios/:id/like
좋아요

### DELETE /portfolios/:id/like
좋아요 취소

### POST /portfolios/:id/save
저장

### DELETE /portfolios/:id/save
저장 취소

### GET /portfolios/saved
저장한 시공 사례 목록

---

## 5. 견적 요청 (Quotes)

### POST /quotes/request
견적 요청

**Headers:** `Authorization: Bearer {accessToken}`

**Request:**
```json
{
  "contractorId": "uuid",
  "portfolioId": "uuid",
  "category": "bathroom",
  "description": "욕실 리모델링 희망합니다...",
  "apartmentName": "래미안",
  "areaSize": 30,
  "locationCity": "서울",
  "locationDistrict": "강남구",
  "budgetMin": 300,
  "budgetMax": 500,
  "desiredStartDate": "2024-03-01",
  "imageUrls": ["https://...", "https://..."]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "status": "pending",
  "message": "견적 요청이 전송되었습니다"
}
```

### GET /quotes/requests
내 견적 요청 목록 (고객용)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "category": "bathroom",
      "description": "욕실 리모델링...",
      "status": "responded",
      "contractor": {
        "id": "uuid",
        "companyName": "행복인테리어"
      },
      "response": {
        "estimatedCost": 400,
        "estimatedDuration": 14
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /quotes/received
받은 견적 요청 목록 (업체용)

### GET /quotes/requests/:id
견적 요청 상세

### POST /quotes/requests/:id/respond
견적 응답 (업체용)

**Request:**
```json
{
  "estimatedCost": 400,
  "estimatedDuration": 14,
  "description": "상담 후 정확한 견적 안내드리겠습니다..."
}
```

### POST /quotes/requests/:id/accept
견적 수락 (고객용)

### POST /quotes/requests/:id/reject
견적 거절 (고객용)

---

## 6. 채팅 (Chat)

### GET /chat/rooms
채팅방 목록

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "otherUser": {
        "id": "uuid",
        "name": "행복인테리어",
        "profileImage": "https://..."
      },
      "lastMessage": "네, 내일 방문 가능합니다",
      "lastMessageAt": "2024-01-01T10:30:00Z",
      "unreadCount": 2
    }
  ]
}
```

### GET /chat/rooms/:id
채팅방 상세 (메시지 목록)

**Query Parameters:**
- `cursor`: 페이지네이션 커서
- `limit`: 페이지 크기 (기본 50)

**Response (200):**
```json
{
  "room": {
    "id": "uuid",
    "otherUser": {
      "id": "uuid",
      "name": "행복인테리어",
      "profileImage": "https://..."
    }
  },
  "messages": [
    {
      "id": "uuid",
      "senderId": "uuid",
      "content": "안녕하세요, 견적 문의드립니다",
      "messageType": "text",
      "isRead": true,
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ],
  "nextCursor": "cursor_string"
}
```

### POST /chat/rooms
채팅방 생성 (또는 기존 방 반환)

**Request:**
```json
{
  "contractorId": "uuid",
  "quoteRequestId": "uuid"
}
```

### POST /chat/rooms/:id/messages
메시지 전송 (REST fallback)

**Request:**
```json
{
  "content": "안녕하세요",
  "messageType": "text"
}
```

### POST /chat/rooms/:id/read
메시지 읽음 처리

---

## 7. 계약 (Contracts)

### POST /contracts
계약 확정 (업체용)

**Request:**
```json
{
  "quoteRequestId": "uuid",
  "quoteResponseId": "uuid",
  "contractAmount": 4500000,
  "startDate": "2024-03-01",
  "endDate": "2024-03-15"
}
```

### GET /contracts
계약 목록

### GET /contracts/:id
계약 상세

### PATCH /contracts/:id/status
계약 상태 변경 (업체용)

**Request:**
```json
{
  "status": "in_progress" | "completed" | "cancelled"
}
```

---

## 8. 파일 업로드 (Uploads)

### POST /uploads/presigned-url
S3 Presigned URL 발급

**Request:**
```json
{
  "fileName": "image.jpg",
  "fileType": "image/jpeg",
  "purpose": "portfolio" | "quote" | "profile" | "chat"
}
```

**Response (200):**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/...",
  "fileUrl": "https://cdn.interior-app.com/images/...",
  "expiresIn": 3600
}
```

---

## 9. 알림 (Notifications)

### GET /notifications
알림 목록

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "새로운 견적 요청",
      "body": "홍길동님이 견적을 요청했습니다",
      "notificationType": "quote_request",
      "referenceId": "uuid",
      "referenceType": "quote_request",
      "isRead": false,
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### POST /notifications/:id/read
알림 읽음 처리

### POST /notifications/read-all
전체 읽음 처리

### GET /notifications/unread-count
읽지 않은 알림 수

---

## 10. 검색 (Search)

### GET /search/portfolios
시공 사례 검색

**Query Parameters:**
- `q`: 검색어
- `category`: 카테고리
- `city`: 지역
- `minCost`: 최소 비용
- `maxCost`: 최대 비용

### GET /search/contractors
업체 검색

**Query Parameters:**
- `q`: 검색어
- `specialty`: 전문분야
- `city`: 서비스 지역

---

## 11. 관리자 (Admin)

### GET /admin/contractors/pending
승인 대기 업체 목록

### POST /admin/contractors/:id/approve
업체 승인

### POST /admin/contractors/:id/reject
업체 반려

**Request:**
```json
{
  "reason": "사업자등록증이 유효하지 않습니다"
}
```

### GET /admin/contracts
전체 계약 목록 (정산용)

---

## WebSocket Events (Chat)

### Connection
```javascript
socket.connect('wss://api.interior-app.com', {
  auth: { token: 'jwt_access_token' }
});
```

### Events

**Client → Server:**
- `join_room`: 채팅방 입장
- `leave_room`: 채팅방 퇴장
- `send_message`: 메시지 전송
- `typing`: 타이핑 중
- `read_messages`: 메시지 읽음

**Server → Client:**
- `new_message`: 새 메시지 수신
- `user_typing`: 상대방 타이핑 중
- `messages_read`: 메시지 읽음 처리됨

---

## 에러 응답 형식

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "유효하지 않은 요청입니다",
  "details": {
    "field": "email",
    "reason": "이메일 형식이 올바르지 않습니다"
  }
}
```

### 에러 코드

| Code | Description |
|------|-------------|
| 400 | Bad Request - 잘못된 요청 |
| 401 | Unauthorized - 인증 필요 |
| 403 | Forbidden - 권한 없음 |
| 404 | Not Found - 리소스 없음 |
| 409 | Conflict - 중복 데이터 |
| 422 | Unprocessable Entity - 유효성 검증 실패 |
| 429 | Too Many Requests - 요청 제한 초과 |
| 500 | Internal Server Error - 서버 오류 |

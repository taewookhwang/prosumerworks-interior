# 데이터베이스 스키마 설계

## ERD 개요

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    users    │────<│  contractors │     │  portfolios │
└─────────────┘     └──────────────┘────<└─────────────┘
       │                   │                    │
       │                   │              ┌─────┴─────┐
       │                   │              │           │
       ▼                   ▼              ▼           ▼
┌─────────────┐     ┌──────────────┐  ┌────────┐ ┌────────┐
│   saves     │     │quote_requests│  │ likes  │ │ images │
└─────────────┘     └──────────────┘  └────────┘ └────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │quote_response│
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  chat_rooms  │────<│   messages   │
                    └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  contracts   │
                    └──────────────┘
```

---

## 테이블 상세

### 1. users (사용자)

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    profile_image   VARCHAR(500),
    user_type       VARCHAR(20) NOT NULL DEFAULT 'customer',  -- customer, contractor, admin
    google_id       VARCHAR(100) UNIQUE,
    phone           VARCHAR(20),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_user_type ON users(user_type);
```

### 2. contractors (시공업체)

```sql
CREATE TABLE contractors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name        VARCHAR(200) NOT NULL,
    business_number     VARCHAR(20) NOT NULL,          -- 사업자등록번호
    description         TEXT,
    specialties         VARCHAR(50)[] DEFAULT '{}',    -- 전문분야 배열
    service_areas       VARCHAR(50)[] DEFAULT '{}',    -- 서비스 지역 배열
    contact_phone       VARCHAR(20),
    contact_email       VARCHAR(255),
    status              VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, suspended
    rejection_reason    TEXT,
    approved_at         TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_contractors_user_id ON contractors(user_id);
CREATE INDEX idx_contractors_status ON contractors(status);
CREATE INDEX idx_contractors_specialties ON contractors USING GIN(specialties);
CREATE INDEX idx_contractors_service_areas ON contractors USING GIN(service_areas);
```

### 3. portfolios (시공 사례)

```sql
CREATE TABLE portfolios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id   UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(50) NOT NULL,              -- 전체, 욕실, 주방, 거실 등
    sub_category    VARCHAR(50),                       -- 페인트, 타일 등
    apartment_name  VARCHAR(100),                      -- 아파트명
    area_size       INTEGER,                           -- 평수
    location_city   VARCHAR(50),                       -- 시/도
    location_district VARCHAR(50),                     -- 구/군
    duration_days   INTEGER,                           -- 시공 기간 (일)
    cost_min        INTEGER,                           -- 최소 비용
    cost_max        INTEGER,                           -- 최대 비용
    like_count      INTEGER DEFAULT 0,
    save_count      INTEGER DEFAULT 0,
    view_count      INTEGER DEFAULT 0,
    is_published    BOOLEAN DEFAULT true,
    completed_at    DATE,                              -- 시공 완료일
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_portfolios_contractor_id ON portfolios(contractor_id);
CREATE INDEX idx_portfolios_category ON portfolios(category);
CREATE INDEX idx_portfolios_location ON portfolios(location_city, location_district);
CREATE INDEX idx_portfolios_created_at ON portfolios(created_at DESC);
CREATE INDEX idx_portfolios_like_count ON portfolios(like_count DESC);
```

### 4. portfolio_images (시공 사례 이미지)

```sql
CREATE TABLE portfolio_images (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id    UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    image_url       VARCHAR(500) NOT NULL,
    thumbnail_url   VARCHAR(500),
    image_type      VARCHAR(20) DEFAULT 'after',       -- before, after, progress
    display_order   INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_portfolio_images_portfolio_id ON portfolio_images(portfolio_id);
```

### 5. portfolio_likes (좋아요)

```sql
CREATE TABLE portfolio_likes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id    UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(portfolio_id, user_id)
);

-- Indexes
CREATE INDEX idx_portfolio_likes_user_id ON portfolio_likes(user_id);
```

### 6. portfolio_saves (저장)

```sql
CREATE TABLE portfolio_saves (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id    UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(portfolio_id, user_id)
);

-- Indexes
CREATE INDEX idx_portfolio_saves_user_id ON portfolio_saves(user_id);
```

### 7. quote_requests (견적 요청)

```sql
CREATE TABLE quote_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contractor_id       UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    portfolio_id        UUID REFERENCES portfolios(id),    -- 어떤 사례 보고 요청했는지
    category            VARCHAR(50) NOT NULL,
    description         TEXT NOT NULL,
    apartment_name      VARCHAR(100),
    area_size           INTEGER,
    location_city       VARCHAR(50),
    location_district   VARCHAR(50),
    budget_min          INTEGER,
    budget_max          INTEGER,
    desired_start_date  DATE,
    status              VARCHAR(20) DEFAULT 'pending',     -- pending, responded, accepted, rejected, completed
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_quote_requests_customer_id ON quote_requests(customer_id);
CREATE INDEX idx_quote_requests_contractor_id ON quote_requests(contractor_id);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_created_at ON quote_requests(created_at DESC);
```

### 8. quote_request_images (견적 요청 이미지)

```sql
CREATE TABLE quote_request_images (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_request_id    UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    image_url           VARCHAR(500) NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_quote_request_images_request_id ON quote_request_images(quote_request_id);
```

### 9. quote_responses (견적 응답)

```sql
CREATE TABLE quote_responses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_request_id    UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    contractor_id       UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    estimated_cost      INTEGER NOT NULL,
    estimated_duration  INTEGER,                           -- 예상 기간 (일)
    description         TEXT,
    is_accepted         BOOLEAN DEFAULT false,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(quote_request_id, contractor_id)
);

-- Indexes
CREATE INDEX idx_quote_responses_request_id ON quote_responses(quote_request_id);
CREATE INDEX idx_quote_responses_contractor_id ON quote_responses(contractor_id);
```

### 10. chat_rooms (채팅방)

```sql
CREATE TABLE chat_rooms (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contractor_id       UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    quote_request_id    UUID REFERENCES quote_requests(id),
    last_message        TEXT,
    last_message_at     TIMESTAMP,
    customer_unread     INTEGER DEFAULT 0,
    contractor_unread   INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(customer_id, contractor_id)
);

-- Indexes
CREATE INDEX idx_chat_rooms_customer_id ON chat_rooms(customer_id);
CREATE INDEX idx_chat_rooms_contractor_id ON chat_rooms(contractor_id);
CREATE INDEX idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);
```

### 11. messages (메시지)

```sql
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_room_id    UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    message_type    VARCHAR(20) DEFAULT 'text',        -- text, image, quote
    is_read         BOOLEAN DEFAULT false,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

### 12. contracts (계약)

```sql
CREATE TABLE contracts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_request_id    UUID NOT NULL REFERENCES quote_requests(id),
    quote_response_id   UUID NOT NULL REFERENCES quote_responses(id),
    customer_id         UUID NOT NULL REFERENCES users(id),
    contractor_id       UUID NOT NULL REFERENCES contractors(id),
    contract_amount     INTEGER NOT NULL,
    commission_rate     DECIMAL(5,2) DEFAULT 10.00,    -- 수수료율 (%)
    commission_amount   INTEGER,                        -- 수수료 금액
    status              VARCHAR(20) DEFAULT 'confirmed', -- confirmed, in_progress, completed, cancelled
    start_date          DATE,
    end_date            DATE,
    completed_at        TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX idx_contracts_contractor_id ON contracts(contractor_id);
CREATE INDEX idx_contracts_status ON contracts(status);
```

### 13. notifications (알림)

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    body            TEXT,
    notification_type VARCHAR(50) NOT NULL,            -- quote_request, quote_response, message, contract
    reference_id    UUID,                              -- 관련 엔티티 ID
    reference_type  VARCHAR(50),                       -- quote_request, chat_room, contract
    is_read         BOOLEAN DEFAULT false,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
```

### 14. refresh_tokens (리프레시 토큰)

```sql
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(500) NOT NULL UNIQUE,
    device_info     VARCHAR(200),
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

---

## 카테고리 상수

```sql
-- 공간 카테고리
CREATE TYPE space_category AS ENUM (
    'full',          -- 전체 리모델링
    'living_room',   -- 거실
    'kitchen',       -- 주방
    'bathroom',      -- 욕실
    'bedroom',       -- 침실
    'balcony',       -- 발코니/베란다
    'entryway',      -- 현관
    'dressing_room'  -- 드레스룸
);

-- 시공 유형
CREATE TYPE work_type AS ENUM (
    'full_remodel',  -- 전체 리모델링
    'partial',       -- 부분 시공
    'paint',         -- 페인트/도배
    'flooring',      -- 바닥 시공
    'tile',          -- 타일 시공
    'cabinet',       -- 붙박이장/수납
    'lighting'       -- 조명 시공
);

-- 업체 상태
CREATE TYPE contractor_status AS ENUM (
    'pending',       -- 심사 대기
    'approved',      -- 승인됨
    'rejected',      -- 반려됨
    'suspended'      -- 정지됨
);

-- 견적 상태
CREATE TYPE quote_status AS ENUM (
    'pending',       -- 대기 중
    'responded',     -- 응답 완료
    'accepted',      -- 수락됨
    'rejected',      -- 거절됨
    'completed'      -- 완료됨
);

-- 계약 상태
CREATE TYPE contract_status AS ENUM (
    'confirmed',     -- 계약 확정
    'in_progress',   -- 시공 중
    'completed',     -- 완료
    'cancelled'      -- 취소
);
```

---

## 인덱스 요약

### 자주 사용되는 쿼리 최적화

1. **피드 조회**: `portfolios.created_at DESC`, `portfolios.category`
2. **업체 검색**: `contractors.specialties`, `contractors.service_areas`
3. **채팅 목록**: `chat_rooms.last_message_at DESC`
4. **알림 조회**: `notifications.user_id`, `notifications.is_read`

---

## 마이그레이션 순서

1. users
2. contractors
3. portfolios
4. portfolio_images
5. portfolio_likes
6. portfolio_saves
7. quote_requests
8. quote_request_images
9. quote_responses
10. chat_rooms
11. messages
12. contracts
13. notifications
14. refresh_tokens

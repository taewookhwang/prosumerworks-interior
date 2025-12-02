# 프로젝트 구조

## 전체 모노레포 구조

```
interior-app/
├── apps/
│   ├── mobile/          # React Native 앱
│   └── api/             # NestJS 백엔드
├── packages/
│   └── shared/          # 공유 타입, 유틸리티
├── docs/                # 문서
├── agents/              # AI 에이전트 정의
├── infra/               # Terraform/AWS 설정
└── scripts/             # 빌드/배포 스크립트
```

---

## Mobile (React Native)

```
apps/mobile/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # 앱 진입점
│   │   ├── providers/                 # Context Providers
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── QueryProvider.tsx
│   │   │   └── index.tsx
│   │   └── navigation/
│   │       ├── RootNavigator.tsx      # 루트 네비게이션
│   │       ├── CustomerTabs.tsx       # 고객용 탭
│   │       ├── ContractorTabs.tsx     # 업체용 탭
│   │       └── AuthStack.tsx          # 인증 스택
│   │
│   ├── features/                      # 기능별 모듈
│   │   ├── auth/
│   │   │   ├── screens/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── UserTypeScreen.tsx
│   │   │   │   └── ContractorApplyScreen.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── api/
│   │   │   │   └── authApi.ts
│   │   │   └── store/
│   │   │       └── authStore.ts
│   │   │
│   │   ├── feed/
│   │   │   ├── screens/
│   │   │   │   ├── FeedScreen.tsx
│   │   │   │   └── PortfolioDetailScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── PortfolioCard.tsx
│   │   │   │   ├── CategoryFilter.tsx
│   │   │   │   └── MasonryFeed.tsx
│   │   │   ├── hooks/
│   │   │   │   └── usePortfolios.ts
│   │   │   └── api/
│   │   │       └── feedApi.ts
│   │   │
│   │   ├── portfolio/                 # 시공 사례 (업체)
│   │   │   ├── screens/
│   │   │   │   ├── MyPortfoliosScreen.tsx
│   │   │   │   └── UploadPortfolioScreen.tsx
│   │   │   ├── components/
│   │   │   └── api/
│   │   │
│   │   ├── contractor/                # 업체 프로필
│   │   │   ├── screens/
│   │   │   │   └── ContractorProfileScreen.tsx
│   │   │   ├── components/
│   │   │   └── api/
│   │   │
│   │   ├── quote/                     # 견적 요청
│   │   │   ├── screens/
│   │   │   │   ├── QuoteRequestScreen.tsx
│   │   │   │   ├── MyQuotesScreen.tsx       # 고객용
│   │   │   │   ├── ReceivedQuotesScreen.tsx # 업체용
│   │   │   │   └── QuoteDetailScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── QuoteForm.tsx
│   │   │   │   └── QuoteCard.tsx
│   │   │   └── api/
│   │   │
│   │   ├── chat/
│   │   │   ├── screens/
│   │   │   │   ├── ChatListScreen.tsx
│   │   │   │   └── ChatRoomScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   └── ChatInput.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useChat.ts
│   │   │   └── api/
│   │   │
│   │   ├── saved/
│   │   │   ├── screens/
│   │   │   │   └── SavedScreen.tsx
│   │   │   └── api/
│   │   │
│   │   └── profile/
│   │       ├── screens/
│   │       │   ├── ProfileScreen.tsx
│   │       │   └── EditProfileScreen.tsx
│   │       └── api/
│   │
│   ├── shared/
│   │   ├── components/               # 공통 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   └── ImageGallery.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useRefreshOnFocus.ts
│   │   │   └── useDebounce.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   └── storage.ts
│   │   │
│   │   └── constants/
│   │       ├── categories.ts
│   │       └── config.ts
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts             # Axios 인스턴스
│   │   │   └── interceptors.ts
│   │   ├── storage/
│   │   │   └── mmkv.ts
│   │   ├── notification/
│   │   │   └── pushNotification.ts
│   │   └── socket/
│   │       └── chatSocket.ts
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   │
│   └── types/
│       ├── user.ts
│       ├── portfolio.ts
│       ├── quote.ts
│       ├── chat.ts
│       └── navigation.ts
│
├── ios/
├── android/
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── .env.example
```

---

## Backend (NestJS)

```
apps/api/
├── src/
│   ├── main.ts                        # 진입점
│   ├── app.module.ts                  # 루트 모듈
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── google.strategy.ts
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── decorators/
│   │   │   │   └── current-user.decorator.ts
│   │   │   └── dto/
│   │   │       └── auth.dto.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   └── dto/
│   │   │
│   │   ├── contractors/               # 시공업체
│   │   │   ├── contractors.module.ts
│   │   │   ├── contractors.controller.ts
│   │   │   ├── contractors.service.ts
│   │   │   ├── entities/
│   │   │   │   └── contractor.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-contractor.dto.ts
│   │   │       └── update-contractor.dto.ts
│   │   │
│   │   ├── portfolios/                # 시공 사례
│   │   │   ├── portfolios.module.ts
│   │   │   ├── portfolios.controller.ts
│   │   │   ├── portfolios.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── portfolio.entity.ts
│   │   │   │   └── portfolio-image.entity.ts
│   │   │   └── dto/
│   │   │
│   │   ├── quotes/                    # 견적 요청
│   │   │   ├── quotes.module.ts
│   │   │   ├── quotes.controller.ts
│   │   │   ├── quotes.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── quote-request.entity.ts
│   │   │   │   └── quote-response.entity.ts
│   │   │   └── dto/
│   │   │
│   │   ├── chat/
│   │   │   ├── chat.module.ts
│   │   │   ├── chat.gateway.ts        # WebSocket
│   │   │   ├── chat.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── chat-room.entity.ts
│   │   │   │   └── message.entity.ts
│   │   │   └── dto/
│   │   │
│   │   ├── contracts/                 # 계약 관리
│   │   │   ├── contracts.module.ts
│   │   │   ├── contracts.controller.ts
│   │   │   ├── contracts.service.ts
│   │   │   ├── entities/
│   │   │   │   └── contract.entity.ts
│   │   │   └── dto/
│   │   │
│   │   ├── uploads/
│   │   │   ├── uploads.module.ts
│   │   │   ├── uploads.controller.ts
│   │   │   └── uploads.service.ts     # S3 presigned URL
│   │   │
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── entities/
│   │   │
│   │   └── admin/                     # 관리자
│   │       ├── admin.module.ts
│   │       ├── admin.controller.ts
│   │       └── admin.service.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   ├── pipes/
│   │   └── utils/
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── aws.config.ts
│   │   └── redis.config.ts
│   │
│   └── database/
│       ├── migrations/
│       └── seeds/
│
├── test/
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env.example
└── Dockerfile
```

---

## Shared Package

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── user.ts
│   │   ├── portfolio.ts
│   │   ├── quote.ts
│   │   └── common.ts
│   ├── constants/
│   │   └── categories.ts
│   └── utils/
│       └── validation.ts
├── package.json
└── tsconfig.json
```

---

## Infrastructure

```
infra/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── vpc/
│   │   ├── ecs/
│   │   ├── rds/
│   │   ├── elasticache/
│   │   ├── s3/
│   │   └── cloudfront/
│   └── environments/
│       ├── dev/
│       ├── staging/
│       └── prod/
└── docker/
    ├── Dockerfile.api
    └── docker-compose.yml
```

---

## 주요 설정 파일

### package.json (루트)
```json
{
  "name": "interior-app",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "mobile": "yarn workspace @interior/mobile",
    "api": "yarn workspace @interior/api",
    "shared": "yarn workspace @interior/shared"
  }
}
```

### apps/mobile/package.json
```json
{
  "name": "@interior/mobile",
  "version": "1.0.0",
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.x",
    "@shopify/flash-list": "^1.6.0",
    "react-native-fast-image": "^8.6.0",
    "react-native-reanimated": "^3.6.0",
    "@react-navigation/native": "^6.1.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0"
  }
}
```

### apps/api/package.json
```json
{
  "name": "@interior/api",
  "version": "1.0.0",
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/websockets": "^10.0.0",
    "typeorm": "^0.3.0",
    "pg": "^8.0.0",
    "passport-google-oauth20": "^2.0.0",
    "socket.io": "^4.0.0"
  }
}
```

# Pre-Construction Simulation System 구현 계획

## 개요

기존 "김반장 AI + 견적 요청 시스템"을 확장하여, 사용자가 인테리어 시공 전에 **도면 분석 → 철거 계획 → 디자인 시뮬레이션 → 자재 선택 → 통합 견적**까지 가상으로 경험할 수 있는 멀티 에이전트 시스템 구현.

## 워크플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Pre-Construction Simulation Flow                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Space Analysis (공간 분석)                                       │
│     └─ 사용자: 도면 업로드                                           │
│     └─ AI 건축사: 내력벽/비내력벽 분석, 배관 위치 파악               │
│                                                                      │
│  2. Clean Slate (철거 계획)                                          │
│     └─ 사용자: 철거할 벽 선택                                        │
│     └─ AI 건축사: 철거 가능 여부 검증                                │
│     └─ 결과: 구조만 남은 '빈 도화지' 도면                            │
│                                                                      │
│  3. Design & Validation (디자인 시뮬레이션)                          │
│     └─ 사용자: 스타일 요청 (프롬프트/참고 이미지)                    │
│     └─ AI 디자이너: 인테리어 시각화 이미지 생성                      │
│     └─ AI 건축사: 실현 가능성 검증 (배관, 구조 등)                   │
│                                                                      │
│  4. Material Selection (자재 쇼핑)                                   │
│     └─ AI 디자이너: 디자인에 맞는 자재 추천                          │
│     └─ 사용자: 장바구니에 자재 담기                                  │
│                                                                      │
│  5. Simulation Estimate (모의 견적)                                  │
│     └─ 김반장: 철거비 + 자재비 + 인건비 계산                         │
│     └─ 김반장: 공정별 스케줄표 생성                                  │
│     └─ 결과: 통합 시뮬레이션 견적서                                  │
│                                                                      │
│  6. Contractor Matching (업체 매칭) - 기존 기능 연결                 │
│     └─ 시뮬레이션 견적 → 실제 업체에 견적 요청                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 데이터베이스 스키마 확장

### 1.1 새로운 테이블

#### `simulation_projects` - 시뮬레이션 프로젝트
```sql
CREATE TABLE simulation_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',  -- draft, analyzing, planning, designing, estimating, completed

    -- 기본 정보
    property_type VARCHAR(50),           -- apartment, house, office
    area_size FLOAT,                     -- 평수
    location_city VARCHAR(100),
    location_district VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `floor_plans` - 도면 이미지
```sql
CREATE TABLE floor_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES simulation_projects(id) ON DELETE CASCADE,

    original_image_url TEXT NOT NULL,    -- 원본 도면 이미지
    analyzed_image_url TEXT,             -- 분석 결과 오버레이 이미지
    clean_slate_image_url TEXT,          -- 철거 후 빈 도화지 이미지

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `structural_elements` - 구조 요소 (벽, 배관 등)
```sql
CREATE TABLE structural_elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,

    element_type VARCHAR(50) NOT NULL,   -- wall, pipe, electrical, window, door
    sub_type VARCHAR(50),                -- load_bearing, partition (for walls)

    -- 좌표 정보 (도면 내 위치)
    coordinates JSONB NOT NULL,          -- [{x, y}, {x, y}, ...] 폴리곤 좌표

    is_demolishable BOOLEAN DEFAULT true,
    is_selected_for_demolition BOOLEAN DEFAULT false,

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `design_simulations` - 디자인 시뮬레이션
```sql
CREATE TABLE design_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES simulation_projects(id) ON DELETE CASCADE,

    style_prompt TEXT,                   -- 사용자 스타일 요청
    reference_image_urls TEXT[],         -- 참고 이미지들

    generated_image_url TEXT,            -- AI 생성 이미지
    generated_prompt TEXT,               -- AI가 사용한 실제 프롬프트

    is_feasible BOOLEAN,                 -- AI 건축사 검증 결과
    feasibility_notes TEXT,              -- 검증 코멘트

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `materials` - 자재 마스터 데이터
```sql
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,      -- flooring, wall, tile, lighting, furniture
    sub_category VARCHAR(100),

    brand VARCHAR(100),
    model_number VARCHAR(100),

    unit_price INTEGER NOT NULL,         -- 단가 (원)
    unit VARCHAR(50) NOT NULL,           -- sqm, piece, set, meter

    specifications JSONB,                -- 규격 정보
    image_url TEXT,

    -- 시공 관련
    installation_type VARCHAR(50),       -- tile, wood, paint, etc.
    labor_cost_per_unit INTEGER,         -- 시공 인건비 (원/단위)

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `simulation_carts` - 시뮬레이션 자재 장바구니
```sql
CREATE TABLE simulation_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES simulation_projects(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id),

    quantity FLOAT NOT NULL,
    unit_price_snapshot INTEGER,         -- 담을 때 단가 스냅샷

    room_location VARCHAR(100),          -- 적용 위치 (거실, 안방 등)
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `simulation_estimates` - 시뮬레이션 견적
```sql
CREATE TABLE simulation_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES simulation_projects(id) ON DELETE CASCADE,

    -- 비용 내역
    demolition_cost JSONB,               -- 철거비 breakdown
    material_cost JSONB,                 -- 자재비 breakdown
    labor_cost JSONB,                    -- 인건비 breakdown
    overhead_cost JSONB,                 -- 경비 breakdown

    subtotal INTEGER,
    contingency_rate FLOAT DEFAULT 0.1,  -- 예비비 비율
    total_cost INTEGER,

    -- 스케줄
    schedule JSONB,                      -- 공정별 일정
    estimated_days INTEGER,

    -- AI Quote 연결
    ai_quote_id UUID REFERENCES ai_quotes(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 구현 체크리스트

- [ ] PostgreSQL에 테이블 생성
- [ ] TypeORM Entity 클래스 생성
- [ ] NestJS Module 생성 (SimulationModule)

---

## Phase 2: AI 건축사 에이전트 (ArchitectAgent)

### 2.1 역할
- 도면 이미지 분석 → 구조 요소 식별
- 내력벽 vs 비내력벽 분류
- 배관/전기 위치 파악
- 철거 가능 여부 검증

### 2.2 구현 방식

#### Option A: Vision AI 활용 (Gemini Vision)
```python
# ai-service/app/agents/architect_agent.py

class ArchitectAgent:
    """AI 건축사 - 도면 분석 및 구조 검증"""

    async def analyze_floor_plan(self, image_url: str) -> StructuralAnalysis:
        """도면 이미지를 분석하여 구조 요소 추출"""
        # 1. Gemini Vision API로 이미지 분석
        # 2. 벽, 문, 창문, 배관 위치 식별
        # 3. 내력벽 vs 비내력벽 추정
        pass

    async def validate_demolition_plan(
        self,
        structural_map: StructuralMap,
        demolition_selections: List[str]
    ) -> ValidationResult:
        """선택한 철거 계획이 구조적으로 안전한지 검증"""
        pass

    async def check_design_feasibility(
        self,
        design_plan: DesignPlan,
        structural_map: StructuralMap
    ) -> FeasibilityResult:
        """디자인이 구조적으로 실현 가능한지 검증"""
        pass
```

#### Option B: 사용자 보조 방식 (현실적)
```python
# 도면 분석은 기본 라인 추출만 하고,
# 사용자가 직접 벽 타입을 지정하도록 UI 제공
# → MVP에서는 이 방식 권장
```

### 2.3 API 엔드포인트

```
POST /api/simulation/analyze-floor-plan
  - Request: { project_id, image_file }
  - Response: { floor_plan_id, structural_elements[] }

POST /api/simulation/validate-demolition
  - Request: { floor_plan_id, element_ids_to_demolish[] }
  - Response: { is_valid, warnings[], clean_slate_image_url }

POST /api/simulation/check-feasibility
  - Request: { project_id, design_simulation_id }
  - Response: { is_feasible, issues[], suggestions[] }
```

### 2.4 구현 체크리스트

- [ ] ArchitectAgent 클래스 생성
- [ ] Gemini Vision 연동 (도면 분석)
- [ ] 구조 요소 추출 로직
- [ ] 철거 검증 로직
- [ ] 실현 가능성 검증 로직
- [ ] API 엔드포인트 생성

---

## Phase 3: AI 디자이너 에이전트 (DesignerAgent)

### 3.1 역할
- 사용자 스타일 요청 해석
- 인테리어 시각화 이미지 생성
- 디자인에 맞는 자재 추천

### 3.2 구현 방식

```python
# ai-service/app/agents/designer_agent.py

class DesignerAgent:
    """AI 디자이너 - 인테리어 시각화 및 자재 추천"""

    async def generate_design(
        self,
        floor_plan_url: str,
        style_prompt: str,
        reference_images: List[str] = None
    ) -> DesignResult:
        """인테리어 디자인 이미지 생성"""
        # 1. 스타일 프롬프트 분석/강화
        # 2. 이미지 생성 API 호출 (Stable Diffusion / DALL-E)
        # 3. 결과 반환
        pass

    async def recommend_materials(
        self,
        design_image_url: str,
        style_prompt: str,
        area_size: float
    ) -> MaterialRecommendation:
        """디자인에 맞는 자재 추천"""
        # 1. 디자인 이미지 분석
        # 2. 스타일에 맞는 자재 카테고리 선정
        # 3. 면적 기반 수량 계산
        # 4. 자재 DB에서 매칭
        pass
```

### 3.3 이미지 생성 옵션

| 옵션 | 장점 | 단점 | 비용 |
|------|------|------|------|
| Stable Diffusion (Self-hosted) | 무제한, 커스텀 가능 | 서버 필요, 품질 조정 필요 | GPU 서버비 |
| DALL-E 3 API | 고품질, 간편 | 비용, 속도 | $0.04/image |
| Midjourney API | 최고 품질 | 비공식 API | $10/mo~ |
| Replicate | 다양한 모델, 간편 | 종량제 | $0.01~/image |

**권장**: MVP에서는 Replicate 또는 DALL-E 3 사용

### 3.4 API 엔드포인트

```
POST /api/simulation/generate-design
  - Request: { project_id, style_prompt, reference_images[] }
  - Response: { design_simulation_id, generated_image_url }

POST /api/simulation/recommend-materials
  - Request: { project_id, design_simulation_id }
  - Response: { recommendations[] }
```

### 3.5 구현 체크리스트

- [ ] DesignerAgent 클래스 생성
- [ ] 이미지 생성 API 연동 (DALL-E / Replicate)
- [ ] 스타일 프롬프트 강화 로직
- [ ] 자재 추천 로직
- [ ] 자재 마스터 데이터 시드
- [ ] API 엔드포인트 생성

---

## Phase 4: 김반장 에이전트 업그레이드

### 4.1 새로운 역할
- 철거 비용 계산 (면적/작업 난이도 기반)
- 자재 시공비 계산
- 통합 공정표 생성
- 시뮬레이션 견적서 생성

### 4.2 확장 로직

```python
# ai-service/app/agents/manager_agent.py 확장

class ManagerAgent:
    # 기존 기능 유지...

    async def calculate_simulation_estimate(
        self,
        project: SimulationProject,
        demolition_plan: DemolitionPlan,
        cart_items: List[CartItem]
    ) -> SimulationEstimate:
        """시뮬레이션 기반 통합 견적 계산"""

        # 1. 철거비 계산
        demolition_cost = self._calculate_demolition_cost(demolition_plan)

        # 2. 자재비 집계
        material_cost = self._calculate_material_cost(cart_items)

        # 3. 인건비 계산 (자재별 시공비)
        labor_cost = self._calculate_labor_cost(cart_items)

        # 4. 경비 계산
        overhead_cost = self._calculate_overhead(
            demolition_cost, material_cost, labor_cost
        )

        # 5. 공정표 생성
        schedule = self._generate_schedule(
            demolition_plan, cart_items, project.area_size
        )

        return SimulationEstimate(...)

    def _generate_schedule(self, ...) -> Schedule:
        """공정별 스케줄 생성 (금요일 룰 적용)"""
        phases = [
            Phase("철거", days=self._estimate_demolition_days(...)),
            Phase("설비", days=2),
            Phase("전기", days=2),
            Phase("목공", days=self._estimate_carpentry_days(...)),
            Phase("타일", days=self._estimate_tile_days(...)),
            Phase("도배/페인트", days=self._estimate_finishing_days(...)),
            Phase("마감", days=1),
        ]
        return self._apply_friday_rule(phases)
```

### 4.3 API 엔드포인트

```
POST /api/simulation/calculate-estimate
  - Request: { project_id }
  - Response: { estimate_id, breakdown, schedule, total_cost }

POST /api/simulation/convert-to-quote
  - Request: { estimate_id }
  - Response: { ai_quote_id }  -- 기존 AI Quote 시스템으로 연결
```

### 4.4 구현 체크리스트

- [ ] 철거비 계산 로직
- [ ] 자재비 집계 로직
- [ ] 인건비 계산 로직
- [ ] 공정표 생성 로직 (금요일 룰 포함)
- [ ] 시뮬레이션 견적 → AI Quote 변환 로직
- [ ] API 엔드포인트 생성

---

## Phase 5: NestJS API 확장

### 5.1 새로운 모듈 구조

```
src/modules/
├── simulation/
│   ├── simulation.module.ts
│   ├── simulation.controller.ts
│   ├── simulation.service.ts
│   ├── entities/
│   │   ├── simulation-project.entity.ts
│   │   ├── floor-plan.entity.ts
│   │   ├── structural-element.entity.ts
│   │   ├── design-simulation.entity.ts
│   │   └── simulation-estimate.entity.ts
│   └── dto/
│       ├── create-project.dto.ts
│       ├── analyze-floor-plan.dto.ts
│       └── ...
├── materials/
│   ├── materials.module.ts
│   ├── materials.controller.ts
│   ├── materials.service.ts
│   └── entities/
│       ├── material.entity.ts
│       └── cart-item.entity.ts
```

### 5.2 구현 체크리스트

- [ ] SimulationModule 생성
- [ ] MaterialsModule 생성
- [ ] Entity 클래스들 생성
- [ ] Controller/Service 구현
- [ ] AI Service 연동

---

## Phase 6: 모바일 앱 UI

### 6.1 새로운 화면

1. **SimulationHomeScreen** - 시뮬레이션 프로젝트 목록
2. **FloorPlanUploadScreen** - 도면 업로드
3. **StructuralAnalysisScreen** - 구조 분석 결과 + 벽 타입 편집
4. **DemolitionPlanScreen** - 철거할 벽 선택
5. **DesignRequestScreen** - 스타일 요청 입력
6. **DesignResultScreen** - AI 생성 디자인 보기
7. **MaterialShopScreen** - 자재 쇼핑
8. **SimulationEstimateScreen** - 통합 견적서 + 스케줄
9. **ConvertToQuoteScreen** - 실제 업체 견적 요청으로 전환

### 6.2 구현 체크리스트

- [ ] 네비게이션 구조 추가
- [ ] 각 화면 컴포넌트 생성
- [ ] API 연동
- [ ] 상태 관리 (React Query / Zustand)

---

## 구현 순서 (권장)

### Sprint 1: 기반 구축 (1주)
1. [ ] DB 스키마 생성 (Phase 1)
2. [ ] TypeORM Entity 생성
3. [ ] SimulationModule 기본 구조
4. [ ] 자재 마스터 데이터 시드

### Sprint 2: 도면 분석 (1주)
5. [ ] ArchitectAgent 기본 구현
6. [ ] 도면 업로드 API
7. [ ] 구조 분석 로직 (MVP: 사용자 입력 방식)
8. [ ] 모바일: 도면 업로드 + 분석 화면

### Sprint 3: 디자인 시뮬레이션 (1주)
9. [ ] DesignerAgent 구현
10. [ ] 이미지 생성 API 연동
11. [ ] 자재 추천 로직
12. [ ] 모바일: 디자인 요청 + 결과 화면

### Sprint 4: 견적 통합 (1주)
13. [ ] 김반장 시뮬레이션 견적 로직
14. [ ] 공정표 생성
15. [ ] AI Quote 연동
16. [ ] 모바일: 견적서 + 업체 매칭 화면

---

## 기술 스택 요약

| 영역 | 기술 |
|------|------|
| 도면 분석 | Gemini Vision API |
| 이미지 생성 | DALL-E 3 / Replicate |
| 백엔드 | NestJS + TypeORM + PostgreSQL |
| AI 에이전트 | Python FastAPI (기존 ai-service 확장) |
| 모바일 | React Native |
| 파일 저장 | AWS S3 / Cloudinary |

---

## 다음 단계

**Phase 1부터 시작**: 데이터베이스 스키마 생성 및 TypeORM Entity 정의

```bash
# 시작 명령
# 1. 먼저 이 문서 검토
# 2. "Phase 1 시작해줘" 라고 요청
```

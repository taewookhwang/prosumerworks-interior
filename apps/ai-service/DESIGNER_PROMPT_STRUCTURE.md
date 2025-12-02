# Designer Agent 프롬프트 구조

## 전체 흐름

```
Mobile App
    │
    ├── floorPlanAnalysis (도면 분석 결과)
    ├── viewpoint_request (시점: "view from kitchen looking towards living room")
    ├── style ("modern", "minimalist", etc.)
    └── room_type ("living_room", "bedroom", etc.)
    │
    ▼
Designer Agent (generate_interior_image)
    │
    ├── 1. 도면 좌표 추출
    │       └── _extract_room_positions() → 방별 중심 좌표, 창문 위치
    │
    ├── 2. Layout Description 생성
    │       └── _generate_spatial_prompt() 또는 _convert_floor_plan_to_prompt()
    │
    ├── 3. Depth Map 생성 (시점 + 도면 좌표 기반)
    │       └── _generate_perspective_depth_map() + Gaussian Blur
    │
    ├── 4. Seed 계산 (재현성 보장)
    │       └── _calculate_camera_hash(floor_plan, viewpoint) → 고정 seed
    │
    ├── 5. 최종 프롬프트 조합
    │
    └── 6. Replicate API 호출 (seed 포함)
            ├── ControlNet Depth (depth map 있을 때)
            └── SDXL text-to-image (없을 때)
```

### 핵심: 재현성 보장
- **같은 도면 + 같은 시점 = 같은 이미지**
- `_calculate_camera_hash()`로 도면+시점에서 고유 seed 생성
- Replicate API에 seed 전달하여 동일한 결과 보장

---

## 1. Layout Description (텍스트 프롬프트)

### A. 시점 정보가 있을 때: `_generate_spatial_prompt()`

#### 주방에서 거실 바라볼 때
```
Interior photography of a {area_sqm}sqm modern Korean apartment living room.
POV shot from behind kitchen counter looking at the living room.
Kitchen counter and cabinets visible in the FOREGROUND at bottom of frame.
Living room sofa and furniture in the MIDDLE of frame.
Large floor-to-ceiling window wall in the BACKGROUND spanning the far wall, one continuous window without pillars.
NO kitchen appliances or sink visible, those are behind the camera.
Apartment has 3 bedrooms, 2 bathrooms.
```

#### 거실에서 주방 바라볼 때
```
Interior photography of a {area_sqm}sqm modern Korean apartment kitchen.
POV shot from living room sofa looking at the open kitchen.
Sofa armrest or coffee table edge visible in the FOREGROUND at bottom of frame.
Open kitchen with island counter, cabinets, and appliances in the CENTER and BACKGROUND of frame.
Kitchen sink, refrigerator, and cooking area clearly visible.
Natural light coming from BEHIND the camera (from living room windows).
NO windows directly visible in this view, windows are behind the viewer.
Apartment has 3 bedrooms, 2 bathrooms.
```

#### 창가 방향
```
Interior photography of a {area_sqm}sqm modern Korean apartment.
Camera facing towards the windows.
ONE large continuous floor-to-ceiling window wall DIRECTLY IN FRONT, no columns or pillars dividing the window.
Bright natural light streaming in.
Apartment has 3 bedrooms, 2 bathrooms.
```

### B. 시점 정보가 없을 때: `_convert_floor_plan_to_prompt()`

```
a {area_sqm} square meter apartment with {room_count} bedrooms, {bathroom_count} bathrooms
featuring spacious living room, open-plan kitchen connected to living area,
one large continuous floor-to-ceiling window wall spanning the living room without any pillars or dividers
```

---

## 2. Depth Map (이미지 가이드)

### 생성 원리
- **밝은 색 = 가까움** (전경)
- **어두운 색 = 멀리** (배경)
- PIL로 간단한 3D 원근 이미지 생성
- **Gaussian Blur (radius=5)** 적용하여 edge를 부드럽게 처리 → ControlNet 결과 개선

### 주방→거실 Depth Map 구조
```
┌─────────────────────────────────────┐
│          (30,30,30) 천장            │  ← 어두움 (멀리)
├─────────────────────────────────────┤
│ (80)│    (250,250,250)     │(80)   │  ← 창문 (매우 밝음 = 빛)
│ 측벽│      정면 창문         │ 측벽  │
│     │                       │      │
├─────────────────────────────────────┤
│    (180,180,180) 주방 카운터        │  ← 밝음 (가까움)
└─────────────────────────────────────┘
      바닥: gradient (200→50)
```

### 거실→주방 Depth Map 구조
```
┌─────────────────────────────────────┐
│          (30,30,30) 천장            │
├─────────────────────────────────────┤
│ (80)│    (60,60,60) 주방     │(80)  │  ← 어두움 (멀리)
│ 측벽│      캐비닛/가전        │ 측벽  │
│     │                       │      │
│     │ (100,100,100) 아일랜드 │      │  ← 중간
├─────────────────────────────────────┤
│(200,200,200) 소파 암레스트          │  ← 밝음 (가까움)
└─────────────────────────────────────┘
```

---

## 3. 최종 프롬프트 조합

### Replicate API에 전송되는 full_prompt:
```
realistic interior design photograph,
Interior design of {layout_description}.
Style: {style_prompt},
professional interior photography, 8k uhd, highly detailed, architectural visualization
```

### Negative Prompt (강화된 창문 관련 항목 포함):
```
blurry, low quality, distorted, unrealistic, cartoon, anime, sketch, people, text, watermark, floor plan, blueprint, diagram,
window frame in middle, window mullions, divided glass panes, pillar in window, column breaking window,
window with vertical divider, split window, segmented window, multi-pane window,
pillars in window, columns breaking window, divided window, vertical bars in window,
window supports, window posts, structural divider in window,
extra windows, additional windows, multiple windows, many windows
```

---

## 4. Replicate API 호출

### A. ControlNet Depth 모드 (depth map 있을 때)
```json
{
  "version": "db2ffdbdc7f6cb4d6dab512434679ee3366ae7ab84f89750f8947d5594b79a47",
  "input": {
    "prompt": "{full_prompt}",
    "negative_prompt": "{negative_prompt}",
    "image": "data:image/png;base64,{depth_map_base64}",
    "condition_scale": 0.8,
    "num_inference_steps": 30,
    "guidance_scale": 7.5
  }
}
```

### B. SDXL Text-to-Image 모드 (depth map 없을 때)
```json
{
  "version": "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
  "input": {
    "prompt": "{full_prompt}",
    "negative_prompt": "{negative_prompt}",
    "width": 1024,
    "height": 768,
    "num_inference_steps": 35,
    "guidance_scale": 7.5,
    "scheduler": "K_EULER"
  }
}
```

---

## 5. 스타일 프롬프트 (STYLE_PROMPTS)

| 스타일 | 프롬프트 |
|--------|---------|
| modern | clean lines, minimalist furniture, neutral colors with accent pieces, large windows, open space, contemporary design |
| minimalist | ultra minimal, white walls, simple furniture, lots of empty space, zen-like atmosphere, clean aesthetic |
| scandinavian | light wood, white and gray tones, cozy textiles, hygge atmosphere, natural materials, functional design |
| industrial | exposed brick, metal fixtures, concrete floors, vintage furniture, Edison bulbs, raw materials |
| natural | plants, wooden furniture, earth tones, organic textures, large windows with natural light |
| classic | elegant moldings, traditional furniture, rich fabrics, chandelier, ornate details, timeless design |
| luxurious | premium materials, gold accents, marble surfaces, designer furniture, high-end finishes, opulent details |
| korean_modern | Korean traditional elements with modern design, hanok inspired, natural materials, warm wood tones |

---

## 5-1. 스타일별 자재 정보 (STYLE_DATA, 견적 연동용)

각 스타일에는 자재 정보와 가격 범위가 포함되어 견적 산출에 활용됩니다.

### 데이터 구조
```python
STYLE_DATA = {
    "modern": {
        "prompt": "...",
        "materials": {
            "flooring": {"type": "강화마루", "unit": "sqm", "price_range": (80000, 150000)},
            "wall": {"type": "친환경 페인트", "unit": "sqm", "price_range": (15000, 30000)},
            "ceiling": {"type": "평천장 도장", "unit": "sqm", "price_range": (20000, 40000)},
            "lighting": {"type": "LED 매입등 + 레일조명", "unit": "set", "price_range": (500000, 1500000)},
        },
        "cost_multiplier": 1.0,
    },
    # ... 다른 스타일들
}
```

### 스타일별 cost_multiplier
| 스타일 | 승수 | 비고 |
|--------|------|------|
| modern | 1.0 | 기준 가격 |
| minimalist | 1.1 | 심플하지만 고급 마감 |
| scandinavian | 1.2 | 원목마루 + 텍스타일 |
| industrial | 0.95 | 노출 마감으로 절감 |
| natural | 1.3 | 고급 원목 + 플랜테리어 |
| classic | 1.5 | 몰딩 + 고급 조명 |
| luxurious | 2.0 | 대리석 + 디자이너 가구 |
| korean_modern | 1.25 | 한옥 요소 추가 |

### API 사용 예시
```python
agent = await get_designer_agent()

# 자재 정보 조회
materials = agent.get_style_materials("scandinavian")

# 견적 추정 (면적 기반)
estimate = agent.estimate_material_cost("scandinavian", area_sqm=100)
# Returns:
# {
#   "style_id": "scandinavian",
#   "area_sqm": 100,
#   "cost_multiplier": 1.2,
#   "material_estimates": {...},
#   "total_min": 42000000,
#   "total_max": 98000000,
#   "note": "자재비 추정치입니다..."
# }
```

---

## 6. 디버그 로그 확인

서버 로그에서 확인할 수 있는 정보:
```
[Designer] Using spatial-aware prompt: Interior photography of a 108sqm...
[Designer] Generated depth map for viewpoint: view from kitchen...
[Designer] Using ControlNet Depth with generated depth map
[Designer] Prompt: realistic interior design photograph, Interior design of...
[Designer] Prediction started: xxx
[Designer] Status: processing
[Designer] Generated image: https://replicate.delivery/...
```

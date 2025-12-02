# DWG 파싱 결과 - 84A 평형

## 데이터 플로우

```
DWG 파일 → APS (Autodesk Platform Services) → SVF2 변환
    ↓
APS Model Derivative API → 요소 속성 추출 (Block Reference)
    ↓
레이어 기반 분류 → 요소 타입 결정 (wall, door, bathroom 등)
    ↓
중복 제거 (Handle ID 제거) → templateElements 생성
    ↓
건축사 에이전트 → 구조 분석 + 이미지 기반 위치 파악
    ↓
디자이너 에이전트 → 시뮬레이션 이미지 생성
```

> **참고**: APS REST API는 Block Reference의 변환 행렬(transformation matrix)을 제공하지 않아 정확한 좌표 추출이 불가능합니다. 대신 `thumbnailUrl`과 `semanticDescription`을 활용하여 AI가 이미지 기반으로 위치를 파악합니다.

---

## 도면 기본 정보

| 항목 | 값 |
|------|-----|
| 평형 | 84A |
| 면적 | 34평 (약 112.4㎡) |
| 방 개수 | 3개 |
| 화장실 개수 | 2개 |

---

## 중복 제거 (Deduplication)

DWG 파일에서 같은 평형의 같은 요소가 여러 세대에 반복 배치되어 있습니다.
예: "84a 양변기 [105E79]", "84a 양변기 [105E80]" → 동일한 "84a 양변기"

**중복 제거 방식**:
1. 요소 이름에서 Handle ID 제거: `/ \[[A-Fa-f0-9]+\]$/` 패턴 제거
2. 같은 base name을 가진 요소는 하나만 유지
3. 결과: `templateElements`에 고유한 요소 타입만 포함

**예시**:
- 원본: 10,540개 요소
- 중복 제거 + 기하 도형 필터 후: 19개 의미있는 Block Reference

---

## 템플릿 요소 (templateElements)

평형 타입별로 의미있는 Block Reference만 추출한 결과입니다.
Line, Circle, Arc 등의 기하 도형과 AutoCAD 내부 생성 블록(A$C...)은 제외됩니다.

### 벽체 (Walls) - 2개

| 이름 | 레이어 | 설명 |
|------|--------|------|
| PW2400 | 3SEC | 벽체 블록 (2400mm) |
| Q | 2sec | 구조 섹션 |

> 참고: 대부분의 벽체는 Line/Polyline으로 그려져 있어 Block Reference가 적습니다.

### 문 (Doors) - 0개

> **⚠️ 주의**: 이 DWG 파일에서 문은 모두 Line/Arc 도형으로 그려져 있습니다.
> 문 레이어(I-DOOR, DOOR)에 882개의 요소가 있지만, 명명된 Block Reference는 없습니다.
> AI는 도면 이미지에서 문 위치를 파악해야 합니다.

### 창문 (Windows) - 0개

> **⚠️ 주의**: 이 DWG 파일에는 창문 전용 레이어(WIN, WINDOW)가 없습니다.
> 창문은 외벽 레이어에 포함되어 있거나, 별도로 표시되지 않았을 수 있습니다.
> AI는 도면 이미지에서 창문 위치를 파악해야 합니다.

### 욕실 설비 (Bathroom) - 4개

| 이름 | 레이어 | 설명 |
|------|--------|------|
| 84a 세면기 | 0 | 84A 평형 세면대 |
| 84a 양변기 | 0 | 84A 평형 좌변기 |
| A-108 | TOI | 욕실 설비 블록 |
| A-202S | TOI | 욕실 설비 블록 |

### 주방 설비 (Kitchen) - 1개

| 이름 | 레이어 | 설명 |
|------|--------|------|
| SD-4 | I-fur(주방가구) | 주방 싱크대/가구 블록 |

### 전기 설비 (Fixtures) - 2개

| 이름 | 레이어 | 설명 |
|------|--------|------|
| (블록명) | I-light / 4ELE | 조명/전기 설비 |

### 가구 (Furniture) - 10개

| 이름 | 레이어 | 설명 |
|------|--------|------|
| 냉장고 | I-FUR | 냉장고 블록 |
| 세면대입면 | I-FUR | 세면대 입면도 |
| 옷 | I-FUR | 옷장/드레스룸 |
| wash | I-FUR | 세탁기/세면대 |
| D1000 | I-FUR | 가구 블록 |
| ... | ... | (기타 가구 블록) |

---

## 메타데이터

```json
{
  "units": "mm",
  "totalElements": 10540,
  "classifiedElements": 10540,
  "rawElementCounts": {
    "walls": 965,
    "doors": 882,
    "bathroom": 454
  },
  "templateElementCounts": {
    "walls": 2,
    "doors": 0,
    "windows": 0,
    "bathroom": 4,
    "kitchen": 1,
    "fixtures": 2,
    "furniture": 10,
    "total": 19
  }
}
```

- **단위**: mm (밀리미터)
- **총 요소 수**: 10,540개 (모든 세대의 모든 요소 포함)
- **의미있는 Block Reference**: 19개 (기하 도형과 내부 생성 블록 제외)

---

## AI 활용 방안

### 1. 이미지 기반 위치 파악
APS REST API가 좌표를 제공하지 않으므로, AI가 도면 썸네일 이미지를 분석하여 요소 위치를 파악합니다.

```json
{
  "thumbnailUrl": "https://developer.api.autodesk.com/...",
  "semanticDescription": "84A 평형 도면입니다. 3개의 방과 2개의 화장실이 있습니다..."
}
```

### 2. 요소 분류 및 위험도 분석
레이어 정보를 기반으로 요소 타입을 분류하고 구조적 위험도를 평가합니다.

| 레이어 패턴 | 요소 타입 | 위험도 |
|------------|---------|--------|
| I-WALL-LOAD | 내력벽 | **높음** (철거 불가) |
| I-TOI, I-BATH | 욕실 설비 | 중간 (배관 이설 필요) |
| I-FUR(주방가구) | 주방 설비 | 중간 (배관/가스 이설) |
| I-WALL, I-WALL-LT | 일반벽 | 낮음 (철거 가능) |

---

## 원본 JSON 데이터

```json
{
  "success": true,
  "urn": "dXJuOmFkc2sub2JqZWN0czp...",
  "fileName": "84A_floor_plan.dwg",
  "thumbnailUrl": "https://developer.api.autodesk.com/...",
  "semanticDescription": "84A 평형 아파트 도면입니다...",
  "elements": {
    "walls": [...],
    "doors": [...],
    "windows": [...],
    "bathroom": [...],
    "kitchen": [...],
    "fixtures": [...],
    "furniture": [...]
  },
  "templateElements": {
    "walls": [
      {"name": "84a 일반벽", "type": "wall", "layer": "I-WALL"},
      {"name": "84a 내력벽", "type": "wall", "layer": "I-WALL-LOAD"}
    ],
    "doors": [
      {"name": "84a 현관문", "type": "door", "layer": "I-DOOR"},
      {"name": "84a 방문", "type": "door", "layer": "I-DOOR"}
    ],
    "bathroom": [...],
    "kitchen": [...],
    "fixtures": [...],
    "furniture": [...],
    "uniqueCounts": {
      "walls": 4,
      "doors": 5,
      "windows": 0,
      "bathroom": 16,
      "kitchen": 7,
      "fixtures": 6,
      "furniture": 29,
      "total": 67
    }
  },
  "metadata": {
    "units": "mm",
    "totalElements": 10540,
    "classifiedElements": 10540
  }
}
```

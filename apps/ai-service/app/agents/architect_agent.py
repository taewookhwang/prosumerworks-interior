"""
Architect Agent - AI 건축사
도면 분석, 구조물 감지, 철거 계획 검증을 담당하는 AI 에이전트
Gemini Vision API를 사용하여 이미지 분석
"""
import json
import base64
import httpx
from typing import Optional, List
from PIL import Image
from io import BytesIO

import google.generativeai as genai

from app.llm import GeminiProvider, LLMConfig
from app.models.schemas import (
    FloorPlanAnalysis,
    StructuralElement,
    StructuralElementType,
    DemolitionValidation,
    DesignFeasibility,
)
from app.config import settings


FLOOR_PLAN_ANALYSIS_PROMPT = """You are an expert AI Architect specializing in Korean residential interior analysis.

Analyze this floor plan image and identify all structural elements.

## Your Task
1. Identify the overall layout (room count, bathroom count, estimated area in 평/pyeong - Korean unit where 1평 ≈ 3.3 sqm)
2. Detect ALL structural elements including:
   - **Load-bearing walls (내력벽)**: Usually thicker walls, outer walls, walls connecting to pillars
   - **Non-load-bearing walls (비내력벽)**: Interior partition walls, typically thinner
   - **Pillars (기둥)**: Structural columns
   - **Beams (보)**: Structural beams if visible
   - **Windows (창문)**: All window locations - IMPORTANT: Count each continuous window opening as ONE element. If it's one wide window without pillars/dividers, count it as ONE window. Only count as separate windows if there's a wall or pillar between them.
   - **Doors (문)**: All door locations
   - **Plumbing areas (배관)**: Kitchen sink, bathrooms - infer from typical Korean apartment layouts
   - **Electrical panels (전기)**: If visible, or infer main electrical areas

## Response Format
You MUST respond with valid JSON only. No markdown, no explanations.
IMPORTANT: estimated_area should be in 평(pyeong), NOT square meters. (1평 ≈ 3.3sqm)

{
  "estimated_area": 32.5,
  "room_count": 3,
  "bathroom_count": 2,
  "elements": [
    {
      "element_type": "load_bearing_wall",
      "label": "외벽-남측",
      "position": {"x": 0, "y": 0, "width": 100, "height": 10},
      "is_demolishable": false,
      "demolition_risk": "high",
      "demolition_note": "내력벽으로 철거 시 구조적 문제 발생",
      "confidence": 0.95
    },
    {
      "element_type": "window",
      "label": "거실 전면창 (단일 연속창)",
      "position": {"x": 10, "y": 0, "width": 40, "height": 3},
      "is_demolishable": false,
      "demolition_risk": "medium",
      "demolition_note": "창호 교체는 가능하나 외벽 구조 변경 불가",
      "confidence": 0.90
    }
  ],
  "analysis_summary": "32평형 아파트로 방 3개, 화장실 2개 구조입니다. 거실에 넓은 단일 전면창이 있습니다.",
  "warnings": ["주방-화장실 사이 벽은 배관이 지나가므로 철거 시 배관 이설 필요"]
}

## Element Type Values
- load_bearing_wall, non_load_bearing_wall, pillar, beam, window, door, plumbing, electrical, hvac

## Important Notes for Windows
- If a floor plan shows one continuous window line without any dividers, it is ONE window (단일창)
- Position width should reflect the actual width of the window relative to the image (0-100 scale)
- A wide window (width > 30) typically means a full-wall window or panoramic window
- Include in label whether it's "단일창" (single continuous) or "분할창" (divided into sections)

## General Notes
- Position coordinates are relative percentages (0-100) of the image dimensions
- Always consider Korean apartment building standards
- Mark confidence level honestly (0.0-1.0)
- Provide practical Korean labels for each element
"""


# DWG JSON 데이터를 분석하는 프롬프트 (APS 파싱 결과용)
DWG_JSON_ANALYSIS_PROMPT = """You are an expert AI Architect analyzing DWG floor plan data parsed from AutoCAD.

## CRITICAL: DWG Data Abstraction Issues
When working with DWG-parsed JSON data, be aware of these common issues:

### 1. Shape Simplification (Bounding Box vs Polygon)
- Original DWG walls may be L-shaped, curved, or irregular polygons
- Parsed data often simplifies to rectangular bounding boxes
- If you see a wall with unusual width/height ratio, it may be a simplified complex shape
- Combine adjacent walls that logically form one structure

### 2. Coordinate System (Y-Axis Flip)
- CAD uses mathematical coordinates: Bottom-Left is (0,0), Y increases upward
- Image/Web uses screen coordinates: Top-Left is (0,0), Y increases downward
- IMPORTANT: When converting to image visualization:
  * new_y = total_height - original_y
  * Or flip the entire layout vertically

### 3. Data Loss (Filtering & Classification)
- Small walls, decorative elements, or thin partitions may be filtered out
- Layer-based classification may miss elements on non-standard layers
- If classified count < total count, some elements were not recognized
- Low confidence elements should be manually verified

### 4. Object vs Line Interpretation
- DWG stores "lines" and "arcs", not "doors" or "windows"
- Door swing arcs become separate entities, losing context
- Window frames may be multiple line segments
- Group nearby elements logically (e.g., arc + lines = door)

## Input DWG Data
{dwg_json}

## Your Task
Analyze this DWG-parsed JSON and:
1. Identify structural elements (walls, doors, windows, plumbing, electrical)
2. Classify walls as load-bearing or non-load-bearing based on:
   - Thickness (thicker walls are often load-bearing)
   - Position (outer walls, walls with pillars)
   - Layer naming conventions (if available)
3. Group related elements (e.g., bathroom fixtures together)
4. Note any data quality issues or missing elements

## Response Format
{{
  "estimated_area": 34.0,
  "room_count": 3,
  "bathroom_count": 2,
  "elements": [...],
  "analysis_summary": "...",
  "warnings": ["...", "..."],
  "data_quality_notes": [
    "Y좌표가 CAD 좌표계(Y-Up)입니다. 이미지 표시 시 반전 필요",
    "분류된 요소 120개 중 80%만 인식됨, 누락 요소 확인 필요"
  ]
}}
"""


DEMOLITION_VALIDATION_PROMPT = """You are an expert AI Architect validating a demolition plan for Korean residential interior.

## Current Floor Plan Analysis
{floor_plan_analysis}

## Selected Elements for Demolition
{selected_elements}

## Your Task
Validate if the selected demolition plan is safe and provide recommendations.

Check for:
1. **Structural Safety**: Are any load-bearing elements selected?
2. **Plumbing Impact**: Will demolition affect water/sewage pipes?
3. **Electrical Impact**: Will demolition affect electrical systems?
4. **Building Code Compliance**: Does the plan comply with Korean building regulations?

## Response Format
You MUST respond with valid JSON only.

{{
  "is_safe": true,
  "selected_elements": ["침실1-거실 칸막이벽", "침실2 붙박이장 벽"],
  "risk_level": "low",
  "structural_impact": "선택된 벽들은 모두 비내력벽으로 구조적 영향이 없습니다.",
  "recommendations": [
    "철거 전 전기 배선 확인 필요",
    "분진 관리를 위한 비닐 차단막 설치 권장"
  ],
  "warnings": [],
  "estimated_demolition_cost": 150
}}

Risk levels: low, medium, high
"""


DESIGN_FEASIBILITY_PROMPT = """You are an expert AI Architect validating if a proposed design is structurally feasible.

## Current Floor Plan Analysis
{floor_plan_analysis}

## Demolition Plan
{demolition_plan}

## Proposed Design Description
{design_description}

## Your Task
Analyze if the proposed design can be safely implemented given the structural constraints.

Check for:
1. **Structural Conflicts**: Does the design require removing load-bearing elements?
2. **Plumbing Feasibility**: Can plumbing be reasonably relocated if needed?
3. **Electrical Feasibility**: Can electrical systems accommodate the new layout?
4. **Space Requirements**: Is there adequate space for the proposed design?

## Response Format
You MUST respond with valid JSON only.

{{
  "is_feasible": true,
  "feasibility_score": 85.0,
  "structural_conflicts": [],
  "plumbing_conflicts": ["주방 싱크대 위치 변경 시 배관 연장 필요"],
  "electrical_conflicts": [],
  "modifications_needed": ["배관 연장 약 2m", "콘센트 위치 조정"],
  "estimated_additional_cost": 80
}}

Feasibility score: 0-100 (100 = perfectly feasible)
"""


class ArchitectAgent:
    """
    AI 건축사 에이전트
    도면 분석 및 구조물 감지, 철거 계획 검증 담당
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.gemini_api_key
        self.model_name = "gemini-2.0-flash"  # Vision 지원 모델
        self._initialized = False
        self._model = None

    async def initialize(self):
        """Gemini Vision 클라이언트 초기화"""
        if not self._initialized:
            genai.configure(api_key=self.api_key)
            self._model = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,  # 더 일관된 결과를 위해 낮은 temperature
                    max_output_tokens=4096,
                ),
            )
            self._initialized = True

    async def _load_image(
        self,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
    ) -> Image.Image:
        """이미지 로드 (URL 또는 Base64)"""
        if image_base64:
            # 디버그: base64 길이 출력
            print(f"[DEBUG] Received base64 length: {len(image_base64)}")

            # data:image/...;base64, prefix 제거
            if image_base64.startswith('data:'):
                # 예: "data:image/png;base64,iVBORw0KGgo..."
                try:
                    image_base64 = image_base64.split(',', 1)[1]
                    print(f"[DEBUG] Stripped data URI prefix, new length: {len(image_base64)}")
                except IndexError:
                    raise ValueError("Invalid data URI format")

            # Base64 디코딩
            try:
                image_data = base64.b64decode(image_base64)
                print(f"[DEBUG] Decoded image data size: {len(image_data)} bytes")
            except Exception as e:
                raise ValueError(f"Base64 디코딩 실패: {str(e)}")

            # 이미지 열기
            try:
                img = Image.open(BytesIO(image_data))
                print(f"[DEBUG] Image opened: {img.format} {img.size} {img.mode}")
                return img
            except Exception as e:
                # 처음 50바이트 헥스 덤프로 디버깅
                hex_preview = image_data[:50].hex() if len(image_data) >= 50 else image_data.hex()
                raise ValueError(f"이미지 파일 열기 실패: {str(e)}. Data preview (hex): {hex_preview}")

        elif image_url:
            # URL에서 다운로드
            print(f"[DEBUG] Downloading image from URL: {image_url[:100]}...")
            async with httpx.AsyncClient() as client:
                response = await client.get(image_url)
                response.raise_for_status()
                return Image.open(BytesIO(response.content))
        else:
            raise ValueError("image_url 또는 image_base64 중 하나를 제공해야 합니다.")

    async def analyze_dwg_json(
        self,
        dwg_json: dict,
        floor_plan_id: Optional[str] = None,
    ) -> FloorPlanAnalysis:
        """
        DWG 파싱된 JSON 데이터 분석 (APS에서 변환된 데이터용)

        Args:
            dwg_json: APS에서 파싱된 DWG JSON 데이터
            floor_plan_id: 도면 ID

        Returns:
            FloorPlanAnalysis: 도면 분석 결과
        """
        await self.initialize()

        # 프롬프트 구성
        prompt = DWG_JSON_ANALYSIS_PROMPT.format(
            dwg_json=json.dumps(dwg_json, ensure_ascii=False, indent=2)
        )

        # Gemini API 호출
        response = await self._model.generate_content_async(prompt)

        # 응답 파싱
        result = self._parse_json_response(response.text)

        # 좌표 정규화 (CAD Y-Up → Image Y-Down)
        elements = []
        max_y = self._find_max_y(dwg_json)

        for elem in result.get("elements", []):
            try:
                element_type = StructuralElementType(elem.get("element_type", "non_load_bearing_wall"))
            except ValueError:
                element_type = StructuralElementType.NON_LOAD_BEARING_WALL

            # Y좌표 반전
            position = elem.get("position", {"x": 0, "y": 0, "width": 0, "height": 0})
            if max_y > 0:
                position["y"] = max_y - position.get("y", 0) - position.get("height", 0)

            elements.append(StructuralElement(
                element_type=element_type,
                label=elem.get("label", "Unknown"),
                position=position,
                is_demolishable=elem.get("is_demolishable", True),
                demolition_risk=elem.get("demolition_risk", "none"),
                demolition_note=elem.get("demolition_note"),
                confidence=elem.get("confidence", 0.5),
            ))

        # 데이터 품질 노트를 warnings에 추가
        warnings = result.get("warnings", [])
        data_quality_notes = result.get("data_quality_notes", [])
        warnings.extend(data_quality_notes)

        # 외벽 자동 추론 (창문이 벽 없이 떠있는 경우 보정)
        inferred_walls, infer_warnings = self._infer_outer_walls_from_windows(
            dwg_json=dwg_json,
            existing_elements=elements,
            max_y=max_y,
        )
        if inferred_walls:
            elements.extend(inferred_walls)
            warnings.extend(infer_warnings)
            print(f"[Architect] 외벽 {len(inferred_walls)}개 자동 추론 추가됨")

        return FloorPlanAnalysis(
            floor_plan_id=floor_plan_id,
            image_dimensions={"width": 1000, "height": 800},  # DWG 기본 크기
            estimated_area=result.get("estimated_area"),
            room_count=result.get("room_count", 0),
            bathroom_count=result.get("bathroom_count", 0),
            elements=elements,
            analysis_summary=result.get("analysis_summary", ""),
            warnings=warnings,
        )

    def _find_max_y(self, dwg_json: dict) -> float:
        """DWG JSON에서 최대 Y좌표 찾기 (좌표 반전용)"""
        max_y = 0
        for key in ["walls", "doors", "windows", "elements"]:
            items = dwg_json.get(key, [])
            if isinstance(items, list):
                for item in items:
                    coords = item.get("coordinates", {})
                    y = coords.get("y", 0) + coords.get("height", 0)
                    max_y = max(max_y, y)
        return max_y

    def _infer_outer_walls_from_windows(
        self,
        dwg_json: dict,
        existing_elements: List[StructuralElement],
        max_y: float,
    ) -> tuple[List[StructuralElement], List[str]]:
        """
        창문 위치를 기반으로 누락된 외벽을 추론

        문제: DWG 파싱 시 외벽(Outer Wall) 레이어가 누락되어
              창문이 벽 없이 "허공에 떠있는" 상태가 됨

        해결: 창문의 Y좌표를 분석하여 가장 바깥쪽(min Y)에 있는
              창문들을 감싸는 외벽을 자동으로 생성

        Args:
            dwg_json: 원본 DWG JSON 데이터
            existing_elements: 이미 생성된 요소들
            max_y: Y좌표 최대값 (반전용)

        Returns:
            tuple: (추가된 외벽 요소들, 경고 메시지들)
        """
        inferred_walls = []
        warnings = []

        windows = dwg_json.get("windows", [])
        walls = dwg_json.get("walls", [])

        if not windows:
            return [], []

        # 창문들의 Y좌표 분석
        window_coords = []
        for win in windows:
            coords = win.get("coordinates", {})
            window_coords.append({
                "name": win.get("name", "창문"),
                "x": coords.get("x", 0),
                "y": coords.get("y", 0),
                "width": coords.get("width", 0),
                "height": coords.get("height", 0),
            })

        # 벽들의 Y좌표 분석
        wall_y_positions = set()
        for wall in walls:
            coords = wall.get("coordinates", {})
            wall_y_positions.add(coords.get("y", 0))

        # 창문이 있는 Y좌표에 벽이 없는지 확인
        min_window_y = min(w["y"] for w in window_coords) if window_coords else None

        if min_window_y is not None:
            # 창문보다 위(Y값이 작은)에 벽이 있는지 확인
            walls_above_windows = [y for y in wall_y_positions if y <= min_window_y]

            if not walls_above_windows:
                # 외벽 누락! 창문을 감싸는 외벽 추론 필요
                warnings.append(
                    f"⚠️ 외벽 데이터 누락 감지: 창문(Y={min_window_y})이 벽 없이 배치됨. "
                    f"외벽을 자동 추론합니다."
                )

                # 가장 외곽 창문들을 모아서 외벽 범위 계산
                outer_windows = [w for w in window_coords if w["y"] == min_window_y]

                if outer_windows:
                    # 전체 외벽 범위 계산
                    min_x = min(w["x"] for w in outer_windows)
                    max_x = max(w["x"] + w["width"] for w in outer_windows)
                    wall_thickness = 20  # 표준 외벽 두께 (mm 기준)

                    # 외벽 좌표 (Y축 반전 적용)
                    wall_y_original = min_window_y
                    wall_y_flipped = max_y - wall_y_original - wall_thickness if max_y > 0 else wall_y_original

                    inferred_wall = StructuralElement(
                        element_type=StructuralElementType.LOAD_BEARING_WALL,
                        label=f"외벽-추론 (창문 기반)",
                        position={
                            "x": min_x,
                            "y": wall_y_flipped,
                            "width": max_x - min_x,
                            "height": wall_thickness,
                        },
                        is_demolishable=False,
                        demolition_risk="high",
                        demolition_note="외벽은 구조물이므로 철거 불가. 창문 위치 기반으로 자동 추론된 요소입니다.",
                        confidence=0.7,  # 추론이므로 신뢰도 낮게
                    )
                    inferred_walls.append(inferred_wall)

                    print(f"[Architect] 외벽 자동 추론: x={min_x}~{max_x}, y={wall_y_flipped}, 포함 창문 {len(outer_windows)}개")

        return inferred_walls, warnings

    async def analyze_floor_plan(
        self,
        floor_plan_id: Optional[str] = None,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
        property_type: Optional[str] = None,
    ) -> FloorPlanAnalysis:
        """
        도면 이미지 분석

        Args:
            floor_plan_id: 도면 ID (DB 저장용)
            image_url: 도면 이미지 URL
            image_base64: 도면 이미지 Base64
            property_type: 건물 유형

        Returns:
            FloorPlanAnalysis: 도면 분석 결과
        """
        await self.initialize()

        # 이미지 로드
        image = await self._load_image(image_url, image_base64)

        # 프롬프트 구성
        prompt = FLOOR_PLAN_ANALYSIS_PROMPT
        if property_type:
            prompt += f"\n\n건물 유형: {property_type}"

        # Gemini Vision API 호출
        response = await self._model.generate_content_async([prompt, image])

        # 응답 파싱
        result = self._parse_json_response(response.text)

        # FloorPlanAnalysis 객체 생성
        elements = []
        for elem in result.get("elements", []):
            try:
                element_type = StructuralElementType(elem.get("element_type", "non_load_bearing_wall"))
            except ValueError:
                element_type = StructuralElementType.NON_LOAD_BEARING_WALL

            elements.append(StructuralElement(
                element_type=element_type,
                label=elem.get("label", "Unknown"),
                position=elem.get("position", {"x": 0, "y": 0, "width": 0, "height": 0}),
                is_demolishable=elem.get("is_demolishable", True),
                demolition_risk=elem.get("demolition_risk", "none"),
                demolition_note=elem.get("demolition_note"),
                confidence=elem.get("confidence", 0.5),
            ))

        return FloorPlanAnalysis(
            floor_plan_id=floor_plan_id,
            image_dimensions={"width": image.width, "height": image.height},
            estimated_area=result.get("estimated_area"),
            room_count=result.get("room_count", 0),
            bathroom_count=result.get("bathroom_count", 0),
            elements=elements,
            analysis_summary=result.get("analysis_summary", ""),
            warnings=result.get("warnings", []),
        )

    async def validate_demolition_plan(
        self,
        floor_plan_analysis: FloorPlanAnalysis,
        selected_element_labels: List[str],
    ) -> DemolitionValidation:
        """
        철거 계획 검증

        Args:
            floor_plan_analysis: 도면 분석 결과
            selected_element_labels: 철거 선택된 요소 라벨 목록

        Returns:
            DemolitionValidation: 철거 검증 결과
        """
        await self.initialize()

        # 프롬프트 구성
        prompt = DEMOLITION_VALIDATION_PROMPT.format(
            floor_plan_analysis=floor_plan_analysis.model_dump_json(indent=2),
            selected_elements=json.dumps(selected_element_labels, ensure_ascii=False),
        )

        try:
            # Gemini API 호출
            response = await self._model.generate_content_async(prompt)
            print(f"[DEBUG] Gemini response text (first 500 chars): {response.text[:500]}")

            # 응답 파싱
            result = self._parse_json_response(response.text)
            print(f"[DEBUG] Parsed result keys: {result.keys() if isinstance(result, dict) else 'not a dict'}")

            # 파싱 오류 체크
            if "error" in result:
                print(f"[DEBUG] JSON parsing error: {result.get('error')}")
                print(f"[DEBUG] Raw content: {result.get('raw_content')}")
                # 기본값으로 응답 생성
                return DemolitionValidation(
                    is_safe=True,
                    selected_elements=selected_element_labels,
                    risk_level="low",
                    structural_impact="AI 분석 중 오류가 발생하여 기본 검증 결과를 반환합니다.",
                    recommendations=["전문가와 상담하시기 바랍니다."],
                    warnings=["AI 분석 오류 - 수동 검토 필요"],
                    estimated_demolition_cost=None,
                )

            return DemolitionValidation(
                is_safe=result.get("is_safe", False),
                selected_elements=result.get("selected_elements", selected_element_labels),
                risk_level=result.get("risk_level", "low"),
                structural_impact=result.get("structural_impact", ""),
                recommendations=result.get("recommendations", []),
                warnings=result.get("warnings", []),
                estimated_demolition_cost=result.get("estimated_demolition_cost"),
            )
        except Exception as e:
            print(f"[DEBUG] Exception in validate_demolition_plan: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    async def check_design_feasibility(
        self,
        floor_plan_analysis: FloorPlanAnalysis,
        demolition_plan: DemolitionValidation,
        design_image_url: Optional[str] = None,
        design_image_base64: Optional[str] = None,
        design_description: Optional[str] = None,
    ) -> DesignFeasibility:
        """
        디자인 시공 가능성 검증

        Args:
            floor_plan_analysis: 도면 분석 결과
            demolition_plan: 철거 계획
            design_image_url: 디자인 이미지 URL
            design_image_base64: 디자인 이미지 Base64
            design_description: 디자인 설명

        Returns:
            DesignFeasibility: 시공 가능성 검증 결과
        """
        await self.initialize()

        # 프롬프트 구성
        prompt = DESIGN_FEASIBILITY_PROMPT.format(
            floor_plan_analysis=floor_plan_analysis.model_dump_json(indent=2),
            demolition_plan=demolition_plan.model_dump_json(indent=2),
            design_description=design_description or "N/A",
        )

        # 이미지가 있으면 Vision API 사용
        if design_image_url or design_image_base64:
            image = await self._load_image(design_image_url, design_image_base64)
            response = await self._model.generate_content_async([prompt, image])
        else:
            response = await self._model.generate_content_async(prompt)

        # 응답 파싱
        result = self._parse_json_response(response.text)

        return DesignFeasibility(
            is_feasible=result.get("is_feasible", False),
            feasibility_score=result.get("feasibility_score", 0.0),
            structural_conflicts=result.get("structural_conflicts", []),
            plumbing_conflicts=result.get("plumbing_conflicts", []),
            electrical_conflicts=result.get("electrical_conflicts", []),
            modifications_needed=result.get("modifications_needed", []),
            estimated_additional_cost=result.get("estimated_additional_cost"),
        )

    async def generate_clean_slate_visualization(
        self,
        floor_plan_analysis: FloorPlanAnalysis,
        demolition_plan: DemolitionValidation,
    ) -> dict:
        """
        Clean Slate 시각화 데이터 생성
        철거 후 상태를 시각화하기 위한 데이터 반환

        Args:
            floor_plan_analysis: 도면 분석 결과
            demolition_plan: 철거 계획

        Returns:
            dict: Clean Slate 시각화 데이터
        """
        # 철거 요소들 필터링
        demolished_labels = set(demolition_plan.selected_elements)

        remaining_elements = []
        demolished_elements = []

        for element in floor_plan_analysis.elements:
            if element.label in demolished_labels:
                demolished_elements.append({
                    "label": element.label,
                    "element_type": element.element_type.value,
                    "position": element.position,
                    "status": "demolished",
                })
            else:
                remaining_elements.append({
                    "label": element.label,
                    "element_type": element.element_type.value,
                    "position": element.position,
                    "status": "remaining",
                })

        return {
            "original_elements_count": len(floor_plan_analysis.elements),
            "remaining_elements_count": len(remaining_elements),
            "demolished_elements_count": len(demolished_elements),
            "remaining_elements": remaining_elements,
            "demolished_elements": demolished_elements,
            "visualization_notes": [
                "빨간색 영역: 철거된 구조물",
                "파란색 영역: 남아있는 구조물",
                "회색 영역: 내력벽 (철거 불가)",
            ],
            "is_safe": demolition_plan.is_safe,
            "risk_level": demolition_plan.risk_level,
        }

    def _parse_json_response(self, content: str) -> dict:
        """JSON 응답 파싱"""
        import re
        try:
            # 마크다운 코드블록 제거
            json_str = content.strip()

            # ```json ... ``` 또는 ``` ... ``` 블록 추출
            code_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', json_str)
            if code_block_match:
                json_str = code_block_match.group(1)
            else:
                # 코드블록이 없으면 JSON 객체 직접 찾기
                json_match = re.search(r'\{[\s\S]*\}', json_str)
                if json_match:
                    json_str = json_match.group(0)

            # 디버깅: 파싱 전 내용 출력
            print(f"[DEBUG] Parsing JSON string (first 200 chars): {json_str[:200]}")

            result = json.loads(json_str.strip())
            return result
        except json.JSONDecodeError as e:
            # 파싱 실패 시 디버깅 정보 출력
            print(f"[DEBUG] JSON parse error: {str(e)}")
            print(f"[DEBUG] Raw content (first 500 chars): {content[:500]}")
            # 기본값 반환
            return {
                "error": f"JSON 파싱 실패: {str(e)}",
                "raw_content": content[:500],
            }


# 싱글톤 인스턴스
_architect_agent: Optional[ArchitectAgent] = None


async def get_architect_agent() -> ArchitectAgent:
    """ArchitectAgent 싱글톤 반환"""
    global _architect_agent
    if _architect_agent is None:
        _architect_agent = ArchitectAgent()
    return _architect_agent

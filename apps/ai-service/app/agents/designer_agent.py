"""
Designer Agent - AI 인테리어 디자이너
사용자의 스타일 요구와 도면을 결합하여 인테리어 디자인 이미지를 생성하는 AI 에이전트
Stable Diffusion + ControlNet 기반 이미지 생성
"""
import asyncio
import json
import base64
import httpx
import math
from io import BytesIO
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum

import google.generativeai as genai
from PIL import Image, ImageDraw, ImageFilter

from app.config import settings
from app.models.schemas import FloorPlanAnalysis


class InteriorStyle(str, Enum):
    """인테리어 스타일 종류"""
    MODERN = "modern"
    MINIMALIST = "minimalist"
    SCANDINAVIAN = "scandinavian"
    INDUSTRIAL = "industrial"
    NATURAL = "natural"
    CLASSIC = "classic"
    LUXURIOUS = "luxurious"
    KOREAN_MODERN = "korean_modern"


# 스타일별 상세 데이터 (프롬프트 + 자재 정보 for 견적 연동)
STYLE_DATA: Dict[str, Dict[str, Any]] = {
    "modern": {
        "prompt": "modern interior design, clean lines, neutral colors, contemporary furniture, minimalist decor, high-end finishes, white walls, sleek surfaces",
        "materials": {
            "flooring": {"type": "강화마루", "unit": "sqm", "price_range": (80000, 150000)},
            "wall": {"type": "친환경 페인트", "unit": "sqm", "price_range": (15000, 30000)},
            "ceiling": {"type": "평천장 도장", "unit": "sqm", "price_range": (20000, 40000)},
            "furniture_style": "contemporary",
            "lighting": {"type": "LED 매입등 + 레일조명", "unit": "set", "price_range": (500000, 1500000)},
        },
        "cost_multiplier": 1.0,  # 기준 가격
    },
    "minimalist": {
        "prompt": "minimalist interior, ultra clean, white space, simple furniture, no clutter, zen atmosphere, natural light, monochromatic palette",
        "materials": {
            "flooring": {"type": "폴리싱 콘크리트 or 마이크로 시멘트", "unit": "sqm", "price_range": (100000, 200000)},
            "wall": {"type": "백색 무광 페인트", "unit": "sqm", "price_range": (15000, 25000)},
            "ceiling": {"type": "평천장 무광 도장", "unit": "sqm", "price_range": (20000, 35000)},
            "furniture_style": "minimal",
            "lighting": {"type": "간접조명 + 다운라이트", "unit": "set", "price_range": (600000, 1200000)},
        },
        "cost_multiplier": 1.1,
    },
    "scandinavian": {
        "prompt": "scandinavian interior, light wood floors, white walls, cozy textiles, hygge atmosphere, functional furniture, natural materials, soft lighting",
        "materials": {
            "flooring": {"type": "화이트오크 원목마루", "unit": "sqm", "price_range": (150000, 300000)},
            "wall": {"type": "화이트/라이트그레이 페인트", "unit": "sqm", "price_range": (15000, 28000)},
            "ceiling": {"type": "화이트 도장", "unit": "sqm", "price_range": (18000, 32000)},
            "furniture_style": "scandinavian_wood",
            "lighting": {"type": "펜던트 조명 + 테이블 램프", "unit": "set", "price_range": (400000, 1000000)},
            "textiles": {"type": "린넨/울 텍스타일", "unit": "set", "price_range": (300000, 800000)},
        },
        "cost_multiplier": 1.2,
    },
    "industrial": {
        "prompt": "industrial interior design, exposed brick, metal accents, concrete floors, vintage furniture, Edison bulbs, loft style, raw materials",
        "materials": {
            "flooring": {"type": "에폭시 코팅 콘크리트", "unit": "sqm", "price_range": (80000, 150000)},
            "wall": {"type": "노출콘크리트 or 브릭타일", "unit": "sqm", "price_range": (50000, 120000)},
            "ceiling": {"type": "노출천장 (덕트 노출)", "unit": "sqm", "price_range": (30000, 60000)},
            "furniture_style": "industrial_vintage",
            "lighting": {"type": "에디슨벌브 + 파이프조명", "unit": "set", "price_range": (300000, 800000)},
            "metal_fixtures": {"type": "철재 인테리어 요소", "unit": "set", "price_range": (200000, 600000)},
        },
        "cost_multiplier": 0.95,
    },
    "natural": {
        "prompt": "natural interior design, warm wood tones, plants, earthy colors, organic materials, rattan furniture, botanical elements, biophilic design",
        "materials": {
            "flooring": {"type": "월넛/티크 원목마루", "unit": "sqm", "price_range": (180000, 350000)},
            "wall": {"type": "자연 톤 페인트 or 목재 패널", "unit": "sqm", "price_range": (25000, 80000)},
            "ceiling": {"type": "목재 빔 노출 or 우드 패널", "unit": "sqm", "price_range": (50000, 120000)},
            "furniture_style": "natural_organic",
            "lighting": {"type": "라탄/우드 펜던트", "unit": "set", "price_range": (400000, 900000)},
            "plants": {"type": "플랜테리어 (대형 화분 포함)", "unit": "set", "price_range": (500000, 1500000)},
        },
        "cost_multiplier": 1.3,
    },
    "classic": {
        "prompt": "classic elegant interior, crown molding, traditional furniture, rich fabrics, chandelier, symmetrical layout, timeless design, warm lighting",
        "materials": {
            "flooring": {"type": "헤링본 원목마루 or 대리석", "unit": "sqm", "price_range": (200000, 500000)},
            "wall": {"type": "몰딩 + 고급 벽지 or 페인트", "unit": "sqm", "price_range": (40000, 100000)},
            "ceiling": {"type": "크라운 몰딩 + 우물천장", "unit": "sqm", "price_range": (80000, 180000)},
            "furniture_style": "traditional_elegant",
            "lighting": {"type": "샹들리에 + 브라켓 조명", "unit": "set", "price_range": (800000, 3000000)},
            "molding": {"type": "석고 몰딩", "unit": "m", "price_range": (15000, 40000)},
        },
        "cost_multiplier": 1.5,
    },
    "luxurious": {
        "prompt": "luxury interior design, marble floors, gold accents, designer furniture, crystal chandelier, premium materials, sophisticated palette, high ceiling",
        "materials": {
            "flooring": {"type": "이탈리아 대리석 or 포세린 타일", "unit": "sqm", "price_range": (300000, 800000)},
            "wall": {"type": "베네치안 플라스터 or 고급 벽지", "unit": "sqm", "price_range": (80000, 200000)},
            "ceiling": {"type": "우물천장 + 간접조명", "unit": "sqm", "price_range": (120000, 250000)},
            "furniture_style": "designer_luxury",
            "lighting": {"type": "크리스탈 샹들리에 + 디자이너 조명", "unit": "set", "price_range": (2000000, 10000000)},
            "gold_accents": {"type": "골드 하드웨어/악센트", "unit": "set", "price_range": (500000, 2000000)},
        },
        "cost_multiplier": 2.0,
    },
    "korean_modern": {
        "prompt": "modern Korean interior, ondol floor, minimalist hanok elements, natural wood, paper screen inspired, warm neutral tones, clean aesthetic",
        "materials": {
            "flooring": {"type": "온돌 원목마루 (오크/물푸레)", "unit": "sqm", "price_range": (150000, 280000)},
            "wall": {"type": "한지벽지 or 황토 도장", "unit": "sqm", "price_range": (30000, 70000)},
            "ceiling": {"type": "한지 천장 or 평천장", "unit": "sqm", "price_range": (40000, 90000)},
            "furniture_style": "korean_contemporary",
            "lighting": {"type": "한지 조명 + 간접조명", "unit": "set", "price_range": (400000, 1000000)},
            "traditional_elements": {"type": "한옥 요소 (창호, 문살)", "unit": "set", "price_range": (300000, 1200000)},
        },
        "cost_multiplier": 1.25,
    },
}

# 기존 호환성을 위한 STYLE_PROMPTS 매핑
STYLE_PROMPTS: Dict[str, str] = {
    style_id: data["prompt"] for style_id, data in STYLE_DATA.items()
}

# 공간별 추가 프롬프트
ROOM_PROMPTS: Dict[str, str] = {
    "living_room": "spacious living room, comfortable sofa, coffee table, entertainment center, area rug, accent lighting",
    "bedroom": "cozy bedroom, comfortable bed, nightstands, soft bedding, ambient lighting, wardrobe",
    "kitchen": "modern kitchen, kitchen island, built-in appliances, pendant lights, countertop, cabinets",
    "bathroom": "modern bathroom, vanity, mirror, tiles, shower, clean lines",
    "office": "home office, desk, ergonomic chair, bookshelf, task lighting, organized workspace",
}


PROMPT_ENHANCEMENT_TEMPLATE = """You are an expert interior design AI assistant.
Your task is to transform a user's simple style request into a detailed, high-quality prompt for AI image generation.

User's request: {user_input}
Room type: {room_type}
Base style: {base_style}

Create a detailed prompt that includes:
1. Specific design elements (furniture, materials, colors)
2. Lighting conditions
3. Atmosphere and mood
4. Korean apartment context (if applicable)
5. Realistic interior photography style

Output ONLY the enhanced prompt in English, no explanations.
The prompt should be optimized for Stable Diffusion image generation.
Keep it under 200 words.
"""


class DesignerAgent:
    """
    AI 인테리어 디자이너 에이전트
    스타일 프롬프트 강화 및 인테리어 이미지 생성 담당
    """

    def __init__(self, api_key: Optional[str] = None, replicate_api_key: Optional[str] = None):
        self.gemini_api_key = api_key or settings.gemini_api_key
        self.replicate_api_key = replicate_api_key or settings.replicate_api_key
        self._initialized = False
        self._model = None
        print(f"[Designer] Initialized with Replicate API: {'Yes' if self.replicate_api_key else 'No (Mockup mode)'}")

    async def initialize(self):
        """Gemini 클라이언트 초기화 (프롬프트 강화용)"""
        if not self._initialized:
            genai.configure(api_key=self.gemini_api_key)
            self._model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                ),
            )
            self._initialized = True

    async def enhance_prompt(
        self,
        user_input: str,
        style: str = "modern",
        room_type: str = "living_room",
    ) -> str:
        """
        사용자의 간단한 요청을 고품질 이미지 생성용 프롬프트로 변환

        Args:
            user_input: 사용자의 스타일 요청 (예: "밝고 따뜻한 느낌으로")
            style: 기본 스타일 (modern, minimalist, etc.)
            room_type: 공간 유형

        Returns:
            str: 강화된 프롬프트
        """
        await self.initialize()

        base_style = STYLE_PROMPTS.get(style, STYLE_PROMPTS["modern"])

        prompt = PROMPT_ENHANCEMENT_TEMPLATE.format(
            user_input=user_input,
            room_type=room_type,
            base_style=base_style,
        )

        try:
            response = await self._model.generate_content_async(prompt)
            enhanced = response.text.strip()

            # 기본 품질 향상 태그 추가
            quality_tags = "interior photography, professional lighting, 8k uhd, high detail, architectural visualization"
            return f"{enhanced}, {quality_tags}"
        except Exception as e:
            print(f"[Designer] Prompt enhancement failed: {e}")
            # 폴백: 기본 스타일 프롬프트 사용
            room_prompt = ROOM_PROMPTS.get(room_type, "")
            return f"{base_style}, {room_prompt}, interior photography, professional lighting, high quality"

    async def generate_interior_image(
        self,
        base_image_url: Optional[str] = None,
        base_image_base64: Optional[str] = None,
        style_prompt: str = "",
        style: str = "modern",
        room_type: str = "living_room",
        negative_prompt: Optional[str] = None,
        reference_image_urls: Optional[List[str]] = None,
        floor_plan_analysis: Optional[FloorPlanAnalysis] = None,
        viewpoint_request: Optional[str] = None,
        dwg_elements: Optional[dict] = None,  # DWG 원본 요소 데이터 (lineart 생성용)
    ) -> Dict[str, Any]:
        """
        인테리어 디자인 이미지 생성

        Args:
            base_image_url: 베이스 이미지 URL (Clean Slate 또는 도면)
            base_image_base64: 베이스 이미지 Base64
            style_prompt: 스타일 프롬프트 (사용자 입력 또는 강화된 프롬프트)
            style: 스타일 종류
            room_type: 공간 유형
            negative_prompt: 제외할 요소들
            reference_image_urls: 레퍼런스 이미지 URL 목록
            floor_plan_analysis: 건축사 에이전트의 도면 분석 결과
            viewpoint_request: 시점 요청 (예: "view from kitchen looking towards living room")

        Returns:
            dict: 생성된 이미지 정보
        """
        await self.initialize()

        # DWG 원본 요소가 있으면 lineart 생성 (ControlNet 참조용)
        lineart_base64 = None
        if dwg_elements:
            try:
                lineart_base64 = self._generate_lineart_from_dwg(dwg_elements)
                if lineart_base64:
                    print(f"[Designer] Generated lineart from DWG elements for ControlNet")
            except Exception as e:
                print(f"[Designer] Failed to generate lineart: {e}")

        # 프롬프트가 없으면 기본 스타일 프롬프트 사용
        if not style_prompt:
            style_prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["modern"])
            room_prompt = ROOM_PROMPTS.get(room_type, "")
            style_prompt = f"{style_prompt}, {room_prompt}"

        # 1. 건축사 분석 결과가 있으면 이를 기반으로 공간 설명 생성 (우선)
        layout_description = ""
        if floor_plan_analysis:
            # 시점 정보가 있으면 공간 관계를 반영한 프롬프트 생성
            if viewpoint_request:
                layout_description = self._generate_spatial_prompt(floor_plan_analysis, viewpoint_request)
                print(f"[Designer] Using spatial-aware prompt: {layout_description[:150]}...")
            else:
                layout_description = self._convert_floor_plan_to_prompt(floor_plan_analysis)
                print(f"[Designer] Using architect's analysis: {layout_description[:150]}...")
        # 1-1. 건축사 분석이 없고 도면 이미지가 있으면 Gemini로 분석 (폴백)
        elif base_image_url or base_image_base64:
            try:
                layout_description = await self._analyze_floor_plan_layout(
                    image_url=base_image_url,
                    image_base64=base_image_base64,
                )
                if layout_description:
                    print(f"[Designer] Gemini floor plan analysis: {layout_description[:100]}...")
            except Exception as e:
                print(f"[Designer] Floor plan analysis failed: {e}")

        # 레이아웃 설명을 프롬프트에 추가
        if layout_description:
            style_prompt = f"Interior design of {layout_description}. Style: {style_prompt}"

        # 2. 레퍼런스 이미지가 있으면 Gemini로 스타일 분석 후 프롬프트 보강
        if reference_image_urls and len(reference_image_urls) > 0:
            try:
                reference_style = await self._analyze_reference_images(reference_image_urls)
                if reference_style:
                    style_prompt = f"{style_prompt}, inspired by: {reference_style}"
                    print(f"[Designer] Enhanced with reference analysis: {reference_style[:100]}...")
            except Exception as e:
                print(f"[Designer] Reference analysis failed: {e}")

        # 기본 네거티브 프롬프트 (강화된 창문 관련 항목 포함)
        if not negative_prompt:
            negative_prompt = (
                "blurry, low quality, distorted, unrealistic, cartoon, anime, sketch, "
                "people, text, watermark, floor plan, blueprint, diagram, "
                # 창문 관련 강화
                "window frame in middle, window mullions, divided glass panes, "
                "pillar in window, column breaking window, window with vertical divider, "
                "split window, segmented window, multi-pane window"
            )

        # 도면 분석에서 창문 정보가 있으면 네거티브 프롬프트 추가 보강
        depth_map_base64 = None
        if floor_plan_analysis:
            window_count = sum(1 for e in floor_plan_analysis.elements
                              if (hasattr(e.element_type, 'value') and e.element_type.value == 'window')
                              or str(e.element_type) == 'window')
            if window_count == 1:
                # 단일 창문인 경우, 중간에 기둥이 생기지 않도록 더 강력하게
                negative_prompt += (
                    ", pillars in window, columns breaking window, divided window, "
                    "window with pillar, mullions, vertical bars in window, "
                    "window supports, window posts, structural divider in window"
                )
            if window_count <= 2:
                # 창문이 적을 때 추가 창문이 생기지 않도록
                negative_prompt += ", extra windows, additional windows, multiple windows, many windows"

            # 시점 정보가 있으면 depth map 생성
            if viewpoint_request:
                try:
                    depth_map_base64 = self._generate_perspective_depth_map(
                        analysis=floor_plan_analysis,
                        viewpoint=viewpoint_request,
                        width=1024,
                        height=768,
                    )
                except Exception as e:
                    print(f"[Designer] Depth map generation failed: {e}")
                    depth_map_base64 = None

        # seed 계산 (도면 + 시점 기반으로 고정된 값 생성)
        seed = None
        if floor_plan_analysis and viewpoint_request:
            seed = self._calculate_camera_hash(floor_plan_analysis, viewpoint_request)
            print(f"[Designer] Calculated seed from floor plan + viewpoint: {seed}")

        # Replicate API가 설정되어 있으면 실제 이미지 생성
        if self.replicate_api_key:
            # DWG lineart가 있으면 우선 사용 (원본 도면 구조 유지)
            # 없으면 depth map 사용
            control_image = lineart_base64 or depth_map_base64
            control_type = "lineart" if lineart_base64 else ("depth" if depth_map_base64 else None)

            if control_type:
                print(f"[Designer] Using ControlNet {control_type} for structure guidance")

            return await self._generate_with_replicate(
                base_image_url=None,
                base_image_base64=None,
                prompt=style_prompt,
                negative_prompt=negative_prompt,
                depth_map_base64=control_image,  # lineart 또는 depth map 전달
                seed=seed,  # 고정된 seed 전달 (재현성 보장)
                control_type=control_type,  # 컨트롤 타입 전달
            )
        else:
            # MVP: 목업 응답 반환
            return await self._generate_mockup_response(
                style=style,
                room_type=room_type,
                prompt=style_prompt,
            )

    def _generate_lineart_from_dwg(
        self,
        dwg_elements: dict,
        width: int = 1024,
        height: int = 768,
    ) -> str:
        """
        DWG 요소 데이터로부터 ControlNet Lineart 이미지 생성
        원본 DWG의 선(Line) 정보를 최대한 보존하여 구조 일관성 확보

        Args:
            dwg_elements: DWG 파싱된 요소 데이터 (walls, doors, windows 등)
            width: 출력 이미지 너비
            height: 출력 이미지 높이

        Returns:
            str: base64 인코딩된 lineart 이미지
        """
        # 흰 배경에 검은 선
        img = Image.new('RGB', (width, height), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)

        # DWG 좌표 범위 계산 (정규화용)
        all_coords = []
        for key in ["walls", "doors", "windows", "elements"]:
            items = dwg_elements.get(key, [])
            if isinstance(items, list):
                for item in items:
                    coords = item.get("coordinates", {})
                    if coords:
                        all_coords.append((
                            coords.get("x", 0),
                            coords.get("y", 0),
                            coords.get("x", 0) + coords.get("width", 0),
                            coords.get("y", 0) + coords.get("height", 0)
                        ))

        if not all_coords:
            return ""

        # 경계 계산
        min_x = min(c[0] for c in all_coords)
        min_y = min(c[1] for c in all_coords)
        max_x = max(c[2] for c in all_coords)
        max_y = max(c[3] for c in all_coords)

        dwg_width = max_x - min_x
        dwg_height = max_y - min_y

        if dwg_width == 0 or dwg_height == 0:
            return ""

        # 마진 추가
        margin = 50
        scale_x = (width - 2 * margin) / dwg_width
        scale_y = (height - 2 * margin) / dwg_height
        scale = min(scale_x, scale_y)

        def transform_coord(x, y):
            """DWG 좌표를 이미지 좌표로 변환 (Y축 반전 포함)"""
            new_x = margin + (x - min_x) * scale
            new_y = margin + (max_y - y) * scale  # Y축 반전
            return (new_x, new_y)

        # 벽 그리기 (두꺼운 선)
        walls = dwg_elements.get("walls", [])
        for wall in walls:
            coords = wall.get("coordinates", {})
            if not coords:
                continue

            x1, y1 = transform_coord(coords.get("x", 0), coords.get("y", 0))
            x2 = x1 + coords.get("width", 0) * scale
            y2 = y1 - coords.get("height", 0) * scale  # Y반전된 좌표계

            # 레이어에 따라 선 두께 조정
            layer = wall.get("layer", "").upper()
            line_width = 4 if "LOAD" in layer else 2

            draw.rectangle([x1, y2, x2, y1], outline=(0, 0, 0), width=line_width)

        # 문 그리기 (얇은 선 + 호)
        doors = dwg_elements.get("doors", [])
        for door in doors:
            coords = door.get("coordinates", {})
            if not coords:
                continue

            x1, y1 = transform_coord(coords.get("x", 0), coords.get("y", 0))
            w = coords.get("width", 0) * scale
            h = coords.get("height", 0) * scale

            # 문 프레임
            draw.rectangle([x1, y1 - h, x1 + w, y1], outline=(100, 100, 100), width=1)

        # 창문 그리기
        windows = dwg_elements.get("windows", [])
        for window in windows:
            coords = window.get("coordinates", {})
            if not coords:
                continue

            x1, y1 = transform_coord(coords.get("x", 0), coords.get("y", 0))
            w = coords.get("width", 0) * scale
            h = coords.get("height", 0) * scale

            # 창문 (이중선)
            draw.rectangle([x1, y1 - h, x1 + w, y1], outline=(50, 50, 50), width=2)
            draw.rectangle([x1 + 2, y1 - h + 2, x1 + w - 2, y1 - 2], outline=(150, 150, 150), width=1)

        # base64 인코딩
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

    def _convert_floor_plan_to_prompt(self, analysis: FloorPlanAnalysis) -> str:
        """
        건축사 에이전트의 도면 분석 결과를 인테리어 이미지 생성용 프롬프트로 변환

        Args:
            analysis: FloorPlanAnalysis 객체

        Returns:
            str: 공간 설명 프롬프트
        """
        parts = []

        # 면적 정보 (estimated_area는 평 단위, 제곱미터로 변환)
        if analysis.estimated_area:
            area_sqm = int(analysis.estimated_area * 3.3)  # 평 → 제곱미터
            parts.append(f"a {area_sqm} square meter apartment")

        # 방 구성
        room_info = []
        if analysis.room_count:
            room_info.append(f"{analysis.room_count} bedrooms")
        if analysis.bathroom_count:
            room_info.append(f"{analysis.bathroom_count} bathrooms")
        if room_info:
            parts.append(f"with {', '.join(room_info)}")

        # 구조물 분석에서 공간 특성 추출
        has_open_kitchen = False
        has_living_room = False
        windows = []  # 창문 정보를 리스트로 수집

        for element in analysis.elements:
            label_lower = element.label.lower() if element.label else ""
            element_type = element.element_type.value if hasattr(element.element_type, 'value') else str(element.element_type)

            # 주방 관련
            if "주방" in label_lower or "kitchen" in label_lower:
                if "오픈" in label_lower or element_type == "non_load_bearing_wall":
                    has_open_kitchen = True

            # 거실 관련
            if "거실" in label_lower or "living" in label_lower:
                has_living_room = True

            # 창문 관련 - 상세 정보 수집
            if element_type == "window":
                pos = element.position
                window_info = {
                    "label": element.label,
                    "width": pos.get("width", 0) if pos else 0,
                    "height": pos.get("height", 0) if pos else 0,
                    "x": pos.get("x", 0) if pos else 0,
                    "y": pos.get("y", 0) if pos else 0,
                }
                # 방향 추론
                if pos:
                    y = pos.get("y", 50)
                    if y < 30:
                        window_info["direction"] = "north"
                    elif y > 70:
                        window_info["direction"] = "south"
                    else:
                        x = pos.get("x", 50)
                        if x < 30:
                            window_info["direction"] = "west"
                        elif x > 70:
                            window_info["direction"] = "east"
                windows.append(window_info)

        # 공간 특성 설명 추가
        features = []
        if has_open_kitchen:
            features.append("open-plan kitchen connected to living area")
        if has_living_room:
            features.append("spacious living room")

        # 창문 설명 생성 - 더 구체적으로
        if windows:
            window_count = len(windows)
            # 창문이 하나이고 넓은 경우
            if window_count == 1:
                w = windows[0]
                direction = w.get("direction", "")
                width = w.get("width", 0)
                label = w.get("label", "").lower()

                # 라벨에서 단일창/연속창 확인
                is_continuous = "단일" in label or "연속" in label or "전면" in label

                if width > 30 or is_continuous:  # 넓은 창문 (도면 기준 30% 이상) 또는 단일창으로 명시
                    dir_str = f"{direction}-facing " if direction else ""
                    features.append(f"one large continuous floor-to-ceiling {dir_str}window wall spanning the living room without any pillars or dividers")
                else:
                    dir_str = f"{direction}-facing " if direction else ""
                    features.append(f"single {dir_str}window with natural light")
            elif window_count == 2:
                # 두 개의 창문이 인접해 있는지 확인
                w1, w2 = windows[0], windows[1]
                same_wall = abs(w1.get("y", 0) - w2.get("y", 0)) < 10 or abs(w1.get("x", 0) - w2.get("x", 0)) < 10
                if same_wall:
                    direction = w1.get("direction", "")
                    dir_str = f"{direction}-facing " if direction else ""
                    features.append(f"two {dir_str}windows on the same wall")
                else:
                    features.append("windows on multiple walls providing cross-ventilation")
            else:
                # 여러 창문
                directions = set(w.get("direction", "") for w in windows if w.get("direction"))
                if directions:
                    features.append(f"multiple windows facing {', '.join(directions)} with abundant natural light")
                else:
                    features.append("multiple windows with natural light")

        if features:
            parts.append(f"featuring {', '.join(features)}")

        # 분석 요약이 있으면 추가
        if analysis.analysis_summary:
            # 요약에서 핵심 키워드 추출 (한국어 → 영어 매핑은 간단히)
            summary_lower = analysis.analysis_summary.lower()
            if "넓" in summary_lower or "open" in summary_lower:
                parts.append("with open floor plan")
            if "ㄱ" in summary_lower or "l자" in summary_lower or "l-shaped" in summary_lower:
                parts.append("L-shaped layout")

        result = " ".join(parts) if parts else "modern apartment interior"
        return result

    def _extract_room_positions(self, analysis: FloorPlanAnalysis) -> Dict[str, Dict[str, Any]]:
        """
        도면 분석에서 각 공간의 중심 좌표와 요소들을 추출

        Returns:
            dict: {
                "kitchen": {"center": (x, y), "elements": [...]},
                "living_room": {"center": (x, y), "elements": [...]},
                "windows": [...],
                "doors": [...],
            }
        """
        rooms = {
            "kitchen": {"elements": [], "center": None},
            "living_room": {"elements": [], "center": None},
            "bedroom": {"elements": [], "center": None},
            "bathroom": {"elements": [], "center": None},
            "entrance": {"elements": [], "center": None},
        }
        windows = []
        doors = []

        for element in analysis.elements:
            label_lower = element.label.lower() if element.label else ""
            element_type = element.element_type.value if hasattr(element.element_type, 'value') else str(element.element_type)
            pos = element.position or {}

            # 창문/문 수집
            if element_type == "window":
                windows.append({
                    "label": element.label,
                    "x": pos.get("x", 50),
                    "y": pos.get("y", 50),
                    "width": pos.get("width", 20),
                    "height": pos.get("height", 5),
                    "is_continuous": "단일" in label_lower or "연속" in label_lower or "전면" in label_lower
                })
            elif element_type == "door":
                doors.append({
                    "label": element.label,
                    "x": pos.get("x", 50),
                    "y": pos.get("y", 50),
                })

            # 방 분류 (라벨 기반)
            if "주방" in label_lower or "kitchen" in label_lower:
                rooms["kitchen"]["elements"].append({"pos": pos, "label": element.label})
            elif "거실" in label_lower or "living" in label_lower:
                rooms["living_room"]["elements"].append({"pos": pos, "label": element.label})
            elif "침실" in label_lower or "bedroom" in label_lower or "방" in label_lower:
                rooms["bedroom"]["elements"].append({"pos": pos, "label": element.label})
            elif "욕실" in label_lower or "bathroom" in label_lower or "화장실" in label_lower:
                rooms["bathroom"]["elements"].append({"pos": pos, "label": element.label})
            elif "현관" in label_lower or "entrance" in label_lower:
                rooms["entrance"]["elements"].append({"pos": pos, "label": element.label})

        # 각 방의 중심 좌표 계산
        for room_name, room_data in rooms.items():
            if room_data["elements"]:
                xs = [e["pos"].get("x", 50) for e in room_data["elements"] if e["pos"]]
                ys = [e["pos"].get("y", 50) for e in room_data["elements"] if e["pos"]]
                if xs and ys:
                    room_data["center"] = (sum(xs) / len(xs), sum(ys) / len(ys))

        # 기본값 설정 (좌표가 없는 경우)
        # 일반적인 한국 아파트 레이아웃 가정: 현관(우측) → 주방(중앙) → 거실(좌측/창가)
        if not rooms["kitchen"]["center"]:
            rooms["kitchen"]["center"] = (60, 50)  # 중앙 우측
        if not rooms["living_room"]["center"]:
            rooms["living_room"]["center"] = (30, 50)  # 중앙 좌측 (창가 쪽)
        if not rooms["entrance"]["center"]:
            rooms["entrance"]["center"] = (85, 50)  # 우측

        # 창문 기본값 (거실 방향에 위치)
        if not windows:
            windows.append({
                "label": "거실 창문",
                "x": 10, "y": 50,
                "width": 30, "height": 5,
                "is_continuous": True
            })

        return {
            **rooms,
            "windows": windows,
            "doors": doors,
        }

    def _calculate_camera_hash(self, analysis: FloorPlanAnalysis, viewpoint: str) -> int:
        """
        도면과 시점을 기반으로 고유한 seed 값 생성 (재현성 보장)
        """
        # 도면의 고유 특성들을 해시
        elements_str = ""
        for e in analysis.elements:
            pos = e.position or {}
            elements_str += f"{e.label}:{pos.get('x', 0)}:{pos.get('y', 0)}:"

        hash_input = f"{elements_str}{viewpoint}{analysis.estimated_area}"
        return hash(hash_input) % (2**32)  # 양수 32비트 정수

    def _generate_spatial_prompt(self, analysis: FloorPlanAnalysis, viewpoint: str) -> str:
        """
        시점 정보와 도면 분석을 결합하여 공간 관계가 정확한 프롬프트 생성

        Args:
            analysis: FloorPlanAnalysis 객체
            viewpoint: 시점 정보 (예: "view from kitchen looking towards living room")

        Returns:
            str: 공간 관계가 반영된 프롬프트
        """
        viewpoint_lower = viewpoint.lower()

        # 기본 아파트 정보
        area_sqm = int(analysis.estimated_area * 3.3) if analysis.estimated_area else 100
        room_info = f"{analysis.room_count} bedrooms, {analysis.bathroom_count} bathrooms"

        # 도면에서 실제 좌표 추출
        room_positions = self._extract_room_positions(analysis)
        windows = room_positions["windows"]
        doors = room_positions["doors"]

        # 카메라 위치 계산
        kitchen_center = room_positions["kitchen"]["center"]
        living_center = room_positions["living_room"]["center"]

        # 좌표 기반 방향 계산
        if kitchen_center and living_center:
            dx = living_center[0] - kitchen_center[0]
            dy = living_center[1] - kitchen_center[1]
            # 방향 결정
            if abs(dx) > abs(dy):
                direction = "left" if dx < 0 else "right"
            else:
                direction = "forward" if dy < 0 else "backward"
        else:
            direction = "forward"

        has_open_kitchen = any("오픈" in e.get("label", "").lower()
                               for room in room_positions.values()
                               if isinstance(room, dict) and "elements" in room
                               for e in room.get("elements", []))

        # 시점에 따른 공간 설명 생성
        spatial_parts = []

        # 주방에서 거실을 바라볼 때
        if ("kitchen" in viewpoint_lower and "living" in viewpoint_lower) or "주방에서" in viewpoint_lower:
            spatial_parts.append(f"Interior photography of a {area_sqm}sqm modern Korean apartment living room")
            spatial_parts.append("POV shot from behind kitchen counter looking at the living room")
            spatial_parts.append("Kitchen counter and cabinets visible in the FOREGROUND at bottom of frame")
            spatial_parts.append("Living room sofa and furniture in the MIDDLE of frame")

            # 정면에 창문이 보여야 함
            if windows:
                main_window = windows[0]
                if main_window.get("is_continuous") or len(windows) == 1:
                    spatial_parts.append("Large floor-to-ceiling window wall in the BACKGROUND spanning the far wall, one continuous window without pillars")
                else:
                    spatial_parts.append("Windows visible in the BACKGROUND at the far wall")

            # 현관은 보이지 않아야 함
            spatial_parts.append("NO kitchen appliances or sink visible, those are behind the camera")

        # 거실에서 주방을 바라볼 때
        elif ("living" in viewpoint_lower and "kitchen" in viewpoint_lower) or "거실에서" in viewpoint_lower:
            spatial_parts.append(f"Interior photography of a {area_sqm}sqm modern Korean apartment kitchen")
            spatial_parts.append("POV shot from living room sofa looking at the open kitchen")
            spatial_parts.append("Sofa armrest or coffee table edge visible in the FOREGROUND at bottom of frame")
            spatial_parts.append("Open kitchen with island counter, cabinets, and appliances in the CENTER and BACKGROUND of frame")
            spatial_parts.append("Kitchen sink, refrigerator, and cooking area clearly visible")
            spatial_parts.append("Natural light coming from BEHIND the camera (from living room windows)")
            spatial_parts.append("NO windows directly visible in this view, windows are behind the viewer")

        # 창가 방향
        elif "window" in viewpoint_lower or "창가" in viewpoint_lower:
            spatial_parts.append(f"Interior photography of a {area_sqm}sqm modern Korean apartment")
            spatial_parts.append("Camera facing towards the windows")
            if windows:
                main_window = windows[0]
                if main_window.get("is_continuous") or len(windows) == 1:
                    spatial_parts.append("ONE large continuous floor-to-ceiling window wall DIRECTLY IN FRONT, no columns or pillars dividing the window")
            spatial_parts.append("Bright natural light streaming in")

        # 현관에서 실내를 바라볼 때
        elif "entrance" in viewpoint_lower or "현관" in viewpoint_lower:
            spatial_parts.append(f"Interior photography of a {area_sqm}sqm modern Korean apartment")
            spatial_parts.append("Camera at the entrance, looking into the apartment")
            spatial_parts.append("Living room visible in front or to the side")
            if windows:
                spatial_parts.append("Windows visible in the distance at the far end of the apartment")

        # 침실/욕실 입구
        elif "bedroom" in viewpoint_lower or "침실" in viewpoint_lower:
            spatial_parts.append(f"Interior photography of a {area_sqm}sqm modern Korean apartment bedroom")
            spatial_parts.append("Camera at the bedroom entrance, looking into the room")
            spatial_parts.append("Bed visible in the center or against one wall")

        elif "bathroom" in viewpoint_lower or "욕실" in viewpoint_lower:
            spatial_parts.append(f"Interior photography of a {area_sqm}sqm modern Korean apartment bathroom")
            spatial_parts.append("Camera at the bathroom entrance, looking inside")

        # 기본값
        else:
            return self._convert_floor_plan_to_prompt(analysis)

        # 공통 추가 사항
        spatial_parts.append(f"Apartment has {room_info}")

        result = ". ".join(spatial_parts)
        print(f"[Designer] Generated spatial prompt for viewpoint '{viewpoint[:50]}': {result[:200]}...")
        return result

    def _generate_perspective_depth_map(
        self,
        analysis: FloorPlanAnalysis,
        viewpoint: str,
        width: int = 1024,
        height: int = 768,
    ) -> str:
        """
        도면 분석 결과와 시점을 기반으로 3D 관점 depth map 생성
        실제 좌표를 사용하여 일관된 depth map 생성

        Args:
            analysis: FloorPlanAnalysis 객체
            viewpoint: 시점 정보
            width: 이미지 너비
            height: 이미지 높이

        Returns:
            str: base64 인코딩된 depth map 이미지
        """
        # depth map 생성 (검정=가까움, 흰색=멀음)
        img = Image.new('RGB', (width, height), color=(50, 50, 50))  # 중간 회색 배경
        draw = ImageDraw.Draw(img)

        viewpoint_lower = viewpoint.lower()

        # 도면에서 실제 좌표 추출
        room_positions = self._extract_room_positions(analysis)
        windows = room_positions["windows"]

        # 카메라 위치와 방향 계산
        kitchen_center = room_positions["kitchen"]["center"]
        living_center = room_positions["living_room"]["center"]
        entrance_center = room_positions["entrance"]["center"]

        # 창문 위치 (도면 좌표 기반)
        main_window = windows[0] if windows else {"x": 10, "y": 50, "width": 30, "is_continuous": True}
        window_x = main_window.get("x", 10)
        window_width = main_window.get("width", 30)

        print(f"[Designer] Depth map using coordinates: kitchen={kitchen_center}, living={living_center}, window_x={window_x}")

        has_open_kitchen = False

        # 주방에서 거실을 바라볼 때
        if ("kitchen" in viewpoint_lower and "living" in viewpoint_lower) or "주방에서" in viewpoint_lower:
            # 바닥 (가까운 곳은 밝게, 먼 곳은 어둡게) - depth gradient
            for y in range(height // 3, height):
                depth_value = int(200 - (y - height // 3) / (height * 2 / 3) * 150)
                draw.line([(0, y), (width, y)], fill=(depth_value, depth_value, depth_value))

            # 천장 (멀리)
            draw.rectangle([0, 0, width, height // 4], fill=(30, 30, 30))

            # 왼쪽 벽 (옆면, 사다리꼴)
            left_wall = [
                (0, height // 4),  # 상단 왼쪽
                (width // 6, height // 3),  # 상단 오른쪽 (원근)
                (width // 6, height - 50),  # 하단 오른쪽
                (0, height),  # 하단 왼쪽
            ]
            draw.polygon(left_wall, fill=(80, 80, 80))

            # 오른쪽 벽 (옆면, 사다리꼴)
            right_wall = [
                (width, height // 4),  # 상단 오른쪽
                (width - width // 6, height // 3),  # 상단 왼쪽 (원근)
                (width - width // 6, height - 50),  # 하단 왼쪽
                (width, height),  # 하단 오른쪽
            ]
            draw.polygon(right_wall, fill=(80, 80, 80))

            # 정면 벽 (멀리 - 어두움)
            far_wall = [
                (width // 6, height // 3),
                (width - width // 6, height // 3),
                (width - width // 6, height - 50),
                (width // 6, height - 50),
            ]
            draw.polygon(far_wall, fill=(40, 40, 40))

            # 창문 (정면 벽에, 가장 밝게 - 빛이 들어옴)
            if windows:
                main_window = windows[0]
                # 창문 크기 계산 (도면 좌표 기반)
                w_width = main_window.get("width", 30)
                is_continuous = main_window.get("is_continuous", False)

                if w_width > 25 or is_continuous:
                    # 넓은 창문 - 거의 전체 벽
                    window_rect = [
                        width // 5,  # left
                        height // 3 + 20,  # top
                        width - width // 5,  # right
                        height - 100,  # bottom
                    ]
                else:
                    # 작은 창문
                    window_rect = [
                        width // 3,
                        height // 3 + 30,
                        width - width // 3,
                        height - 120,
                    ]
                draw.rectangle(window_rect, fill=(250, 250, 250))  # 매우 밝음 (빛)

            # 주방 카운터 (전경, 아래쪽)
            counter_polygon = [
                (0, height - 150),
                (width // 4, height - 100),
                (width // 4, height),
                (0, height),
            ]
            draw.polygon(counter_polygon, fill=(180, 180, 180))  # 가까움 = 밝음

        # 거실에서 주방을 바라볼 때
        elif ("living" in viewpoint_lower and "kitchen" in viewpoint_lower) or "거실에서" in viewpoint_lower:
            # 바닥
            for y in range(height // 3, height):
                depth_value = int(200 - (y - height // 3) / (height * 2 / 3) * 150)
                draw.line([(0, y), (width, y)], fill=(depth_value, depth_value, depth_value))

            # 천장
            draw.rectangle([0, 0, width, height // 4], fill=(30, 30, 30))

            # 왼쪽/오른쪽 벽
            draw.polygon([
                (0, height // 4), (width // 6, height // 3),
                (width // 6, height - 50), (0, height)
            ], fill=(80, 80, 80))
            draw.polygon([
                (width, height // 4), (width - width // 6, height // 3),
                (width - width // 6, height - 50), (width, height)
            ], fill=(80, 80, 80))

            # 정면 (주방) - 캐비닛과 가전
            draw.polygon([
                (width // 6, height // 3), (width - width // 6, height // 3),
                (width - width // 6, height - 50), (width // 6, height - 50)
            ], fill=(60, 60, 60))

            # 주방 카운터/아일랜드 (중앙)
            island = [
                (width // 3, height - 200),
                (width * 2 // 3, height - 200),
                (width * 2 // 3, height - 80),
                (width // 3, height - 80),
            ]
            draw.rectangle(island, fill=(100, 100, 100))

            # 소파 암레스트 (전경)
            draw.rectangle([0, height - 100, width // 5, height], fill=(200, 200, 200))

        # 창가 방향
        elif "window" in viewpoint_lower or "창가" in viewpoint_lower:
            # 바닥
            for y in range(height // 3, height):
                depth_value = int(200 - (y - height // 3) / (height * 2 / 3) * 150)
                draw.line([(0, y), (width, y)], fill=(depth_value, depth_value, depth_value))

            # 천장
            draw.rectangle([0, 0, width, height // 4], fill=(30, 30, 30))

            # 측면 벽
            draw.polygon([
                (0, height // 4), (width // 8, height // 3),
                (width // 8, height - 50), (0, height)
            ], fill=(80, 80, 80))
            draw.polygon([
                (width, height // 4), (width - width // 8, height // 3),
                (width - width // 8, height - 50), (width, height)
            ], fill=(80, 80, 80))

            # 큰 창문 (정면 거의 전체)
            window_rect = [
                width // 10,
                height // 4,
                width - width // 10,
                height - 80,
            ]
            draw.rectangle(window_rect, fill=(255, 255, 255))  # 매우 밝음

        else:
            # 기본값: 일반적인 거실 관점
            for y in range(height // 3, height):
                depth_value = int(180 - (y - height // 3) / (height * 2 / 3) * 130)
                draw.line([(0, y), (width, y)], fill=(depth_value, depth_value, depth_value))
            draw.rectangle([0, 0, width, height // 3], fill=(40, 40, 40))

        # Gaussian Blur 적용 (edge를 부드럽게 하여 ControlNet 결과 개선)
        img = img.filter(ImageFilter.GaussianBlur(radius=5))

        # 이미지를 base64로 인코딩
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        print(f"[Designer] Generated depth map with blur for viewpoint: {viewpoint[:30]}...")
        return img_base64

    async def _analyze_reference_images(self, image_urls: List[str]) -> str:
        """
        Gemini를 사용해 레퍼런스 이미지들의 스타일을 분석

        Args:
            image_urls: 레퍼런스 이미지 URL 목록

        Returns:
            str: 분석된 스타일 설명
        """
        try:
            # 이미지 URL을 Gemini에 전달
            parts = []
            for url in image_urls[:3]:  # 최대 3장만 분석
                parts.append({"mime_type": "image/jpeg", "file_uri": url})

            prompt = """You are an expert interior designer. Analyze these reference interior images and extract the key design elements.

Describe in English, in a single paragraph (max 100 words):
1. Color palette (dominant and accent colors)
2. Materials used (wood, metal, fabric, etc.)
3. Furniture style
4. Lighting atmosphere
5. Overall mood/vibe

Output ONLY the design description, no explanations or bullet points."""

            # Gemini Vision 호출
            response = await self._model.generate_content_async([prompt] + [url for url in image_urls[:3]])
            return response.text.strip()

        except Exception as e:
            print(f"[Designer] Reference image analysis error: {e}")
            return ""

    async def _analyze_floor_plan_layout(
        self,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
    ) -> str:
        """
        Gemini Vision을 사용해 도면의 방 배치를 분석하여 텍스트로 변환

        Args:
            image_url: 도면 이미지 URL
            image_base64: 도면 이미지 Base64

        Returns:
            str: 방 배치 설명 (영문)
        """
        try:
            prompt = """You are an expert interior designer analyzing a floor plan.
Describe the room layout in English for generating an interior design image.

Focus on:
1. Room shape (rectangular, L-shaped, open plan, etc.)
2. Room positions (living room on the left, kitchen in the back, etc.)
3. Window positions (large windows on south side, etc.)
4. Special features (high ceiling, open kitchen, etc.)

Output a single paragraph (max 80 words) describing the spatial layout.
Use phrases like: "spacious L-shaped living area", "open-plan kitchen connected to dining", "large windows on the right wall"
Do NOT mention any measurements or technical terms. Focus on spatial description for interior visualization."""

            if image_base64:
                # Base64 이미지 사용
                image_part = {
                    "mime_type": "image/png",
                    "data": image_base64
                }
                response = await self._model.generate_content_async([prompt, image_part])
            elif image_url:
                # URL 이미지 사용
                response = await self._model.generate_content_async([prompt, image_url])
            else:
                return ""

            layout_description = response.text.strip()
            print(f"[Designer] Floor plan layout analysis: {layout_description[:100]}...")
            return layout_description

        except Exception as e:
            print(f"[Designer] Floor plan analysis error: {e}")
            return ""

    async def _generate_with_replicate(
        self,
        base_image_url: Optional[str],
        base_image_base64: Optional[str],
        prompt: str,
        negative_prompt: str,
        depth_map_base64: Optional[str] = None,
        seed: Optional[int] = None,
        control_type: Optional[str] = None,  # "lineart", "depth", or None
    ) -> Dict[str, Any]:
        """
        Replicate API를 사용한 이미지 생성

        Control types:
        - "lineart": DWG 원본 구조를 최대한 유지 (가장 정확한 구조)
        - "depth": 3D 깊이감 있는 렌더링 (시점 표현에 적합)
        - None: 순수 text-to-image (구조 제약 없음)

        seed를 고정하면 같은 입력에 대해 같은 출력 보장
        """
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                full_prompt = f"realistic interior design photograph, {prompt}, professional interior photography, 8k uhd, highly detailed, architectural visualization"

                # ControlNet 이미지가 있으면 사용
                if depth_map_base64:
                    # control_type에 따라 다른 모델 선택
                    if control_type == "lineart":
                        # SDXL ControlNet Lineart 모델 - DWG 원본 구조 보존에 최적
                        # https://replicate.com/lucataco/sdxl-controlnet-lineart
                        model_version = "af55c8f1d4d3b2e5d8f8e3e5f0c8e5a8b9f3c5d1e6a2b4c8d9e0f1a2b3c4d5e6"
                        model_name = "sdxl-controlnet-lineart"
                        condition_scale = 0.9  # lineart는 더 높은 강도로 구조 유지
                        print(f"[Designer] Using ControlNet Lineart for DWG structure preservation")
                    else:
                        # SDXL ControlNet Depth 모델 - 3D 깊이감/시점 표현에 최적
                        # https://replicate.com/lucataco/sdxl-controlnet
                        model_version = "db2ffdbdc7f6cb4d6dab512434679ee3366ae7ab84f89750f8947d5594b79a47"
                        model_name = "sdxl-controlnet-depth"
                        condition_scale = 0.8  # depth는 적당한 강도
                        print(f"[Designer] Using ControlNet Depth for perspective rendering")

                    input_data = {
                        "prompt": full_prompt,
                        "negative_prompt": negative_prompt,
                        "image": f"data:image/png;base64,{depth_map_base64}",
                        "condition_scale": condition_scale,
                        "num_inference_steps": 30,
                        "guidance_scale": 7.5,
                    }

                    # seed 추가 (재현성 보장)
                    if seed is not None:
                        input_data["seed"] = seed
                        print(f"[Designer] Using seed: {seed}")

                    print(f"[Designer] Prompt: {full_prompt[:200]}...")

                else:
                    # 순수 SDXL text-to-image
                    model_version = "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc"
                    model_name = "sdxl"

                    input_data = {
                        "prompt": full_prompt,
                        "negative_prompt": negative_prompt,
                        "width": 1024,
                        "height": 768,
                        "num_inference_steps": 35,
                        "guidance_scale": 7.5,
                        "scheduler": "K_EULER",
                    }

                    # seed 추가 (재현성 보장)
                    if seed is not None:
                        input_data["seed"] = seed
                        print(f"[Designer] Using seed: {seed}")

                    print(f"[Designer] Using SDXL text-to-image")
                    print(f"[Designer] Prompt: {full_prompt[:200]}...")

                response = await client.post(
                    "https://api.replicate.com/v1/predictions",
                    headers={
                        "Authorization": f"Token {self.replicate_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "version": model_version,
                        "input": input_data,
                    },
                )

                if response.status_code != 201:
                    raise Exception(f"Replicate API error: {response.text}")

                prediction = response.json()
                prediction_id = prediction["id"]
                print(f"[Designer] Prediction started: {prediction_id}")

                # 결과 폴링 (최대 3분)
                for i in range(36):
                    await asyncio.sleep(5)

                    status_response = await client.get(
                        f"https://api.replicate.com/v1/predictions/{prediction_id}",
                        headers={"Authorization": f"Token {self.replicate_api_key}"},
                    )

                    result = status_response.json()
                    status = result["status"]

                    if i % 3 == 0:  # 15초마다 로그
                        print(f"[Designer] Status: {status}")

                    if status == "succeeded":
                        output = result.get("output")
                        # SDXL은 [generated_image] 반환
                        if isinstance(output, list) and output:
                            image_url = output[0]
                        else:
                            image_url = output
                        print(f"[Designer] Generated image: {image_url[:100] if image_url else 'None'}...")
                        return {
                            "success": True,
                            "image_url": image_url,
                            "prompt_used": prompt,
                            "model": model_name,
                        }
                    elif status == "failed":
                        raise Exception(f"Generation failed: {result.get('error')}")

                raise Exception("Generation timeout (3 minutes)")

        except Exception as e:
            print(f"[Designer] Replicate generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "prompt_used": prompt,
            }

    async def _generate_mockup_response(
        self,
        style: str,
        room_type: str,
        prompt: str,
    ) -> Dict[str, Any]:
        """
        MVP용 목업 응답 생성
        실제 이미지 생성 없이 메타데이터만 반환
        """
        # 스타일별 샘플 이미지 URL (플레이스홀더)
        sample_images = {
            "modern": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800",
            "minimalist": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
            "scandinavian": "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
            "industrial": "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800",
            "natural": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
            "classic": "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800",
            "luxurious": "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800",
            "korean_modern": "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=800",
        }

        return {
            "success": True,
            "image_url": sample_images.get(style, sample_images["modern"]),
            "prompt_used": prompt,
            "model": "mockup",
            "style": style,
            "room_type": room_type,
            "note": "MVP 목업 이미지입니다. 실제 이미지 생성을 위해서는 Replicate API 키가 필요합니다.",
        }

    async def get_style_suggestions(
        self,
        user_preferences: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        """
        사용자에게 스타일 추천 목록 제공

        Args:
            user_preferences: 사용자 선호도 (선택)

        Returns:
            List[dict]: 추천 스타일 목록
        """
        styles = [
            {
                "id": "modern",
                "name": "모던",
                "name_en": "Modern",
                "description": "깔끔한 선과 중립적인 색상의 현대적 디자인",
                "keywords": ["심플", "세련", "깔끔"],
            },
            {
                "id": "minimalist",
                "name": "미니멀",
                "name_en": "Minimalist",
                "description": "불필요한 것을 배제한 극도로 단순한 공간",
                "keywords": ["단순", "여백", "정돈"],
            },
            {
                "id": "scandinavian",
                "name": "북유럽",
                "name_en": "Scandinavian",
                "description": "밝은 우드와 아늑한 텍스처의 휘게 스타일",
                "keywords": ["따뜻", "우드", "아늑"],
            },
            {
                "id": "industrial",
                "name": "인더스트리얼",
                "name_en": "Industrial",
                "description": "노출 콘크리트와 메탈 악센트의 로프트 스타일",
                "keywords": ["빈티지", "메탈", "로프트"],
            },
            {
                "id": "natural",
                "name": "내추럴",
                "name_en": "Natural",
                "description": "자연 소재와 식물이 어우러진 따뜻한 공간",
                "keywords": ["자연", "식물", "우드톤"],
            },
            {
                "id": "classic",
                "name": "클래식",
                "name_en": "Classic",
                "description": "전통적이고 우아한 시간을 초월한 디자인",
                "keywords": ["우아", "전통", "고급"],
            },
            {
                "id": "luxurious",
                "name": "럭셔리",
                "name_en": "Luxurious",
                "description": "대리석과 골드 악센트의 프리미엄 인테리어",
                "keywords": ["고급", "대리석", "프리미엄"],
            },
            {
                "id": "korean_modern",
                "name": "한국 모던",
                "name_en": "Korean Modern",
                "description": "한옥의 미와 현대적 감각이 결합된 스타일",
                "keywords": ["한옥", "온돌", "자연미"],
            },
        ]

        return styles

    def get_style_materials(self, style: str) -> Dict[str, Any]:
        """
        스타일별 자재 정보 반환 (견적 연동용)

        Args:
            style: 스타일 ID (modern, minimalist, etc.)

        Returns:
            dict: 자재 정보 및 가격 범위
        """
        style_data = STYLE_DATA.get(style, STYLE_DATA["modern"])
        return {
            "style_id": style,
            "materials": style_data.get("materials", {}),
            "cost_multiplier": style_data.get("cost_multiplier", 1.0),
        }

    def estimate_material_cost(self, style: str, area_sqm: float) -> Dict[str, Any]:
        """
        스타일과 면적을 기반으로 자재비 추정

        Args:
            style: 스타일 ID
            area_sqm: 면적 (제곱미터)

        Returns:
            dict: 추정 자재비 상세
        """
        style_data = STYLE_DATA.get(style, STYLE_DATA["modern"])
        materials = style_data.get("materials", {})
        cost_multiplier = style_data.get("cost_multiplier", 1.0)

        estimates = {}
        total_min = 0
        total_max = 0

        for category, mat_info in materials.items():
            if isinstance(mat_info, dict) and "price_range" in mat_info:
                unit = mat_info.get("unit", "sqm")
                min_price, max_price = mat_info["price_range"]

                if unit == "sqm":
                    quantity = area_sqm
                elif unit == "m":
                    # 둘레 추정 (정사각형 가정)
                    quantity = 4 * math.sqrt(area_sqm)
                else:  # set
                    quantity = 1

                item_min = int(min_price * quantity)
                item_max = int(max_price * quantity)

                estimates[category] = {
                    "type": mat_info.get("type", ""),
                    "quantity": round(quantity, 1),
                    "unit": unit,
                    "min_cost": item_min,
                    "max_cost": item_max,
                }

                total_min += item_min
                total_max += item_max

        return {
            "style_id": style,
            "area_sqm": area_sqm,
            "cost_multiplier": cost_multiplier,
            "material_estimates": estimates,
            "total_min": int(total_min * cost_multiplier),
            "total_max": int(total_max * cost_multiplier),
            "note": "자재비 추정치입니다. 실제 가격은 시공사 견적에 따라 다를 수 있습니다.",
        }


# 싱글톤 인스턴스
_designer_agent: Optional[DesignerAgent] = None


async def get_designer_agent() -> DesignerAgent:
    """DesignerAgent 싱글톤 반환"""
    global _designer_agent
    if _designer_agent is None:
        _designer_agent = DesignerAgent()
    return _designer_agent

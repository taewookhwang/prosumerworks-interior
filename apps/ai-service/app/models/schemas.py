"""
Pydantic 스키마 모델
AI 서비스에서 사용하는 데이터 모델 정의
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Union
from enum import Enum


# === Intent 정의 ===

class AgentIntent(str, Enum):
    """에이전트 의도 분류"""
    SCHEDULE = "schedule"      # 일정/공정 관련
    COST = "cost"              # 비용/견적 관련
    TECHNICAL = "technical"    # 기술적 질문 (자재, 시공법 등)
    CHAT = "chat"              # 일반 대화
    QUOTE_READY = "quote_ready"  # 견적서 완성 - 업체에 보낼 준비됨
    QUOTE_SEND = "quote_send"    # 견적서 업체에 전송 요청


# === 비용 관련 모델 ===

class CostBreakdown(BaseModel):
    """비용 세부 내역 (DM/DL/OH 분리)"""
    category: str = Field(..., description="비용 카테고리 (예: 철거, 목공, 타일, 도배, 전기, 설비)")
    dm: int = Field(..., description="Direct Material - 재료비 (만원)")
    dl: int = Field(..., description="Direct Labor - 노무비 (만원)")
    oh: int = Field(..., description="Overhead - 경비 (만원)")
    total: int = Field(..., description="소계 (만원)")
    note: Optional[str] = Field(None, description="비고")

    @classmethod
    def calculate(cls, category: str, dm: int, dl: int, oh: int, note: str = None):
        """자동 합계 계산"""
        return cls(
            category=category,
            dm=dm,
            dl=dl,
            oh=oh,
            total=dm + dl + oh,
            note=note
        )


class CostEstimate(BaseModel):
    """전체 비용 견적"""
    area_size: Optional[int] = Field(None, description="평수")
    work_scope: str = Field(default="전체", description="시공 범위 (전체/부분)")
    breakdown: List[CostBreakdown] = Field(default_factory=list, description="세부 내역")
    total_dm: int = Field(default=0, description="총 재료비 (만원)")
    total_dl: int = Field(default=0, description="총 노무비 (만원)")
    total_oh: int = Field(default=0, description="총 경비 (만원)")
    grand_total: int = Field(default=0, description="총 합계 (만원)")
    contingency: int = Field(default=0, description="예비비 (만원, 보통 10%)")
    final_total: int = Field(default=0, description="최종 합계 (만원)")
    assumptions: List[str] = Field(default_factory=list, description="가정 사항")

    def calculate_totals(self) -> "CostEstimate":
        """총계 자동 계산"""
        self.total_dm = sum(item.dm for item in self.breakdown)
        self.total_dl = sum(item.dl for item in self.breakdown)
        self.total_oh = sum(item.oh for item in self.breakdown)
        self.grand_total = self.total_dm + self.total_dl + self.total_oh
        self.contingency = int(self.grand_total * 0.1)
        self.final_total = self.grand_total + self.contingency
        return self


# === 일정 관련 모델 ===

class ScheduleItem(BaseModel):
    """일정 항목"""
    day: int = Field(..., description="D+N 형식의 일자")
    date: Optional[str] = Field(None, description="실제 날짜 (YYYY-MM-DD)")
    phase: str = Field(..., description="공정명 (예: 철거, 설비, 목공)")
    task: str = Field(..., description="작업 내용")
    duration_hours: Optional[int] = Field(None, description="예상 소요시간")
    workers: Optional[int] = Field(None, description="투입 인력")
    note: Optional[str] = Field(None, description="주의사항")
    is_noise_work: bool = Field(default=False, description="소음 작업 여부")


class ProjectSchedule(BaseModel):
    """전체 프로젝트 일정"""
    start_date: Optional[str] = Field(None, description="시작 예정일")
    total_days: int = Field(..., description="총 공사일")
    items: List[ScheduleItem] = Field(default_factory=list, description="일정 목록")
    milestones: List[str] = Field(default_factory=list, description="주요 마일스톤")
    friday_rule_applied: bool = Field(default=True, description="금요일 룰 적용 여부")
    warnings: List[str] = Field(default_factory=list, description="주의 사항")


# === 견적서 관련 모델 ===

class QuoteData(BaseModel):
    """업체에 전송할 견적 데이터"""
    title: str = Field(..., description="견적서 제목")
    category: str = Field(..., description="공사 종류")
    location_city: Optional[str] = Field(None, description="도시")
    location_district: Optional[str] = Field(None, description="구/군")
    area_size: Optional[int] = Field(None, description="평수")
    description: Optional[str] = Field(None, description="상세 설명")
    total_cost: int = Field(..., description="총 비용 (만원)")
    breakdown: List[CostBreakdown] = Field(default_factory=list, description="비용 세부 내역")
    target_specialties: List[str] = Field(default_factory=list, description="필요 전문 분야")
    target_areas: List[str] = Field(default_factory=list, description="서비스 가능 지역")


# === 구조물 분석 관련 모델 (AI 건축사) ===

class StructuralElementType(str, Enum):
    """구조물 요소 타입"""
    LOAD_BEARING_WALL = "load_bearing_wall"  # 내력벽
    NON_LOAD_BEARING_WALL = "non_load_bearing_wall"  # 비내력벽
    PILLAR = "pillar"  # 기둥
    BEAM = "beam"  # 보
    WINDOW = "window"  # 창문
    DOOR = "door"  # 문
    PLUMBING = "plumbing"  # 배관
    ELECTRICAL = "electrical"  # 전기 배선
    HVAC = "hvac"  # 냉난방 덕트


class StructuralElement(BaseModel):
    """도면에서 감지된 구조물 요소"""
    element_type: StructuralElementType = Field(..., description="구조물 유형")
    label: str = Field(..., description="요소 이름 (예: 거실 내력벽)")
    position: dict = Field(..., description="위치 좌표 {x, y, width, height}")
    is_demolishable: bool = Field(..., description="철거 가능 여부")
    demolition_risk: str = Field(default="none", description="철거 위험도 (none/low/medium/high)")
    demolition_note: Optional[str] = Field(None, description="철거 관련 주의사항")
    confidence: float = Field(default=0.0, description="감지 신뢰도 (0-1)")


class FloorPlanAnalysis(BaseModel):
    """도면 분석 결과"""
    floor_plan_id: Optional[str] = Field(None, description="도면 ID")
    image_dimensions: dict = Field(default_factory=dict, description="이미지 크기 {width, height}")
    estimated_area: Optional[float] = Field(None, description="추정 면적 (평)")
    room_count: int = Field(default=0, description="방 개수")
    bathroom_count: int = Field(default=0, description="화장실 개수")
    elements: List[StructuralElement] = Field(default_factory=list, description="감지된 구조물 목록")
    analysis_summary: str = Field(default="", description="분석 요약")
    warnings: List[str] = Field(default_factory=list, description="주의사항")


class DemolitionValidation(BaseModel):
    """철거 계획 검증 결과"""
    is_safe: bool = Field(..., description="철거 안전 여부")
    selected_elements: List[str] = Field(default_factory=list, description="선택된 철거 요소들")
    risk_level: str = Field(default="low", description="전체 위험도 (low/medium/high)")
    structural_impact: str = Field(default="", description="구조적 영향 설명")
    recommendations: List[str] = Field(default_factory=list, description="권장 사항")
    warnings: List[str] = Field(default_factory=list, description="경고 사항")
    estimated_demolition_cost: Optional[int] = Field(None, description="예상 철거 비용 (만원)")


class DesignFeasibility(BaseModel):
    """디자인 시공 가능성 검증"""
    is_feasible: bool = Field(..., description="시공 가능 여부")
    feasibility_score: float = Field(default=0.0, description="시공 가능성 점수 (0-100)")
    structural_conflicts: List[str] = Field(default_factory=list, description="구조적 충돌 사항")
    plumbing_conflicts: List[str] = Field(default_factory=list, description="배관 충돌 사항")
    electrical_conflicts: List[str] = Field(default_factory=list, description="전기 충돌 사항")
    modifications_needed: List[str] = Field(default_factory=list, description="필요한 수정 사항")
    estimated_additional_cost: Optional[int] = Field(None, description="추가 비용 (만원)")


# === 도면 분석 API 요청/응답 모델 ===

class FloorPlanAnalysisRequest(BaseModel):
    """도면 분석 요청"""
    floor_plan_id: Optional[str] = Field(None, description="도면 ID (DB 저장용)")
    image_url: Optional[str] = Field(None, description="도면 이미지 URL")
    image_base64: Optional[str] = Field(None, description="도면 이미지 Base64")
    property_type: Optional[str] = Field(None, description="건물 유형 (아파트/빌라/주택)")


class DemolitionValidationRequest(BaseModel):
    """철거 검증 요청"""
    floor_plan_analysis: FloorPlanAnalysis = Field(..., description="도면 분석 결과")
    selected_element_ids: List[str] = Field(..., description="철거 선택된 요소 라벨 목록")


class DesignFeasibilityRequest(BaseModel):
    """디자인 시공 가능성 검증 요청"""
    floor_plan_analysis: FloorPlanAnalysis = Field(..., description="도면 분석 결과")
    demolition_plan: DemolitionValidation = Field(..., description="철거 계획")
    design_image_url: Optional[str] = Field(None, description="디자인 이미지 URL")
    design_image_base64: Optional[str] = Field(None, description="디자인 이미지 Base64")
    design_description: Optional[str] = Field(None, description="디자인 설명")


# === 디자이너 에이전트 관련 모델 ===

class InteriorStyleType(str, Enum):
    """인테리어 스타일 종류"""
    MODERN = "modern"
    MINIMALIST = "minimalist"
    SCANDINAVIAN = "scandinavian"
    INDUSTRIAL = "industrial"
    NATURAL = "natural"
    CLASSIC = "classic"
    LUXURIOUS = "luxurious"
    KOREAN_MODERN = "korean_modern"


class RoomType(str, Enum):
    """공간 유형"""
    LIVING_ROOM = "living_room"
    BEDROOM = "bedroom"
    KITCHEN = "kitchen"
    BATHROOM = "bathroom"
    OFFICE = "office"


class StyleSuggestion(BaseModel):
    """스타일 추천 항목"""
    id: str = Field(..., description="스타일 ID")
    name: str = Field(..., description="스타일 이름 (한국어)")
    name_en: str = Field(..., description="스타일 이름 (영어)")
    description: str = Field(..., description="스타일 설명")
    keywords: List[str] = Field(default_factory=list, description="관련 키워드")


class EnhancePromptRequest(BaseModel):
    """프롬프트 강화 요청"""
    user_input: str = Field(..., description="사용자의 스타일 요청")
    style: Optional[str] = Field("modern", description="기본 스타일")
    room_type: Optional[str] = Field("living_room", description="공간 유형")


class EnhancePromptResponse(BaseModel):
    """프롬프트 강화 응답"""
    enhanced_prompt: str = Field(..., description="강화된 프롬프트")
    original_input: str = Field(..., description="원본 입력")
    style: str = Field(..., description="적용된 스타일")
    room_type: str = Field(..., description="공간 유형")


class GenerateDesignRequest(BaseModel):
    """인테리어 디자인 이미지 생성 요청"""
    base_image_url: Optional[str] = Field(None, description="베이스 이미지 URL (Clean Slate)")
    base_image_base64: Optional[str] = Field(None, description="베이스 이미지 Base64")
    style_prompt: Optional[str] = Field(None, description="스타일 프롬프트 (직접 입력)")
    style: Optional[str] = Field("modern", description="스타일 종류")
    room_type: Optional[str] = Field("living_room", description="공간 유형")
    user_request: Optional[str] = Field(None, description="사용자 요청 (자연어)")
    reference_image_urls: Optional[List[str]] = Field(None, description="레퍼런스 이미지 URL 목록")
    floor_plan_analysis: Optional[FloorPlanAnalysis] = Field(None, description="건축사 도면 분석 결과")


class GenerateDesignResponse(BaseModel):
    """인테리어 디자인 이미지 생성 응답"""
    success: bool = Field(..., description="생성 성공 여부")
    image_url: Optional[str] = Field(None, description="생성된 이미지 URL")
    prompt_used: str = Field(..., description="사용된 프롬프트")
    style: Optional[str] = Field(None, description="적용된 스타일")
    room_type: Optional[str] = Field(None, description="공간 유형")
    model: Optional[str] = Field(None, description="사용된 모델")
    error: Optional[str] = Field(None, description="에러 메시지")
    note: Optional[str] = Field(None, description="추가 메모")


# === API 요청/응답 모델 ===

class ChatRequest(BaseModel):
    """채팅 API 요청"""
    query: str = Field(..., description="사용자 질문")
    context: Optional[dict] = Field(default_factory=dict, description="컨텍스트 (평수, 위치, 공종 등)")


class AgentResponse(BaseModel):
    """에이전트 최종 응답"""
    answer: str = Field(..., description="사용자에게 보여줄 친절한 텍스트 답변")
    data: Optional[Union[CostEstimate, ProjectSchedule, QuoteData, dict]] = Field(
        None,
        description="앱이 렌더링할 구조화된 데이터"
    )
    intent: AgentIntent = Field(
        default=AgentIntent.CHAT,
        description="분류된 의도 [schedule | cost | technical | chat]"
    )
    follow_up_questions: List[str] = Field(
        default_factory=list,
        description="추천 후속 질문"
    )

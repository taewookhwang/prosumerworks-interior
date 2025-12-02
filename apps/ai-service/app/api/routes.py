"""
API 라우터
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.schemas import (
    ChatRequest,
    AgentResponse,
    FloorPlanAnalysisRequest,
    FloorPlanAnalysis,
    DemolitionValidationRequest,
    DemolitionValidation,
    DesignFeasibilityRequest,
    DesignFeasibility,
    # Designer schemas
    StyleSuggestion,
    EnhancePromptRequest,
    EnhancePromptResponse,
    GenerateDesignRequest,
    GenerateDesignResponse,
)
from app.agents import get_manager_agent, get_architect_agent, get_designer_agent

router = APIRouter()


# ============== 김 반장 (Manager Agent) ==============

@router.post("/chat", response_model=AgentResponse)
async def chat(request: ChatRequest) -> AgentResponse:
    """
    김 반장과 대화하기

    - **query**: 사용자 질문
    - **context**: 추가 컨텍스트 (평수, 위치, 공종 등)

    Returns:
        AgentResponse with answer, structured data, intent, and follow-up questions
    """
    try:
        agent = await get_manager_agent()
        response = await agent.process_request(
            query=request.query,
            context=request.context or {},
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI 처리 중 오류가 발생했습니다: {str(e)}"
        )


# ============== AI 건축사 (Architect Agent) ==============

@router.post("/architect/analyze-floor-plan", response_model=FloorPlanAnalysis)
async def analyze_floor_plan(request: FloorPlanAnalysisRequest) -> FloorPlanAnalysis:
    """
    도면 이미지 분석

    Gemini Vision API를 사용하여 도면에서 구조물을 감지합니다.

    - **floor_plan_id**: 도면 ID (DB 저장용, 선택)
    - **image_url**: 도면 이미지 URL (image_base64와 둘 중 하나 필수)
    - **image_base64**: 도면 이미지 Base64 (image_url과 둘 중 하나 필수)
    - **property_type**: 건물 유형 (아파트/빌라/주택, 선택)

    Returns:
        FloorPlanAnalysis: 도면 분석 결과 (구조물 목록, 방 개수, 면적 등)
    """
    import traceback
    try:
        # 디버그 로그
        print(f"[DEBUG] analyze-floor-plan request received")
        print(f"[DEBUG] has image_url: {bool(request.image_url)}")
        print(f"[DEBUG] has image_base64: {bool(request.image_base64)}")
        if request.image_base64:
            print(f"[DEBUG] image_base64 length: {len(request.image_base64)}")
            print(f"[DEBUG] image_base64 preview: {request.image_base64[:100]}...")

        if not request.image_url and not request.image_base64:
            raise HTTPException(
                status_code=400,
                detail="image_url 또는 image_base64 중 하나를 제공해야 합니다."
            )

        agent = await get_architect_agent()
        result = await agent.analyze_floor_plan(
            floor_plan_id=request.floor_plan_id,
            image_url=request.image_url,
            image_base64=request.image_base64,
            property_type=request.property_type,
        )
        print(f"[DEBUG] analyze-floor-plan success")
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] analyze-floor-plan failed: {type(e).__name__}: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"도면 분석 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/architect/validate-demolition", response_model=DemolitionValidation)
async def validate_demolition(request: DemolitionValidationRequest) -> DemolitionValidation:
    """
    철거 계획 검증

    선택된 구조물들의 철거가 안전한지 검증합니다.

    - **floor_plan_analysis**: 도면 분석 결과
    - **selected_element_ids**: 철거할 구조물 라벨 목록

    Returns:
        DemolitionValidation: 철거 검증 결과 (안전 여부, 위험도, 권장사항)
    """
    import traceback
    try:
        print(f"[DEBUG] validate-demolition request received")
        print(f"[DEBUG] selected_element_ids: {request.selected_element_ids}")
        print(f"[DEBUG] floor_plan_analysis elements count: {len(request.floor_plan_analysis.elements)}")

        agent = await get_architect_agent()
        result = await agent.validate_demolition_plan(
            floor_plan_analysis=request.floor_plan_analysis,
            selected_element_labels=request.selected_element_ids,
        )
        print(f"[DEBUG] validate-demolition success")
        return result
    except Exception as e:
        print(f"[ERROR] validate-demolition failed: {type(e).__name__}: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"철거 검증 중 오류가 발생했습니다: {type(e).__name__}: {str(e)}"
        )


@router.post("/architect/check-design-feasibility", response_model=DesignFeasibility)
async def check_design_feasibility(request: DesignFeasibilityRequest) -> DesignFeasibility:
    """
    디자인 시공 가능성 검증

    제안된 디자인이 구조적으로 시공 가능한지 검증합니다.

    - **floor_plan_analysis**: 도면 분석 결과
    - **demolition_plan**: 철거 계획
    - **design_image_url**: 디자인 이미지 URL (선택)
    - **design_image_base64**: 디자인 이미지 Base64 (선택)
    - **design_description**: 디자인 설명 (선택)

    Returns:
        DesignFeasibility: 시공 가능성 검증 결과
    """
    try:
        agent = await get_architect_agent()
        result = await agent.check_design_feasibility(
            floor_plan_analysis=request.floor_plan_analysis,
            demolition_plan=request.demolition_plan,
            design_image_url=request.design_image_url,
            design_image_base64=request.design_image_base64,
            design_description=request.design_description,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"디자인 검증 중 오류가 발생했습니다: {str(e)}"
        )


class CleanSlateRequest(BaseModel):
    """Clean Slate 시각화 요청"""
    floor_plan_analysis: FloorPlanAnalysis
    demolition_plan: DemolitionValidation


@router.post("/architect/clean-slate")
async def generate_clean_slate(request: CleanSlateRequest) -> dict:
    """
    Clean Slate 시각화 데이터 생성

    철거 후 상태를 시각화하기 위한 데이터를 생성합니다.

    - **floor_plan_analysis**: 도면 분석 결과
    - **demolition_plan**: 철거 계획

    Returns:
        dict: Clean Slate 시각화 데이터
    """
    try:
        agent = await get_architect_agent()
        result = await agent.generate_clean_slate_visualization(
            floor_plan_analysis=request.floor_plan_analysis,
            demolition_plan=request.demolition_plan,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Clean Slate 생성 중 오류가 발생했습니다: {str(e)}"
        )


# ============== AI 디자이너 (Designer Agent) ==============

@router.get("/designer/styles", response_model=list[StyleSuggestion])
async def get_style_suggestions():
    """
    인테리어 스타일 추천 목록

    사용 가능한 모든 인테리어 스타일 목록을 반환합니다.

    Returns:
        List[StyleSuggestion]: 스타일 추천 목록
    """
    try:
        agent = await get_designer_agent()
        styles = await agent.get_style_suggestions()
        return styles
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"스타일 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/designer/enhance-prompt", response_model=EnhancePromptResponse)
async def enhance_prompt(request: EnhancePromptRequest) -> EnhancePromptResponse:
    """
    스타일 프롬프트 강화

    사용자의 간단한 요청을 AI 이미지 생성에 최적화된 상세 프롬프트로 변환합니다.

    - **user_input**: 사용자의 스타일 요청 (예: "밝고 따뜻한 느낌")
    - **style**: 기본 스타일 (modern, minimalist, etc.)
    - **room_type**: 공간 유형 (living_room, bedroom, etc.)

    Returns:
        EnhancePromptResponse: 강화된 프롬프트
    """
    try:
        agent = await get_designer_agent()
        enhanced = await agent.enhance_prompt(
            user_input=request.user_input,
            style=request.style or "modern",
            room_type=request.room_type or "living_room",
        )
        return EnhancePromptResponse(
            enhanced_prompt=enhanced,
            original_input=request.user_input,
            style=request.style or "modern",
            room_type=request.room_type or "living_room",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"프롬프트 강화 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/designer/generate", response_model=GenerateDesignResponse)
async def generate_design(request: GenerateDesignRequest) -> GenerateDesignResponse:
    """
    인테리어 디자인 이미지 생성

    베이스 이미지(도면/Clean Slate)에 선택한 스타일을 적용한 인테리어 이미지를 생성합니다.

    - **base_image_url**: 베이스 이미지 URL (선택)
    - **base_image_base64**: 베이스 이미지 Base64 (선택)
    - **style_prompt**: 직접 입력한 스타일 프롬프트 (선택)
    - **style**: 스타일 종류 (modern, minimalist, etc.)
    - **room_type**: 공간 유형
    - **user_request**: 사용자 자연어 요청 (선택)

    Returns:
        GenerateDesignResponse: 생성된 이미지 정보
    """
    try:
        agent = await get_designer_agent()

        # 사용자 요청이 있으면 프롬프트 강화
        style_prompt = request.style_prompt
        if request.user_request and not style_prompt:
            style_prompt = await agent.enhance_prompt(
                user_input=request.user_request,
                style=request.style or "modern",
                room_type=request.room_type or "living_room",
            )

        result = await agent.generate_interior_image(
            base_image_url=request.base_image_url,
            base_image_base64=request.base_image_base64,
            style_prompt=style_prompt or "",
            style=request.style or "modern",
            room_type=request.room_type or "living_room",
            reference_image_urls=request.reference_image_urls,
            floor_plan_analysis=request.floor_plan_analysis,  # 건축사 분석 결과
            viewpoint_request=request.user_request,  # 시점 정보 전달
        )

        return GenerateDesignResponse(
            success=result.get("success", False),
            image_url=result.get("image_url"),
            prompt_used=result.get("prompt_used", ""),
            style=result.get("style"),
            room_type=result.get("room_type"),
            model=result.get("model"),
            error=result.get("error"),
            note=result.get("note"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"디자인 이미지 생성 중 오류가 발생했습니다: {str(e)}"
        )


# ============== 헬스 체크 ==============

@router.get("/health")
async def health():
    """API 헬스 체크"""
    return {
        "status": "healthy",
        "agents": ["김 반장 (Manager)", "AI 건축사 (Architect)", "AI 디자이너 (Designer)"],
    }

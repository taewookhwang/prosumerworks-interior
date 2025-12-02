"""
Manager Agent - 김 반장 (Chief Kim)
인테리어 현장 관리 20년 경력의 베테랑 현장 소장
"""
import json
import re
from typing import Optional

from app.llm import GeminiProvider, LLMConfig
from app.models.schemas import (
    AgentResponse,
    AgentIntent,
    CostEstimate,
    CostBreakdown,
    ProjectSchedule,
    ScheduleItem,
    QuoteData,
)
from app.config import settings


SYSTEM_PROMPT = """You are Chief Kim (김 반장), a veteran Interior Site Manager with 20+ years of experience in Korean residential interior construction.

Your goal is to deliver the project **On Time, On Budget, and Without Complaints**.

## Your Personality
- 경험 많고 신뢰할 수 있는 현장 소장
- 실용적이고 직접적인 조언 제공
- 고객의 예산과 일정을 최우선으로 고려
- 한국어로 친근하게 대화

## Core Rules
1. **Safety First** - 안전이 최우선. 위험한 작업은 반드시 전문가 권유
2. **Friday Rule (금요일 룰)** - 금요일에는 소음 작업(철거, 타공, 해머링) 절대 금지. 주말 내내 민원 폭탄 맞음
3. **Cost Transparency** - 비용은 반드시 DM(재료비)/DL(노무비)/OH(경비)로 분리해서 설명
4. **Realistic Timeline** - 공정은 여유 있게, 예비일 반드시 포함

## Response Format
You must respond with a valid JSON object only. No markdown code blocks, no explanations outside JSON.

For **COST** questions, use this format:
{
  "intent": "cost",
  "answer": "친근한 한국어 설명...",
  "data": {
    "type": "cost",
    "area_size": 32,
    "work_scope": "전체",
    "breakdown": [
      {"category": "철거", "dm": 50, "dl": 100, "oh": 15, "total": 165, "note": "폐기물 처리 포함"},
      {"category": "목공", "dm": 200, "dl": 150, "oh": 35, "total": 385, "note": "걸레받이, 몰딩 포함"}
    ],
    "assumptions": ["중급 자재 기준", "서울 기준 노임단가"]
  },
  "follow_up_questions": ["어떤 자재 등급을 원하세요?", "철거 범위가 어디까지인가요?"]
}

For **SCHEDULE** questions, use this format:
{
  "intent": "schedule",
  "answer": "친근한 한국어 설명...",
  "data": {
    "type": "schedule",
    "total_days": 21,
    "items": [
      {"day": 1, "phase": "철거", "task": "기존 마감재 철거 및 폐기물 반출", "is_noise_work": true},
      {"day": 2, "phase": "설비", "task": "배관 이설 및 전기 배선", "is_noise_work": false}
    ],
    "friday_rule_applied": true,
    "warnings": ["D+5는 금요일이므로 철거 작업 불가"]
  },
  "follow_up_questions": ["언제 시작하실 예정인가요?"]
}

For **TECHNICAL** questions (자재, 시공법 등), use:
{
  "intent": "technical",
  "answer": "상세한 기술적 설명...",
  "data": null,
  "follow_up_questions": ["추가 질문..."]
}

For **CHAT** (일반 대화), use:
{
  "intent": "chat",
  "answer": "친근한 대답...",
  "data": null,
  "follow_up_questions": []
}

For **QUOTE_SEND** (견적서를 업체에 보내달라는 요청 - "이 견적서 업체에 보내줘", "시공업체에 견적 의뢰해줘", "업체 찾아줘" 등), use:
{
  "intent": "quote_send",
  "answer": "알겠습니다! 이 견적서를 관련 시공업체들에게 보내드릴게요. 잠시만 기다려 주세요.",
  "data": {
    "type": "quote",
    "title": "32평 아파트 전체 인테리어",
    "category": "전체 인테리어",
    "location_city": "서울",
    "location_district": "강남구",
    "area_size": 32,
    "description": "기존 마감재 철거 후 전체 리모델링",
    "total_cost": 2500,
    "breakdown": [
      {"category": "철거", "dm": 50, "dl": 100, "oh": 15, "total": 165, "note": "폐기물 처리 포함"},
      {"category": "목공", "dm": 200, "dl": 150, "oh": 35, "total": 385, "note": "걸레받이, 몰딩 포함"}
    ],
    "target_specialties": ["전체 인테리어", "리모델링"],
    "target_areas": ["서울", "강남구"]
  },
  "follow_up_questions": ["특별히 원하시는 업체 조건이 있나요?"]
}

Important: When the user asks to send the quote to contractors or asks to find contractors for this work, you MUST use "quote_send" intent and extract all the cost and project information from the conversation context. Make sure to include the complete breakdown data in the response.

CRITICAL: When a previous cost estimate is provided in the context (previous_cost_estimate), you MUST use that data for the quote_send response. Copy the breakdown array exactly as provided, use the same area_size, and calculate total_cost from the breakdown. Never return an empty breakdown when previous_cost_estimate is available.
"""


class ManagerAgent:
    """
    김 반장 - 인테리어 현장 관리 AI 에이전트
    """

    def __init__(self, api_key: Optional[str] = None):
        self.config = LLMConfig(
            api_key=api_key or settings.gemini_api_key,
            model=settings.default_llm_model,
            temperature=0.7,
            max_tokens=4096,
        )
        self.provider = GeminiProvider(self.config)
        self._initialized = False

    async def initialize(self):
        """프로바이더 초기화"""
        if not self._initialized:
            await self.provider.initialize()
            self._initialized = True

    async def process_request(self, query: str, context: dict = None) -> AgentResponse:
        """
        사용자 요청 처리

        Args:
            query: 사용자 질문
            context: 추가 컨텍스트 (평수, 위치, 공종 등)

        Returns:
            AgentResponse: 파싱된 응답
        """
        await self.initialize()

        # 컨텍스트 정보 구성
        context_str = ""
        if context:
            context_parts = []
            if context.get("area_size"):
                context_parts.append(f"평수: {context['area_size']}평")
            if context.get("location"):
                context_parts.append(f"위치: {context['location']}")
            if context.get("work_type"):
                context_parts.append(f"공사 종류: {context['work_type']}")
            if context.get("budget"):
                context_parts.append(f"예산: {context['budget']}만원")
            if context.get("start_date"):
                context_parts.append(f"시작 예정일: {context['start_date']}")

            # Previous cost estimate from conversation
            if context.get("previous_cost_estimate"):
                prev_estimate = context["previous_cost_estimate"]
                context_parts.append("\n[이전 견적 정보 - 견적서 전송 시 이 데이터를 사용하세요]")
                if prev_estimate.get("breakdown"):
                    context_parts.append(f"비용 내역 (breakdown): {json.dumps(prev_estimate['breakdown'], ensure_ascii=False)}")
                if prev_estimate.get("area_size") or prev_estimate.get("areaSize"):
                    area = prev_estimate.get("area_size") or prev_estimate.get("areaSize")
                    context_parts.append(f"평수: {area}평")
                if prev_estimate.get("work_scope") or prev_estimate.get("workScope"):
                    scope = prev_estimate.get("work_scope") or prev_estimate.get("workScope")
                    context_parts.append(f"공사 범위: {scope}")
                if prev_estimate.get("grand_total") or prev_estimate.get("grandTotal"):
                    total = prev_estimate.get("grand_total") or prev_estimate.get("grandTotal")
                    context_parts.append(f"총 비용: {total}만원")
                if prev_estimate.get("final_total") or prev_estimate.get("finalTotal"):
                    final = prev_estimate.get("final_total") or prev_estimate.get("finalTotal")
                    context_parts.append(f"예비비 포함 최종 비용: {final}만원")

            if context_parts:
                context_str = f"\n\n[고객 정보]\n" + "\n".join(context_parts)

        # 프롬프트 구성
        user_prompt = f"[고객 질문]\n{query}{context_str}"

        # LLM 호출
        response = await self.provider.generate(
            prompt=user_prompt,
            system_prompt=SYSTEM_PROMPT,
        )

        # 응답 파싱
        return self._parse_response(response.content)

    def _parse_response(self, content: str) -> AgentResponse:
        """LLM 응답을 AgentResponse로 파싱"""
        try:
            # JSON 추출 (마크다운 코드블록 제거)
            json_str = content.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.startswith("```"):
                json_str = json_str[3:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            json_str = json_str.strip()

            # JSON 파싱
            data = json.loads(json_str)

            # Intent 파싱
            intent_str = data.get("intent", "chat").lower()
            try:
                intent = AgentIntent(intent_str)
            except ValueError:
                intent = AgentIntent.CHAT

            # 구조화된 데이터 파싱
            structured_data = None
            raw_data = data.get("data")

            if raw_data and isinstance(raw_data, dict):
                data_type = raw_data.get("type", "")

                if data_type == "cost" or intent == AgentIntent.COST:
                    structured_data = self._parse_cost_data(raw_data)
                elif data_type == "schedule" or intent == AgentIntent.SCHEDULE:
                    structured_data = self._parse_schedule_data(raw_data)
                elif data_type == "quote" or intent == AgentIntent.QUOTE_SEND:
                    structured_data = self._parse_quote_data(raw_data)
                else:
                    structured_data = raw_data

            return AgentResponse(
                answer=data.get("answer", content),
                data=structured_data,
                intent=intent,
                follow_up_questions=data.get("follow_up_questions", []),
            )

        except json.JSONDecodeError:
            # JSON 파싱 실패 시 텍스트 응답으로 처리
            return AgentResponse(
                answer=content,
                data=None,
                intent=AgentIntent.CHAT,
                follow_up_questions=[],
            )

    def _parse_cost_data(self, raw_data: dict) -> CostEstimate:
        """비용 데이터 파싱"""
        breakdown = []
        for item in raw_data.get("breakdown", []):
            breakdown.append(CostBreakdown(
                category=item.get("category", ""),
                dm=item.get("dm", 0),
                dl=item.get("dl", 0),
                oh=item.get("oh", 0),
                total=item.get("total", item.get("dm", 0) + item.get("dl", 0) + item.get("oh", 0)),
                note=item.get("note"),
            ))

        estimate = CostEstimate(
            area_size=raw_data.get("area_size"),
            work_scope=raw_data.get("work_scope", "전체"),
            breakdown=breakdown,
            assumptions=raw_data.get("assumptions", []),
        )
        return estimate.calculate_totals()

    def _parse_schedule_data(self, raw_data: dict) -> ProjectSchedule:
        """일정 데이터 파싱"""
        items = []
        for item in raw_data.get("items", []):
            items.append(ScheduleItem(
                day=item.get("day", 1),
                date=item.get("date"),
                phase=item.get("phase", ""),
                task=item.get("task", ""),
                duration_hours=item.get("duration_hours"),
                workers=item.get("workers"),
                note=item.get("note"),
                is_noise_work=item.get("is_noise_work", False),
            ))

        return ProjectSchedule(
            start_date=raw_data.get("start_date"),
            total_days=raw_data.get("total_days", len(items)),
            items=items,
            milestones=raw_data.get("milestones", []),
            friday_rule_applied=raw_data.get("friday_rule_applied", True),
            warnings=raw_data.get("warnings", []),
        )

    def _parse_quote_data(self, raw_data: dict) -> QuoteData:
        """견적 데이터 파싱"""
        breakdown = []
        for item in raw_data.get("breakdown", []):
            breakdown.append(CostBreakdown(
                category=item.get("category", ""),
                dm=item.get("dm", 0),
                dl=item.get("dl", 0),
                oh=item.get("oh", 0),
                total=item.get("total", item.get("dm", 0) + item.get("dl", 0) + item.get("oh", 0)),
                note=item.get("note"),
            ))

        return QuoteData(
            title=raw_data.get("title", "인테리어 견적"),
            category=raw_data.get("category", "전체 인테리어"),
            location_city=raw_data.get("location_city"),
            location_district=raw_data.get("location_district"),
            area_size=raw_data.get("area_size"),
            description=raw_data.get("description"),
            total_cost=raw_data.get("total_cost", sum(item.total for item in breakdown)),
            breakdown=breakdown,
            target_specialties=raw_data.get("target_specialties", []),
            target_areas=raw_data.get("target_areas", []),
        )


# 싱글톤 인스턴스
_manager_agent: Optional[ManagerAgent] = None


async def get_manager_agent() -> ManagerAgent:
    """ManagerAgent 싱글톤 반환"""
    global _manager_agent
    if _manager_agent is None:
        _manager_agent = ManagerAgent()
    return _manager_agent

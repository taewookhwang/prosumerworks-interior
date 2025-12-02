"""
LLM Provider 추상 베이스 클래스
Multi-provider 지원을 위한 공통 인터페이스 정의
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional, AsyncIterator
from enum import Enum


class LLMProviderType(str, Enum):
    """지원하는 LLM 프로바이더 타입"""
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


@dataclass
class LLMConfig:
    """LLM 설정"""
    api_key: str
    model: str
    temperature: float = 0.7
    max_tokens: int = 4096
    timeout: int = 30


@dataclass
class LLMResponse:
    """LLM 응답 데이터"""
    content: str
    model: str
    provider: LLMProviderType
    usage: Optional[dict] = None
    raw_response: Optional[Any] = None


class LLMProvider(ABC):
    """
    LLM Provider 추상 베이스 클래스

    모든 LLM 프로바이더는 이 클래스를 상속받아 구현해야 함
    """

    def __init__(self, config: LLMConfig):
        self.config = config
        self._client: Any = None

    @property
    @abstractmethod
    def provider_type(self) -> LLMProviderType:
        """프로바이더 타입 반환"""
        pass

    @abstractmethod
    async def initialize(self) -> None:
        """클라이언트 초기화"""
        pass

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> LLMResponse:
        """
        텍스트 생성

        Args:
            prompt: 사용자 프롬프트
            system_prompt: 시스템 프롬프트 (선택)
            **kwargs: 추가 파라미터

        Returns:
            LLMResponse: 생성된 응답
        """
        pass

    @abstractmethod
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AsyncIterator[str]:
        """
        스트리밍 텍스트 생성

        Args:
            prompt: 사용자 프롬프트
            system_prompt: 시스템 프롬프트 (선택)
            **kwargs: 추가 파라미터

        Yields:
            str: 생성된 텍스트 청크
        """
        pass

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> dict:
        """
        JSON 형식 응답 생성

        Args:
            prompt: 사용자 프롬프트
            system_prompt: 시스템 프롬프트 (선택)
            **kwargs: 추가 파라미터

        Returns:
            dict: 파싱된 JSON 응답
        """
        import json

        json_system = (system_prompt or "") + "\n\nYou must respond with valid JSON only. No markdown, no explanation."
        response = await self.generate(prompt, json_system, **kwargs)

        # JSON 파싱 시도
        content = response.content.strip()
        # 마크다운 코드블록 제거
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        return json.loads(content.strip())

    async def close(self) -> None:
        """리소스 정리"""
        self._client = None

"""
Google Gemini LLM Provider
Google GenAI SDK를 사용한 Gemini 모델 구현
"""
from typing import Optional, AsyncIterator
import google.generativeai as genai

from .base import LLMProvider, LLMConfig, LLMResponse, LLMProviderType


class GeminiProvider(LLMProvider):
    """
    Google Gemini Provider

    Usage:
        config = LLMConfig(
            api_key="your-api-key",
            model="gemini-1.5-flash",
            temperature=0.7
        )
        provider = GeminiProvider(config)
        await provider.initialize()
        response = await provider.generate("Hello!")
    """

    @property
    def provider_type(self) -> LLMProviderType:
        return LLMProviderType.GEMINI

    async def initialize(self) -> None:
        """Gemini 클라이언트 초기화"""
        genai.configure(api_key=self.config.api_key)

        generation_config = genai.GenerationConfig(
            temperature=self.config.temperature,
            max_output_tokens=self.config.max_tokens,
        )

        self._client = genai.GenerativeModel(
            model_name=self.config.model,
            generation_config=generation_config,
        )

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
        if not self._client:
            await self.initialize()

        # 시스템 프롬프트가 있으면 결합
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        # Gemini API 호출
        response = await self._client.generate_content_async(
            full_prompt,
            **kwargs
        )

        # 응답 파싱
        content = response.text if response.text else ""

        # 사용량 정보 추출
        usage = None
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            usage = {
                "prompt_tokens": getattr(response.usage_metadata, 'prompt_token_count', 0),
                "completion_tokens": getattr(response.usage_metadata, 'candidates_token_count', 0),
                "total_tokens": getattr(response.usage_metadata, 'total_token_count', 0),
            }

        return LLMResponse(
            content=content,
            model=self.config.model,
            provider=self.provider_type,
            usage=usage,
            raw_response=response,
        )

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
        if not self._client:
            await self.initialize()

        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        response = await self._client.generate_content_async(
            full_prompt,
            stream=True,
            **kwargs
        )

        async for chunk in response:
            if chunk.text:
                yield chunk.text

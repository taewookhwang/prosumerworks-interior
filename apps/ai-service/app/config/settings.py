"""
설정 관리
환경변수 기반 설정
"""
from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # App
    app_name: str = "AI Site Manager"
    app_version: str = "0.1.0"
    debug: bool = False

    # API Keys
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    replicate_api_key: Optional[str] = None

    # LLM Settings
    default_llm_provider: str = "gemini"
    default_llm_model: str = "gemini-1.5-flash"
    llm_temperature: float = 0.7
    llm_max_tokens: int = 4096

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """설정 싱글톤"""
    return Settings()


settings = get_settings()

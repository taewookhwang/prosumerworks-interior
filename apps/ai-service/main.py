"""
AI Site Manager - FastAPI Entry Point
인테리어 AI 어시스턴트 메인 서버

김 반장 (Chief Kim) - 20년 경력의 베테랑 현장 소장
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.api import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 라이프사이클 관리"""
    # Startup
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    print(f"👷 김 반장(Chief Kim) 현장 투입 준비 완료!")
    print(f"📡 LLM Provider: {settings.default_llm_provider} ({settings.default_llm_model})")
    yield
    # Shutdown
    print("👋 김 반장 퇴근합니다. 수고하셨습니다!")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
## 인테리어 시공 AI 어시스턴트 API

**김 반장 (Chief Kim)** - 20년 경력의 베테랑 현장 소장이 도와드립니다.

### 주요 기능
- 💰 **비용 견적**: DM(재료비)/DL(노무비)/OH(경비) 분리 견적
- 📅 **일정 계획**: 금요일 룰 적용, 공정별 일정 수립
- 🔧 **기술 상담**: 자재 선택, 시공법 조언
- 💬 **일반 상담**: 인테리어 관련 모든 질문

### 핵심 규칙
1. **Safety First** - 안전이 최우선
2. **Friday Rule** - 금요일 소음 작업 금지
3. **Cost Transparency** - 비용 투명성
    """,
    lifespan=lifespan,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production에서는 specific origins로 변경
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router, prefix="/api", tags=["AI Chat"])


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Hello AI Site Manager",
        "agent": "김 반장 (Chief Kim)",
        "version": settings.app_version,
        "status": "running",
        "endpoints": {
            "chat": "POST /api/chat",
            "health": "GET /api/health",
            "docs": "GET /docs",
        }
    }


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "llm_configured": bool(settings.gemini_api_key),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )

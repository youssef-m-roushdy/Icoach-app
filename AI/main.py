"""
ICoach AI - Main Application
Sprint 2: Clean Architecture & RAG Preparation (Auth Verified)
"""
import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends  # ضفنا Depends هنا
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# --- Local Imports ---
from config import get_settings
from routers import food_router, chat_router
from services import get_model
# استيراد الـ Dependency الجديد من الملف اللي لسه معدلينه
from middlewares.auth_middleware import get_current_user 

# --- Settings ---
settings = get_settings()

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)
logging.getLogger("watchfiles").setLevel(logging.WARNING)

# ============================================
# LIFESPAN MANAGER
# ============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Logic ---
    print("\n" + "="*70)
    print("🍔 ICoach AI: Food Recognition & RAG Chat")
    print("="*70)
    
    try:
        logger.info("Initializing ML Model...")
        model = get_model(
            settings.MODEL_PATH,
            settings.CLASS_NAMES_PATH,
            settings.IMG_SIZE
        )
        if model.is_loaded():
            logger.info("✅ ML model loaded successfully")
        else:
            logger.error("❌ ML model failed to load")
    except Exception as e:
        logger.error(f"❌ Critical Error during model loading: {e}")

    if settings.GROQ_API_KEY and "your-groq" not in settings.GROQ_API_KEY:
        logger.info("✅ Groq API key configured")
    else:
        logger.warning("⚠️ Groq API key is missing or invalid")

    logger.info("🚀 API is ready to serve requests")
    
    yield  # السيرفر شغال هنا
    
    logger.info("Stopping API and cleaning up resources...")

# ============================================
# APP INITIALIZATION
# ============================================
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    # السطر السحري: تفعيل الـ Auth على كل الـ Routes بشكل تلقائي
    dependencies=[Depends(get_current_user)] 
)

# 1. CORS Middleware (Essential)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# GLOBAL EXCEPTION HANDLER
# ============================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"❌ Unexpected error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "Check server logs"
        }
    )

# ============================================
# ROUTES & HEALTH CHECK
# ============================================
# ملحوظة: الـ Global Dependency هتحمي حتى الـ Health Check. 
# لو عايز تفتح الـ Health check للجمهور، ممكن ننقله لراوتر منفصل بدون حماية.

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "version": settings.API_VERSION}

@app.get("/", tags=["System"])
async def root():
    return {"message": "Welcome to ICoach AI API"}

# Include Routers
app.include_router(food_router)
app.include_router(chat_router)

# ============================================
# EXECUTION
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=settings.DEBUG, 
        log_level="info"
    )
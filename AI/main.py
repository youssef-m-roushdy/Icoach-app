"""
ICoach AI - Main Application
Sprint 2: Clean Architecture & RAG Preparation (Auth Verified)
"""
import logging
import sys
import os
from datetime import datetime  # ✅ ADD THIS IMPORT
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text  # ✅ ADD THIS IMPORT

# --- Local Imports ---
from config import get_settings
from routers import food_router, chat_router
from services import get_model
# Import the Auth Dependency 
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
    
    # Get host and port from environment or defaults
    host = os.getenv("HOST", "0.0.0.0")
    port = os.getenv("PORT", "8000")
    base_url = f"http://{host}:{port}"
    
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

    # Check Redis connection
    try:
        from services.token_service import TokenService
        token_svc = TokenService()
        redis_client = await token_svc.get_redis()
        await redis_client.ping()
        logger.info("✅ Redis connected successfully")
    except Exception as e:
        logger.warning(f"⚠️ Redis connection failed: {e}")

    # Check Database connection - FIXED
    try:
        from config.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        logger.info("✅ Database connected successfully")
    except Exception as e:
        logger.warning(f"⚠️ Database connection failed: {e}")

    logger.info("🚀 API is ready to serve requests")
    
    # ✅ Log Swagger Documentation URLs
    print("\n" + "="*70)
    print("📚 API DOCUMENTATION")
    print("="*70)
    print(f"🔥 Swagger UI: {base_url}/docs")
    print(f"📖 ReDoc: {base_url}/redoc")
    print(f"🏠 Home: {base_url}")
    print(f"❤️ Health: {base_url}/health")
    print("="*70 + "\n")
    
    yield  # Server is running here
    
    # --- Shutdown Logic ---
    logger.info("🛑 Shutting down API...")
    
    # Close Redis connection
    try:
        from services.token_service import TokenService
        token_svc = TokenService()
        redis_client = await token_svc.get_redis()
        await redis_client.close()
        logger.info("✅ Redis connection closed")
    except Exception as e:
        logger.error(f"❌ Error closing Redis connection: {e}")
    
    # Close Database connection
    try:
        from config.database import engine
        await engine.dispose()
        logger.info("✅ Database connection closed")
    except Exception as e:
        logger.error(f"❌ Error closing database connection: {e}")
    
    logger.info("✨ Cleanup complete. Goodbye!")

# ============================================
# APP INITIALIZATION
# ============================================
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
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

# ✅ Health Check and Root endpoints are open without Auth
@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "version": settings.API_VERSION,
        "timestamp": datetime.utcnow().isoformat()  # ✅ datetime is now imported
    }

@app.get("/", tags=["System"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to ICoach AI Platform",
        "version": settings.API_VERSION,
        "docs": "/docs",
        "health": "/health"
    }

# ✅ Added Auth protection only on specific routers
app.include_router(food_router, dependencies=[Depends(get_current_user)])
app.include_router(chat_router, dependencies=[Depends(get_current_user)])

# ============================================
# EXECUTION
# ============================================
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=settings.DEBUG, 
        log_level="info"
    )
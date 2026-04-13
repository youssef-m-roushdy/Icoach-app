"""
Food Recognition API with RAG Chat - Main Application
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Reduce watchfiles logging noise
logging.getLogger("watchfiles").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

# Import from local modules (NO 'AI.' prefix - we're already in the AI directory)
from config import get_settings
from routers import food_router, chat_router
from services import get_model

# Import RAG middlewares
from middlewares.auth_middleware import AuthMiddleware
from middlewares.token_budget_middleware import TokenBudgetMiddleware
from middlewares.intent_classifier_middleware import IntentClassifierMiddleware
from middlewares.scope_guard_middleware import ScopeGuardMiddleware
from middlewares.rag_retriever_middleware import RAGRetrieverMiddleware
from middlewares.response_formatter_middleware import ResponseFormatterMiddleware

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS (MUST be first)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# RAG MIDDLEWARE PIPELINE
# Order matters: Last added executes FIRST
# ============================================

# 7. Response Formatter (LAST - formats and sends response)
app.add_middleware(ResponseFormatterMiddleware)

# 6. RAG Retriever (retrieves from vector database)
app.add_middleware(RAGRetrieverMiddleware)

# 4. Scope Guard (handles out-of-scope and web search)
app.add_middleware(ScopeGuardMiddleware)

# 3. Intent Classifier (classifies user intent)
app.add_middleware(IntentClassifierMiddleware)

# 2. Token Budget (checks and tracks token usage)
app.add_middleware(TokenBudgetMiddleware)

# 1. Auth (authenticates user) - FIRST to execute
app.add_middleware(AuthMiddleware)

# ============================================
# GLOBAL EXCEPTION HANDLER
# ============================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )

# ============================================
# STARTUP EVENT
# ============================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("\n" + "="*70)
    print("🍔 Food Recognition API with RAG Chat")
    print("="*70)
    print(f"📍 Server: http://{settings.HOST}:{settings.PORT}")
    print(f"📚 API Docs: http://localhost:{settings.PORT}/docs")
    print(f"📖 ReDoc: http://localhost:{settings.PORT}/redoc")
    print(f"💬 Chat Endpoint: http://localhost:{settings.PORT}/api/chat")
    print("="*70 + "\n")
    
    logger.info("Starting Food Recognition API with RAG Chat...")
    logger.info(f"API Version: {settings.API_VERSION}")
    logger.info(f"Debug Mode: {settings.DEBUG}")
    
    # Load ML model for food recognition
    try:
        logger.info("Loading ML model...")
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
        logger.error(f"❌ Error loading ML model: {e}")
    
    # Check RAG configuration (Groq instead of OpenAI)
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your-groq-api-key-here":
        logger.info("✅ Groq API key configured")
    else:
        logger.warning("⚠️ Groq API key not configured - RAG chat will be limited")
    
    if settings.QDRANT_URL:
        logger.info(f"✅ Qdrant vector database configured: {settings.QDRANT_URL}")
    else:
        logger.warning("⚠️ Qdrant not configured - RAG retrieval will not work")
    
    if settings.REDIS_URL:
        logger.info(f"✅ Redis configured: {settings.REDIS_URL}")
    else:
        logger.warning("⚠️ Redis not configured - rate limiting disabled")
    
    # Check JWT auth
    if settings.public_key:
        logger.info("✅ JWT public key loaded - Auth enabled")
    else:
        logger.warning("⚠️ JWT public key not found - Auth will fail")
    
    logger.info("API started successfully")

# ============================================
# SHUTDOWN EVENT
# ============================================

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down API...")

# ============================================
# HEALTH CHECK ENDPOINTS
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Food Recognition API with RAG Chat",
        "version": settings.API_VERSION,
        "features": {
            "food_recognition": True,
            "rag_chat": bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your-groq-api-key-here"),
            "auth": bool(settings.public_key)
        }
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to ICoach AI API",
        "version": settings.API_VERSION,
        "features": [
            "🍔 Food recognition from images",
            "💬 AI chat assistant with RAG (fitness, nutrition, injuries)",
            "💰 Token-based usage tracking",
            "🔐 JWT authentication (RS256)"
        ],
        "endpoints": {
            "docs": f"http://{settings.HOST}:{settings.PORT}/docs",
            "chat": f"http://{settings.HOST}:{settings.PORT}/api/chat",
            "food_recognition": f"http://{settings.HOST}:{settings.PORT}/api/food",
            "health": f"http://{settings.HOST}:{settings.PORT}/health"
        }
    }

# ============================================
# INCLUDE ROUTERS
# ============================================

# Food recognition router (existing)
app.include_router(food_router)

# Chat RAG router (new)
app.include_router(chat_router)

# ============================================
# CUSTOM OPENAPI SCHEMA (for JWT auth in Swagger)
# ============================================

from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=settings.API_TITLE,
        version=settings.API_VERSION,
        description=settings.API_DESCRIPTION,
        routes=app.routes,
    )
    openapi_schema["components"] = openapi_schema.get("components", {})
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter the JWT token obtained from Node.js server",
        }
    }
    openapi_schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# ============================================
# RUN APPLICATION
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*70)
    print("🍔 Food Recognition API with RAG Chat")
    print("="*70)
    print(f"📍 Server: http://{settings.HOST}:{settings.PORT}")
    print(f"📚 API Docs: http://localhost:{settings.PORT}/docs")
    print(f"💬 Chat: http://localhost:{settings.PORT}/api/chat")
    print("="*70 + "\n")
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
"""
Configuration settings for the Food Recognition API with RAG Chat
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
from typing import Optional, List


class Settings(BaseSettings):
    """Application settings - all values come from environment variables"""
    
    # API Configuration
    API_TITLE: str = "Food Recognition API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "AI-powered food recognition API with RAG chat assistant"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # Database Configuration
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "icoach_db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    
    # Model Configuration
    IMG_SIZE: int = 224
    NUM_CLASSES: int = 100
    MODEL_PATH: str = "./Modules/best_model_food100.keras"
    CLASS_NAMES_PATH: str = "./Modules/class_names.json"
    
    # Upload Configuration
    MAX_UPLOAD_SIZE: int = 10485760
    
    # CORS Configuration
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # JWT Authentication (RS256 from Node.js)
    JWT_PUBLIC_KEY_PATH: str = "./keys/public.pem"
    JWT_PUBLIC_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "RS256"
    JWT_ISSUER: str = "icoach-app"
    JWT_AUDIENCE: str = "icoach-users"
    
    # Node.js API Integration
    NODEJS_API_URL: str = "http://localhost:5000"
    
    # Vector Database (Qdrant)
    QDRANT_URL: str = "http://localhost:6333"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Web Search
    SERPER_API_KEY: str = ""
    
    # RAG Settings
    RAG_SIMILARITY_THRESHOLD: float = 0.72
    RAG_MAX_TOKENS: int = 600
    RAG_TEMPERATURE: float = 0.3
    RAG_TOP_K_RESULTS: int = 3
    
    # Token Limits
    TOKEN_LIMIT_FREE: int = 10000
    TOKEN_LIMIT_PRO: int = 100000
    TOKEN_LIMIT_PREMIUM: int = 500000
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60
    
    # Groq API Configuration 
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    USE_GROQ: bool = True 
       
    # Logging
    LOG_LEVEL: str = "INFO"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS
    
    @property
    def database_url(self) -> str:
        """Generate PostgreSQL database URL"""
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def token_limits(self) -> dict:
        """Get token limits as dictionary"""
        return {
            "free": self.TOKEN_LIMIT_FREE,
            "pro": self.TOKEN_LIMIT_PRO,
            "premium": self.TOKEN_LIMIT_PREMIUM,
        }
    
    @property
    def qdrant_collections(self) -> List[str]:
        """Get Qdrant collections list"""
        return ["foods", "workouts", "injuries", "diet_plans"]
    
    @property
    def allowed_extensions(self) -> set:
        """Get allowed file extensions"""
        return {".jpg", ".jpeg", ".png", ".webp"}
    
    @property
    def public_key(self) -> Optional[str]:
        """Get RSA public key for JWT verification"""
        if self.JWT_PUBLIC_KEY:
            return self.JWT_PUBLIC_KEY
        
        key_path = Path(self.JWT_PUBLIC_KEY_PATH)
        if key_path.exists():
            try:
                with open(key_path, 'r') as f:
                    return f.read()
            except Exception:
                return None
        return None
    
    @property
    def is_web_search_configured(self) -> bool:
        """Check if web search is available"""
        return bool(self.SERPER_API_KEY)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
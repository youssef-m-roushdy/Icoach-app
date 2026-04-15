"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─── Food & Prediction Schemas ──────────────────────────────────────────
class FoodResponse(BaseModel):
    """Response model for food data"""
    id: int
    name: str
    calories: float
    protein: float
    carbohydrate: float
    fat: float
    sugar: float
    pic: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PredictionResponse(BaseModel):
    """Response model for food prediction"""
    success: bool
    predicted_food: str
    confidence: float
    food_data: Optional[FoodResponse] = None
    message: Optional[str] = None
    suggestions: Optional[list[str]] = None


# ─── Chat & Tool-Calling Schemas ─────────────────────────────────────────
class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None  # 👈 تم التعديل من conversation_id لـ session_id
    
    class Config:
        json_schema_extra = {
            "example": {"message": "What's a good beginner workout?", "session_id": "uuid-v4-string"}
        }

class ChatResponse(BaseModel):
    """Standard Response model for fallback/non-streaming chat endpoint"""
    reply: str
    tokens_used: int
    sources: List[str] = []
    type: str  
    memory_used: bool = False  
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class TokenUsageResponse(BaseModel):
    """Token usage response"""
    user_id: int
    tier: str
    tokens_used_today: int
    daily_limit: int
    remaining: int
    reset_time: str = "midnight UTC"

class UserContext(BaseModel):
    """User context for AI personalization"""
    user_id: int
    profile: Dict[str, Any]
    injuries: List[Dict[str, Any]]
    saved_workouts: List[Dict[str, Any]]
    active_plans: List[Dict[str, Any]]


# ─── System Schemas ──────────────────────────────────────────────────────
class ErrorResponse(BaseModel):
    """Response model for errors"""
    success: bool = False
    error: str
    detail: Optional[str] = None
    
class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    version: str
    model_loaded: bool
    database_connected: bool
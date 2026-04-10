"""
RAG Models - for chat and vector database operations
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {"message": "What's a good beginner workout?"}
        }


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    reply: str
    tokens_used: int
    sources: List[str] = []
    type: str  # answer, clarification, out_of_scope, error
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
    """User context for RAG personalization"""
    user_id: int
    profile: Dict[str, Any]
    injuries: List[Dict[str, Any]]
    saved_workouts: List[Dict[str, Any]]
    active_plans: List[Dict[str, Any]]
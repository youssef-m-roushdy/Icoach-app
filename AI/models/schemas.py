"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


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

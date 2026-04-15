"""
Database service for food data operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from AI.models.database import Food
import logging

logger = logging.getLogger(__name__)


class FoodDatabaseService:
    """Service for interacting with food database"""
    
    @staticmethod
    def get_food_by_name(db: Session, food_name: str) -> Optional[Food]:
        """
        Get food by exact name match (case-insensitive)
        
        Args:
            db: Database session
            food_name: Name of the food to search for
            
        Returns:
            Food object or None if not found
        """
        try:
            # Normalize the food name (lowercase, trim)
            normalized_name = food_name.strip().lower()
            
            return db.query(Food).filter(
                func.lower(Food.name) == normalized_name
            ).first()
        except Exception as e:
            logger.error(f"Error fetching food by name '{food_name}': {e}")
            return None
    
    @staticmethod
    def search_foods_by_name(db: Session, search_term: str, limit: int = 5) -> List[Food]:
        """
        Search foods by partial name match
        
        Args:
            db: Database session
            search_term: Search term
            limit: Maximum number of results
            
        Returns:
            List of matching Food objects
        """
        try:
            normalized_term = search_term.strip().lower()
            
            return db.query(Food).filter(
                func.lower(Food.name).like(f"%{normalized_term}%")
            ).limit(limit).all()
        except Exception as e:
            logger.error(f"Error searching foods with term '{search_term}': {e}")
            return []
    
    @staticmethod
    def get_all_food_names(db: Session) -> List[str]:
        """
        Get all food names from database
        
        Args:
            db: Database session
            
        Returns:
            List of all food names
        """
        try:
            foods = db.query(Food.name).all()
            return [food.name for food in foods]
        except Exception as e:
            logger.error(f"Error fetching all food names: {e}")
            return []
    
    @staticmethod
    def find_similar_foods(db: Session, food_name: str, limit: int = 3) -> List[str]:
        """
        Find similar food names (for suggestions when food not found)
        
        Args:
            db: Database session
            food_name: Food name to find similar matches for
            limit: Maximum number of suggestions
            
        Returns:
            List of similar food names
        """
        try:
            # Extract key words from the food name
            words = food_name.lower().replace('_', ' ').split()
            
            suggestions = set()
            for word in words:
                if len(word) > 2:  # Skip very short words
                    similar = db.query(Food.name).filter(
                        func.lower(Food.name).like(f"%{word}%")
                    ).limit(limit).all()
                    suggestions.update([food.name for food in similar])
            
            return list(suggestions)[:limit]
        except Exception as e:
            logger.error(f"Error finding similar foods for '{food_name}': {e}")
            return []


def get_food_service() -> FoodDatabaseService:
    """Get food database service instance"""
    return FoodDatabaseService()

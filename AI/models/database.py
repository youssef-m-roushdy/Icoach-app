"""
Database models matching the existing Food schema
"""
from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.sql import func
from config.database import Base


class Food(Base):
    """Food model matching the existing PostgreSQL schema"""
    
    __tablename__ = "foods"
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    calories = Column(Numeric(10, 2), nullable=False)
    protein = Column(Numeric(10, 2), nullable=False)
    carbohydrate = Column(Numeric(10, 2), nullable=False)
    fat = Column(Numeric(10, 2), nullable=False)
    sugar = Column(Numeric(10, 2), nullable=False, default=0.0)
    pic = Column(String(500), nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Food(id={self.id}, name='{self.name}', calories={self.calories})>"
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "calories": float(self.calories),
            "protein": float(self.protein),
            "carbohydrate": float(self.carbohydrate),
            "fat": float(self.fat),
            "sugar": float(self.sugar),
            "pic": self.pic,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "updatedAt": self.updatedAt.isoformat() if self.updatedAt else None,
        }

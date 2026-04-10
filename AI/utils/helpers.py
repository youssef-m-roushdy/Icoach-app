"""Utility functions"""
import hashlib
from typing import Optional


def normalize_food_name(name: str) -> str:
    """
    Normalize food name for consistent database lookups
    
    Args:
        name: Raw food name
        
    Returns:
        Normalized food name (lowercase, trimmed, underscores replaced)
    """
    return name.strip().lower().replace('_', ' ')


def calculate_file_hash(file_bytes: bytes) -> str:
    """
    Calculate MD5 hash of file bytes
    
    Args:
        file_bytes: File content as bytes
        
    Returns:
        MD5 hash string
    """
    return hashlib.md5(file_bytes).hexdigest()


def format_confidence(confidence: float) -> str:
    """
    Format confidence score as percentage
    
    Args:
        confidence: Confidence score (0-1)
        
    Returns:
        Formatted percentage string
    """
    return f"{confidence * 100:.2f}%"

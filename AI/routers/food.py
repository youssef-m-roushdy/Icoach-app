"""
Food prediction API routes
"""
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import logging

from config.settings import get_settings
from config.database import get_db
from models import PredictionResponse, ErrorResponse, FoodResponse
from services import get_model, get_food_service

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/api/food", tags=["Food Recognition"])


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Identify Food from Image",
    description="""
    ## 📸 Food Recognition & Nutrition Lookup
    
    Upload a food image to identify it using AI and retrieve nutritional information from the database.
    
    ### How it works:
    1. **Upload Image**: Send a food photo (JPG, PNG, WEBP)
    2. **AI Recognition**: EfficientNetB0 model predicts the food type with confidence score
    3. **Database Lookup**: Fetches nutritional data (calories, protein, carbs, fat, sugar)
    4. **Smart Fallback**: If primary prediction not found, tries alternative predictions
    5. **Suggestions**: Provides similar food suggestions if food not in database
    
    ### Use Cases:
    - 🍎 Food tracking apps
    - 💪 Fitness and nutrition monitoring
    - 🏥 Dietary planning applications
    - 📱 Mobile food recognition features
    
    ### Request:
    - **file**: Food image file (Max 10MB)
    - **Supported formats**: JPG, JPEG, PNG, WEBP
    
    ### Response:
    - **success**: Whether food was identified and found in database
    - **predicted_food**: Name of identified food
    - **confidence**: AI confidence score (0-1)
    - **food_data**: Complete nutritional information (if found)
    - **message**: Result description
    - **suggestions**: Alternative food names (if not found)
    
    ### Example Response (Success):
    ```json
    {
      "success": true,
      "predicted_food": "chicken breast",
      "confidence": 0.92,
      "food_data": {
        "calories": 165,
        "protein": 31,
        "carbohydrate": 0,
        "fat": 3.6
      },
      "message": "Successfully identified chicken breast"
    }
    ```
    
    ### Example Response (Not Found):
    ```json
    {
      "success": false,
      "predicted_food": "exotic_dish",
      "confidence": 0.85,
      "food_data": null,
      "message": "Food identified but not found in nutrition database",
      "suggestions": ["chicken", "beef", "rice"]
    }
    ```
    """,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file format or size"},
        500: {"model": ErrorResponse, "description": "Server error during prediction"}
    },
    tags=["Food Recognition"]
)
async def predict_food(
    file: UploadFile = File(..., description="Food image file (JPG, PNG, WEBP - Max 10MB)"),
    db: Session = Depends(get_db)
):
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Read image bytes
        image_bytes = await file.read()
        
        # Check file size
        if len(image_bytes) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
            )
        
        # Get ML model
        model = get_model(
            settings.MODEL_PATH,
            settings.CLASS_NAMES_PATH,
            settings.IMG_SIZE
        )
        
        # Predict food
        logger.info(f"Predicting food from image: {file.filename}")
        predicted_food, confidence = model.predict(image_bytes)
        logger.info(f"Prediction: {predicted_food} with confidence {confidence:.2%}")
        
        # Get food from database
        food_service = get_food_service()
        food = food_service.get_food_by_name(db, predicted_food)

        if confidence < (10 / 100):
            logger.warning(f"Low confidence ({confidence:.2%}) for prediction '{predicted_food}'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Low confidence in food prediction. Please try with a clearer image."
            )
        
        if food:
            # Food found in database
            logger.info(f"Food '{predicted_food}' found in database")
            return PredictionResponse(
                success=True,
                predicted_food=predicted_food,
                confidence=confidence,
                food_data=FoodResponse.model_validate(food),
                message=f"Successfully identified {predicted_food}"
            )
        else:
            # Food not found in database - provide suggestions
            logger.warning(f"Food '{predicted_food}' not found in database")
            suggestions = food_service.find_similar_foods(db, predicted_food)
            
            # Get top 3 alternative predictions
            top_predictions = model.get_top_predictions(image_bytes, top_k=3)
            
            # Check if any alternative prediction exists in database
            alternative_food = None
            for alt_name, alt_conf in top_predictions[1:]:  # Skip first (already checked)
                alt_food = food_service.get_food_by_name(db, alt_name)
                if alt_food:
                    alternative_food = alt_food
                    predicted_food = alt_name
                    confidence = alt_conf
                    break
            
            if alternative_food:
                logger.info(f"Alternative food '{predicted_food}' found in database")
                return PredictionResponse(
                    success=True,
                    predicted_food=predicted_food,
                    confidence=confidence,
                    food_data=FoodResponse.model_validate(alternative_food),
                    message=f"Primary prediction not found, but identified as {predicted_food}",
                    suggestions=suggestions
                )
            else:
                return PredictionResponse(
                    success=False,
                    predicted_food=predicted_food,
                    confidence=confidence,
                    food_data=None,
                    message=f"Food '{predicted_food}' was identified but not found in the nutrition database",
                    suggestions=suggestions if suggestions else None
                )
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during prediction"
        )


@router.post(
    "/predict-top",
    response_model=dict,
    summary="Get Multiple Food Predictions",
    description="""
    ## 🎯 Top K Food Predictions with Database Matching
    
    Get multiple AI predictions for a food image, ranked by confidence, with database availability status.
    
    ### How it works:
    1. **Upload Image**: Send a food photo
    2. **Multiple Predictions**: AI returns top K most likely foods with confidence scores
    3. **Database Check**: Each prediction is checked against the nutrition database
    4. **Ranked Results**: Predictions sorted by confidence (highest first)
    
    ### Use Cases:
    - 🤔 When food identification is uncertain
    - 📊 Comparing multiple possible matches
    - 🔍 Exploring alternative food options
    - 🧪 Testing and debugging food recognition
    - 📈 Understanding model confidence distribution
    
    ### Request:
    - **file**: Food image file (Max 10MB)
    - **top_k**: Number of predictions to return (1-10, default: 3)
    
    ### Response Structure:
    - **success**: Operation status
    - **predictions**: Array of predictions with:
      - **food_name**: Predicted food name
      - **confidence**: AI confidence score (0-1)
      - **in_database**: Whether nutritional data is available
      - **food_data**: Complete nutrition info (if available)
    - **total**: Number of predictions returned
    
    ### Example Response:
    ```json
    {
      "success": true,
      "predictions": [
        {
          "food_name": "chicken breast",
          "confidence": 0.92,
          "in_database": true,
          "food_data": {
            "calories": 165,
            "protein": 31,
            "carbohydrate": 0,
            "fat": 3.6
          }
        },
        {
          "food_name": "turkey breast",
          "confidence": 0.05,
          "in_database": true,
          "food_data": {...}
        },
        {
          "food_name": "fish fillet",
          "confidence": 0.02,
          "in_database": false,
          "food_data": null
        }
      ],
      "total": 3
    }
    ```
    
    ### Tips:
    - Use **top_k=1** for fastest response (single prediction)
    - Use **top_k=5-10** when you want to see alternatives
    - Check **in_database** flag to filter available foods
    - Higher **confidence** generally means more accurate prediction
    """,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file format or size"},
        500: {"model": ErrorResponse, "description": "Server error during prediction"}
    },
    tags=["Food Recognition"]
)
async def predict_food_top_k(
    file: UploadFile = File(..., description="Food image file (JPG, PNG, WEBP - Max 10MB)"),
    top_k: int = 3,
    db: Session = Depends(get_db)
):
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Read image bytes
        image_bytes = await file.read()
        
        # Get ML model
        model = get_model(
            settings.MODEL_PATH,
            settings.CLASS_NAMES_PATH,
            settings.IMG_SIZE
        )
        
        # Get top K predictions
        logger.info(f"Getting top {top_k} predictions for image: {file.filename}")
        predictions = model.get_top_predictions(image_bytes, top_k=top_k)
        
        # Check database for each prediction
        food_service = get_food_service()
        results = []
        
        for food_name, conf in predictions:
            food = food_service.get_food_by_name(db, food_name)
            results.append({
                "food_name": food_name,
                "confidence": conf,
                "in_database": food is not None,
                "food_data": FoodResponse.model_validate(food).model_dump() if food else None
            })
        
        return {
            "success": True,
            "predictions": results,
            "total": len(results)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Top-K prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during prediction"
        )

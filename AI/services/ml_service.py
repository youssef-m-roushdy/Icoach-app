"""
Machine Learning model service for food recognition
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np
import json
from PIL import Image
import io
from pathlib import Path
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class FoodRecognitionModel:
    """Service for loading and using the food recognition model"""
    
    def __init__(self, model_path: Path, class_names_path: Path, img_size: int = 224):
        """
        Initialize the food recognition model
        
        Args:
            model_path: Path to the Keras model file
            class_names_path: Path to the class names JSON file
            img_size: Input image size for the model
        """
        self.model_path = model_path
        self.class_names_path = class_names_path
        self.img_size = img_size
        self.model = None
        self.class_names = None
        self._load_model()
        self._load_class_names()
    
    def _load_model(self) -> None:
        """Load the trained Keras model"""
        try:
            logger.info(f"Loading model from {self.model_path}")
            
            # Try loading as a full model first
            try:
                self.model = tf.keras.models.load_model(str(self.model_path))
                logger.info("Model loaded successfully as full model")
                return
            except Exception as e:
                logger.warning(f"Could not load as full model: {e}")
            
            # Build model architecture and load weights
            self.model = self._build_model()
            self.model.load_weights(str(self.model_path))
            logger.info("Model weights loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise RuntimeError(f"Model loading failed: {e}")
    
    def _build_model(self) -> keras.Model:
        """Build the EfficientNetB0 model architecture"""
        # Data augmentation layer (not used during inference)
        data_augmentation = keras.Sequential([
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.2),
            layers.RandomZoom(0.2),
            layers.RandomContrast(0.2)
        ], name="data_augmentation")
        
        # Base model
        base_model = tf.keras.applications.EfficientNetB0(
            include_top=False,
            weights=None,
            input_shape=(self.img_size, self.img_size, 3)
        )
        base_model.trainable = False
        
        # Full model
        inputs = keras.Input(shape=(self.img_size, self.img_size, 3), name="input_layer")
        x = data_augmentation(inputs)
        x = base_model(x, training=False)
        x = layers.GlobalAveragePooling2D(name="pooling_layer")(x)
        x = layers.Dropout(0.3, name="dropout_layer")(x)
        outputs = layers.Dense(100, activation="softmax", name="output_layer")(x)
        
        model = keras.Model(inputs, outputs, name="EfficientNetB0_Food100")
        return model
    
    def _load_class_names(self) -> None:
        """Load class names from JSON file"""
        try:
            logger.info(f"Loading class names from {self.class_names_path}")
            with open(self.class_names_path, 'r', encoding='utf-8') as f:
                self.class_names = json.load(f)
            logger.info(f"Loaded {len(self.class_names)} class names")
        except Exception as e:
            logger.error(f"Failed to load class names: {e}")
            raise RuntimeError(f"Class names loading failed: {e}")
    
    def preprocess_image(self, image_bytes: bytes) -> Optional[np.ndarray]:
        """
        Preprocess image for model prediction
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Preprocessed image array or None if processing fails
        """
        try:
            # Open image from bytes
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Resize to model input size
            image = image.resize((self.img_size, self.img_size))
            
            # Convert to numpy array and add batch dimension
            img_array = np.array(image)
            img_array = np.expand_dims(img_array, axis=0)
            
            return img_array
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            return None
    
    def predict(self, image_bytes: bytes) -> Tuple[str, float]:
        """
        Predict food class from image
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Tuple of (predicted_class_name, confidence_score)
        """
        if self.model is None or self.class_names is None:
            raise RuntimeError("Model or class names not loaded")
        
        # Preprocess image
        processed_image = self.preprocess_image(image_bytes)
        if processed_image is None:
            raise ValueError("Image preprocessing failed")
        
        # Make prediction
        predictions = self.model.predict(processed_image, verbose=0)
        
        # Get the class with highest probability
        predicted_index = np.argmax(predictions[0])
        confidence = float(np.max(predictions[0]))
        
        # Get class name
        if 0 <= predicted_index < len(self.class_names):
            predicted_class = self.class_names[predicted_index]
        else:
            raise ValueError(f"Predicted index {predicted_index} out of range")
        
        return predicted_class, confidence
    
    def get_top_predictions(self, image_bytes: bytes, top_k: int = 5) -> list[Tuple[str, float]]:
        """
        Get top K predictions for an image
        
        Args:
            image_bytes: Raw image bytes
            top_k: Number of top predictions to return
            
        Returns:
            List of (class_name, confidence) tuples
        """
        if self.model is None or self.class_names is None:
            raise RuntimeError("Model or class names not loaded")
        
        # Preprocess image
        processed_image = self.preprocess_image(image_bytes)
        if processed_image is None:
            raise ValueError("Image preprocessing failed")
        
        # Make prediction
        predictions = self.model.predict(processed_image, verbose=0)
        
        # Get top K predictions
        top_indices = np.argsort(predictions[0])[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            if 0 <= idx < len(self.class_names):
                class_name = self.class_names[idx]
                confidence = float(predictions[0][idx])
                results.append((class_name, confidence))
        
        return results
    
    def is_loaded(self) -> bool:
        """Check if model is loaded and ready"""
        return self.model is not None and self.class_names is not None


# Global model instance (singleton pattern)
_model_instance: Optional[FoodRecognitionModel] = None


def get_model(model_path: Path, class_names_path: Path, img_size: int = 224) -> FoodRecognitionModel:
    """
    Get or create the global model instance
    
    Args:
        model_path: Path to the Keras model file
        class_names_path: Path to the class names JSON file
        img_size: Input image size for the model
        
    Returns:
        FoodRecognitionModel instance
    """
    global _model_instance
    if _model_instance is None:
        _model_instance = FoodRecognitionModel(model_path, class_names_path, img_size)
    return _model_instance

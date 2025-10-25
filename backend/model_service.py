"""
ASL Model Service
Handles model loading, preprocessing, and inference
"""

import os
import numpy as np
import cv2
from PIL import Image
import tensorflow as tf
from tensorflow.keras.models import load_model
import logging

logger = logging.getLogger(__name__)

class ASLModelService:
    def __init__(self):
        self.model = None
        self.is_loaded = False
        self.labels = [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'
        ]
    
    def load_model(self, model_path=None):
        """Load the trained ASL model"""
        try:
            if model_path is None:
                # Try common model locations
                possible_paths = [
                    'asl_cnn_augmented.keras',
                    'models/asl_cnn_augmented.keras',
                    '../asl_cnn_augmented.keras',
                    'asl_model.h5',
                    'models/asl_model.h5'
                ]
                
                for path in possible_paths:
                    if os.path.exists(path):
                        model_path = path
                        break
                
                if model_path is None:
                    logger.error("No model file found")
                    return False
            
            logger.info(f"Loading model from {model_path}")
            self.model = load_model(model_path)
            self.is_loaded = True
            logger.info("Model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.is_loaded = False
            return False
    
    def preprocess_image(self, image_array):
        """
        Preprocess image for the ASL CNN model
        Input: PIL Image or numpy array
        Output: (1, 28, 28, 1) normalized array
        """
        try:
            # Convert PIL Image to numpy if needed
            if hasattr(image_array, 'convert'):
                image_array = np.array(image_array.convert('RGB'))
            
            # Convert to grayscale if needed
            if len(image_array.shape) == 3:
                gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = image_array
            
            # Resize to 28x28 (ASL MNIST size)
            resized = cv2.resize(gray, (28, 28))
            
            # Normalize to [0, 1]
            normalized = resized.astype(np.float32) / 255.0
            
            # Reshape for model input
            final = normalized.reshape(1, 28, 28, 1)
            
            return final
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            return None
    
    def predict(self, image_data):
        """
        Make prediction on preprocessed image
        Returns: dict with prediction results
        """
        if not self.is_loaded:
            raise Exception("Model not loaded")
        
        try:
            # Preprocess image
            processed = self.preprocess_image(image_data)
            if processed is None:
                raise Exception("Failed to preprocess image")
            
            # Make prediction
            predictions = self.model.predict(processed, verbose=0)
            
            # Get results
            predicted_class = np.argmax(predictions[0])
            confidence = float(np.max(predictions[0]) * 100)
            
            # Get top 3 predictions
            top_indices = np.argsort(predictions[0])[-3:][::-1]
            top_predictions = [
                {
                    'letter': self.labels[i],
                    'confidence': float(predictions[0][i] * 100)
                }
                for i in top_indices
            ]
            
            return {
                'predicted_letter': self.labels[predicted_class],
                'confidence': confidence,
                'top_predictions': top_predictions,
                'raw_predictions': predictions[0].tolist()
            }
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            raise e
    
    def get_model_info(self):
        """Get information about the loaded model"""
        if not self.is_loaded:
            return {'loaded': False}
        
        return {
            'loaded': True,
            'input_shape': self.model.input_shape,
            'output_shape': self.model.output_shape,
            'num_classes': len(self.labels),
            'labels': self.labels
        }

# Global model service instance
model_service = ASLModelService()
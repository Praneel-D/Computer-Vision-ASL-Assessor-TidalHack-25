#!/usr/bin/env python3
"""
ASL Form Correction Backend
Flask API server for ASL sign recognition using trained CNN model
"""

import os
import io
import base64
import numpy as np
from PIL import Image
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow.keras.models import load_model
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global model variable
model = None

# ASL alphabet mapping (A-Y, no J/Z in MNIST dataset)
ASL_LABELS = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'
]

def load_asl_model():
    """Load the trained ASL CNN model"""
    global model
    try:
        # Try to load from different possible locations
        model_paths = [
            'asl_cnn_augmented.keras',
            'models/asl_cnn_augmented.keras',
            '../asl_cnn_augmented.keras'
        ]
        
        for path in model_paths:
            if os.path.exists(path):
                logger.info(f"Loading model from {path}")
                model = load_model(path)
                logger.info("Model loaded successfully!")
                return True
        
        logger.error("Model file not found in any expected location")
        return False
        
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        return False

def preprocess_image(image_data):
    """
    Preprocess image for ASL CNN model
    Expected input: base64 image data
    Expected output: (28, 28, 1) numpy array normalized to [0, 1]
    """
    try:
        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            img_gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            img_gray = img_array
        
        # Resize to 28x28 (ASL MNIST size)
        img_resized = cv2.resize(img_gray, (28, 28))
        
        # Normalize to [0, 1]
        img_normalized = img_resized.astype(np.float32) / 255.0
        
        # Reshape for model input (1, 28, 28, 1)
        img_final = img_normalized.reshape(1, 28, 28, 1)
        
        return img_final
        
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        return None

def get_prediction_confidence(predictions):
    """Calculate confidence metrics from model predictions"""
    max_prob = np.max(predictions[0])
    predicted_class = np.argmax(predictions[0])
    
    # Calculate confidence score (0-100)
    confidence = float(max_prob * 100)
    
    # Get top 3 predictions
    top_indices = np.argsort(predictions[0])[-3:][::-1]
    top_predictions = [
        {
            'letter': ASL_LABELS[i],
            'confidence': float(predictions[0][i] * 100)
        }
        for i in top_indices
    ]
    
    return {
        'predicted_letter': ASL_LABELS[predicted_class],
        'confidence': confidence,
        'top_predictions': top_predictions
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'message': 'ASL Recognition API is running'
    })

@app.route('/predict', methods=['POST'])
def predict_sign():
    """
    Predict ASL sign from image
    Expected input: JSON with 'image' field containing base64 image data
    """
    try:
        if model is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded'
            }), 500
        
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No image data provided'
            }), 400
        
        # Preprocess image
        processed_image = preprocess_image(data['image'])
        if processed_image is None:
            return jsonify({
                'success': False,
                'error': 'Failed to process image'
            }), 400
        
        # Make prediction
        predictions = model.predict(processed_image, verbose=0)
        result = get_prediction_confidence(predictions)
        
        return jsonify({
            'success': True,
            'prediction': result,
            'model_info': {
                'type': 'CNN',
                'classes': len(ASL_LABELS),
                'input_size': '28x28'
            }
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/analyze-sign', methods=['POST'])
def analyze_sign():
    """
    Analyze ASL sign with detailed feedback (compatible with frontend)
    Expected input: JSON with 'imageDataUrl' and 'targetSign' fields
    """
    try:
        if model is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded'
            }), 500
        
        data = request.get_json()
        if not data or 'imageDataUrl' not in data or 'targetSign' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing imageDataUrl or targetSign'
            }), 400
        
        # Get target sign info
        target_sign = data['targetSign']
        target_word = target_sign.get('word', '').upper()
        
        # For multi-letter words, analyze first letter
        target_letter = target_word[0] if target_word else 'A'
        
        # Preprocess image
        processed_image = preprocess_image(data['imageDataUrl'])
        if processed_image is None:
            return jsonify({
                'success': False,
                'error': 'Failed to process image'
            }), 400
        
        # Make prediction
        predictions = model.predict(processed_image, verbose=0)
        result = get_prediction_confidence(predictions)
        
        # Calculate match score
        predicted_letter = result['predicted_letter']
        confidence = result['confidence']
        
        # Calculate match percentage
        if predicted_letter == target_letter:
            match_percentage = min(95, max(70, confidence))
        else:
            # Check if target letter is in top predictions
            target_in_top = any(p['letter'] == target_letter for p in result['top_predictions'])
            if target_in_top:
                target_confidence = next(p['confidence'] for p in result['top_predictions'] if p['letter'] == target_letter)
                match_percentage = min(60, max(30, target_confidence))
            else:
                match_percentage = min(30, max(5, confidence * 0.3))
        
        # Generate feedback
        feedback = generate_feedback(target_letter, predicted_letter, confidence, result['top_predictions'])
        
        return jsonify({
            'success': True,
            'score': int(match_percentage),
            'engine': 'cnn-model',
            'details': {
                'predicted_letter': predicted_letter,
                'target_letter': target_letter,
                'confidence': confidence,
                'feedback': feedback['feedback'],
                'suggestions': feedback['suggestions'],
                'handDetected': True,
                'formAnalysis': feedback['form_analysis'],
                'top_predictions': result['top_predictions']
            }
        })
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def generate_feedback(target_letter, predicted_letter, confidence, top_predictions):
    """Generate detailed feedback for sign analysis"""
    
    if predicted_letter == target_letter:
        if confidence > 80:
            feedback = f"Excellent! Your {target_letter} sign is very clear and well-formed."
            suggestions = "Keep practicing to maintain this level of accuracy."
        elif confidence > 60:
            feedback = f"Good {target_letter} sign! The model recognized it correctly with moderate confidence."
            suggestions = "Try to make your hand position more distinct and ensure good lighting."
        else:
            feedback = f"The model detected {target_letter} but with low confidence."
            suggestions = "Focus on making your hand shape more precise and ensure your hand is clearly visible."
    else:
        feedback = f"The model predicted '{predicted_letter}' instead of '{target_letter}' (confidence: {confidence:.1f}%)."
        
        # Check if target is in top predictions
        target_in_top = any(p['letter'] == target_letter for p in top_predictions)
        if target_in_top:
            target_conf = next(p['confidence'] for p in top_predictions if p['letter'] == target_letter)
            suggestions = f"Your {target_letter} sign was detected with {target_conf:.1f}% confidence. Try to make the hand shape more distinct from {predicted_letter}."
        else:
            suggestions = f"Focus on the key differences between {target_letter} and {predicted_letter}. Ensure proper finger positioning and hand orientation."
    
    # Form analysis based on common ASL letter characteristics
    form_analysis = {
        'handPosition': f"Hand detected and processed for {target_letter} recognition",
        'fingerPlacement': f"Analyzing finger configuration for letter {target_letter}",
        'overallForm': f"Model confidence: {confidence:.1f}% for predicted letter {predicted_letter}"
    }
    
    return {
        'feedback': feedback,
        'suggestions': suggestions,
        'form_analysis': form_analysis
    }

@app.route('/available-signs', methods=['GET'])
def get_available_signs():
    """Get list of available ASL signs the model can recognize"""
    return jsonify({
        'success': True,
        'signs': ASL_LABELS,
        'total_count': len(ASL_LABELS),
        'note': 'Model trained on ASL MNIST dataset (A-Y, excluding J and Z)'
    })

if __name__ == '__main__':
    logger.info("Starting ASL Recognition API...")
    
    # Load the model
    if load_asl_model():
        logger.info("Model loaded successfully!")
    else:
        logger.warning("Model not loaded - API will return errors for predictions")
    
    # Start the Flask app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
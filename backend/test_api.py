#!/usr/bin/env python3
"""
Test script for ASL Recognition API
"""

import requests
import base64
import json
from PIL import Image, ImageDraw
import numpy as np
import io

def create_test_image():
    """Create a simple test image (28x28 grayscale)"""
    # Create a simple hand-like shape for testing
    img = Image.new('L', (28, 28), 0)  # Black background
    draw = ImageDraw.Draw(img)
    
    # Draw a simple hand shape (rectangle with fingers)
    draw.rectangle([8, 10, 20, 25], fill=255)  # Palm
    draw.rectangle([10, 5, 12, 10], fill=255)  # Finger 1
    draw.rectangle([13, 4, 15, 10], fill=255)  # Finger 2
    draw.rectangle([16, 5, 18, 10], fill=255)  # Finger 3
    
    return img

def image_to_base64(img):
    """Convert PIL image to base64 string"""
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/jpeg;base64,{img_str}"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get('http://localhost:5000/health')
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_predict():
    """Test predict endpoint"""
    print("\nTesting predict endpoint...")
    try:
        test_img = create_test_image()
        img_data = image_to_base64(test_img)
        
        response = requests.post(
            'http://localhost:5000/predict',
            json={'image': img_data},
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if result.get('success'):
            pred = result.get('prediction', {})
            print(f"Predicted letter: {pred.get('predicted_letter')}")
            print(f"Confidence: {pred.get('confidence'):.2f}%")
        
        return response.status_code == 200
    except Exception as e:
        print(f"Predict test failed: {e}")
        return False

def test_analyze():
    """Test analyze-sign endpoint"""
    print("\nTesting analyze-sign endpoint...")
    try:
        test_img = create_test_image()
        img_data = image_to_base64(test_img)
        
        target_sign = {
            'word': 'HELLO',
            'meaning': 'A friendly greeting',
            'tips': 'Open hand by your temple and move outward'
        }
        
        response = requests.post(
            'http://localhost:5000/analyze-sign',
            json={
                'imageDataUrl': img_data,
                'targetSign': target_sign
            },
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if result.get('success'):
            print(f"Match score: {result.get('score')}%")
            print(f"Engine: {result.get('engine')}")
            details = result.get('details', {})
            print(f"Predicted: {details.get('predicted_letter')}")
            print(f"Target: {details.get('target_letter')}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"Analyze test failed: {e}")
        return False

def test_available_signs():
    """Test available-signs endpoint"""
    print("\nTesting available-signs endpoint...")
    try:
        response = requests.get('http://localhost:5000/available-signs')
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Available signs: {result.get('signs', [])}")
        print(f"Total count: {result.get('total_count', 0)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Available signs test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing ASL Recognition API")
    print("=" * 40)
    
    tests = [
        ("Health Check", test_health),
        ("Predict Endpoint", test_predict),
        ("Analyze Endpoint", test_analyze),
        ("Available Signs", test_available_signs)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 30)
        success = test_func()
        results.append((test_name, success))
        print(f"Result: {'✅ PASS' if success else '❌ FAIL'}")
    
    print("\n" + "=" * 40)
    print("📊 Test Summary:")
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your API is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the server logs for details.")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Setup script for ASL Recognition Backend
"""

import os
import sys
import subprocess
import urllib.request
import shutil

def install_requirements():
    """Install Python requirements"""
    print("Installing Python requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def download_sample_model():
    """Download a sample model if none exists"""
    model_files = [
        'asl_cnn_augmented.keras',
        'asl_model.h5',
        'models/asl_cnn_augmented.keras'
    ]
    
    # Check if any model file exists
    for model_file in model_files:
        if os.path.exists(model_file):
            print(f"✅ Found existing model: {model_file}")
            return True
    
    print("⚠️  No model file found!")
    print("Please place your trained model file in one of these locations:")
    for model_file in model_files:
        print(f"  - {model_file}")
    
    print("\nTo train a new model, run your training script (tidalhack_'25.py)")
    return False

def create_models_directory():
    """Create models directory if it doesn't exist"""
    if not os.path.exists('models'):
        os.makedirs('models')
        print("✅ Created models directory")

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def main():
    print("🚀 Setting up ASL Recognition Backend...")
    
    if not check_python_version():
        return False
    
    create_models_directory()
    
    if not install_requirements():
        return False
    
    if not download_sample_model():
        print("\n📝 Next steps:")
        print("1. Train your model using tidalhack_'25.py")
        print("2. Save the model as 'asl_cnn_augmented.keras'")
        print("3. Run: python app.py")
        return False
    
    print("\n🎉 Setup complete!")
    print("To start the backend server, run: python app.py")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
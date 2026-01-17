#!/bin/bash
# Cornerstone Speech Service - macOS Build Script
# Creates a .app bundle using PyInstaller

set -e

echo "Building Cornerstone Speech Service for macOS..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_DIR="$SCRIPT_DIR/../service"

cd "$SERVICE_DIR"

# Create/activate virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt
pip install pyinstaller

# Download Vosk model if not present
MODEL_PATH="vosk-model-small-en-us-0.15"
if [ ! -d "$MODEL_PATH" ]; then
    echo "Downloading Vosk model..."
    curl -L -o model.zip "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
    unzip -o model.zip
    rm model.zip
fi

# Build with PyInstaller
echo "Building application..."
pyinstaller --onedir --windowed \
    --name "CornerstoneSpeechService" \
    --add-data "$MODEL_PATH:model" \
    --hidden-import vosk \
    --hidden-import sounddevice \
    --hidden-import websockets \
    --osx-bundle-identifier "com.cornerstone.speechservice" \
    server.py

# Create output directory
OUTPUT_DIR="$SCRIPT_DIR/../dist"
mkdir -p "$OUTPUT_DIR"

# Copy to dist folder
cp -R "dist/CornerstoneSpeechService.app" "$OUTPUT_DIR/"

echo "Build complete! Output: $OUTPUT_DIR/CornerstoneSpeechService.app"

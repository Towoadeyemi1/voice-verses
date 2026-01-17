# Cornerstone Speech Service - Windows Build Script
# Creates a portable .exe using PyInstaller

$ErrorActionPreference = "Stop"

Write-Host "Building Cornerstone Speech Service for Windows..." -ForegroundColor Cyan

# Navigate to service directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$servicePath = Join-Path $scriptPath "..\service"
Push-Location $servicePath

try {
    # Create/activate virtual environment
    if (-not (Test-Path "venv")) {
        Write-Host "Creating virtual environment..."
        python -m venv venv
    }
    
    .\venv\Scripts\Activate.ps1
    
    # Install dependencies
    Write-Host "Installing dependencies..."
    pip install -r requirements.txt
    pip install pyinstaller

    # Download Vosk model if not present
    $modelPath = "vosk-model-small-en-us-0.15"
    if (-not (Test-Path $modelPath)) {
        Write-Host "Downloading Vosk model..."
        $modelUrl = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
        Invoke-WebRequest -Uri $modelUrl -OutFile "model.zip"
        Expand-Archive -Path "model.zip" -DestinationPath "." -Force
        Remove-Item "model.zip"
    }

    # Build with PyInstaller
    Write-Host "Building executable..."
    pyinstaller --onedir --noconsole `
        --name "CornerstoneSpeechService" `
        --add-data "$modelPath;model" `
        --hidden-import vosk `
        --hidden-import sounddevice `
        --hidden-import websockets `
        server.py

    # Create output directory
    $outputDir = Join-Path $scriptPath "..\dist"
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir | Out-Null
    }

    # Copy to dist folder
    Copy-Item -Path "dist\CornerstoneSpeechService" -Destination $outputDir -Recurse -Force

    Write-Host "Build complete! Output: $outputDir\CornerstoneSpeechService" -ForegroundColor Green
    
} finally {
    Pop-Location
}

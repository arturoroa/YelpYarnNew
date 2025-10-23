#!/bin/bash
# Setup script for Python Yelp automation bot

echo "=== Setting up Python Yelp Automation Bot ==="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

echo "✓ pip3 found"

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
cd backend/automation
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✓ Python dependencies installed successfully"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Check if ChromeDriver is installed
echo ""
echo "Checking for ChromeDriver..."
if command -v chromedriver &> /dev/null; then
    echo "✓ ChromeDriver found: $(chromedriver --version)"
else
    echo "⚠ ChromeDriver not found in PATH"
    echo ""
    echo "Please install ChromeDriver:"
    echo "  - macOS: brew install chromedriver"
    echo "  - Ubuntu: sudo apt-get install chromium-chromedriver"
    echo "  - Or download from: https://chromedriver.chromium.org/"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Test the bot with:"
echo "  python3 backend/automation/yelp_signup_bot.py --mode automatic --headless"

@echo off
REM Setup script for Python Yelp automation bot (Windows)

echo === Setting up Python Yelp Automation Bot ===
echo.

REM Check if Python 3 is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Python is not installed or not in PATH
    echo Please install Python 3 from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python found
python --version
echo.

REM Install Python dependencies
echo Installing Python dependencies...
cd backend\automation
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo [X] Failed to install Python dependencies
    pause
    exit /b 1
)

echo [OK] Python dependencies installed successfully
echo.

REM Check for ChromeDriver
where chromedriver >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ChromeDriver not found in PATH
    echo.
    echo Please install ChromeDriver:
    echo   1. Download from: https://chromedriver.chromium.org/
    echo   2. Extract chromedriver.exe
    echo   3. Add to PATH or place in backend\automation folder
    echo.
) else (
    echo [OK] ChromeDriver found
    chromedriver --version
)

echo.
echo === Setup Complete ===
echo.
echo Test the bot with:
echo   python backend\automation\yelp_signup_bot.py --mode automatic --headless
echo.
pause

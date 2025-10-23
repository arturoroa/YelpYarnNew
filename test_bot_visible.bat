@echo off
REM Test Python bot with visible browser (non-headless)

echo ===================================
echo Testing Python Bot - Visible Mode
echo ===================================
echo.
echo The Chrome browser will open and you'll see the automation happen!
echo The browser will stay open for 5 seconds after filling the form.
echo.
echo IMPORTANT: Watch the console output to see what's happening!
echo If it gets stuck, note the LAST message printed before it stops.
echo.
echo Press Ctrl+C to cancel, or wait to start...
timeout /t 3
echo.

cd %~dp0

echo Running: python backend\automation\yelp_signup_bot.py --mode automatic
echo.
python backend\automation\yelp_signup_bot.py --mode automatic

echo.
echo Exit Code: %ERRORLEVEL%
echo.
if %ERRORLEVEL% EQU 0 (
    echo ===================================
    echo Test Complete - SUCCESS!
    echo ===================================
) else (
    echo ===================================
    echo Test FAILED with exit code %ERRORLEVEL%
    echo ===================================
)
pause

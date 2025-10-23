@echo off
REM Test Python bot with visible browser (non-headless)

echo ===================================
echo Testing Python Bot - Visible Mode
echo ===================================
echo.
echo The Chrome browser will open and you'll see the automation happen!
echo The browser will stay open for 5 seconds after filling the form.
echo.
echo Press Ctrl+C to cancel, or wait to start...
timeout /t 3
echo.

cd %~dp0
python backend\automation\yelp_signup_bot.py --mode automatic

echo.
echo ===================================
echo Test Complete!
echo ===================================
pause

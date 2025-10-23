# Quick Start: Python Bot Setup (Windows)

You're getting the error because Python's `selenium` module isn't installed yet. Here's how to fix it:

## Step 1: Install Python Selenium

Open Command Prompt (cmd) and run:

```cmd
pip install selenium
```

## Step 2: Install ChromeDriver

1. **Check your Chrome version:**
   - Open Chrome browser
   - Click the 3 dots (⋮) → Help → About Google Chrome
   - Note the version (e.g., "120.0.6099.109")

2. **Download matching ChromeDriver:**
   - Go to: https://chromedriver.chromium.org/downloads
   - Download the version that matches your Chrome
   - Extract `chromedriver.exe`

3. **Place ChromeDriver:**
   - Copy `chromedriver.exe` to: `C:\Users\artur\Downloads\YlpBolt\YelpYarnNew\backend\automation\`
   - Or add it to your PATH

## Step 3: Verify Installation

Test the Python bot directly (browser will open and you'll see it in action):

```cmd
cd C:\Users\artur\Downloads\YlpBolt\YelpYarnNew
python backend\automation\yelp_signup_bot.py --mode automatic
```

**Note:** By default, the browser window will be **visible** so you can watch it work! This is great for debugging.

If you want headless mode (no browser window), add `--headless`:

```cmd
python backend\automation\yelp_signup_bot.py --mode automatic --headless
```

If it works, you'll see:
```
=== Starting Yelp Signup ===
Form type detected: DIRECT
✓ First Name: John
✓ Last Name: Smith
✓ Email: john.smith123@gmail.com
...
```

## Step 4: Run the Application

Now start the app:

```cmd
npm run dev
```

The Python bot will now work when you:
- Click "Create Automatic User" (automatic mode) - **Browser will be visible!**
- Fill the form and click "Create User with Bot" (manual mode) - **Browser will be visible!**

You'll see the Chrome browser open and watch the bot fill the form in real-time. This is perfect for debugging and verifying everything works correctly!

## Quick Setup Script

Or just run the automated setup:

```cmd
setup_python_bot.bat
```

This will:
1. Check Python installation
2. Install selenium
3. Check for ChromeDriver
4. Show any missing requirements

## Troubleshooting

### "pip is not recognized"
```cmd
python -m pip install selenium
```

### "python is not recognized"
- Reinstall Python from https://www.python.org/downloads/
- Check "Add Python to PATH" during installation

### ChromeDriver version mismatch
- Make sure ChromeDriver version matches your Chrome browser version exactly
- Chrome 120.x needs ChromeDriver 120.x

### Still getting errors?
- Check the server console for detailed Python error messages
- Look for lines starting with `[Python]` or `[Python Error]`
- Share the full error message for help

## What the Python Bot Does

**Automatic Mode:**
- Generates random firstName, lastName, email, password, zipCode, birthday
- Opens Yelp signup page
- Detects form type (Modal or Direct)
- Fills all fields automatically
- Returns data to save in database

**Manual Mode:**
- Receives data from your form (firstName, lastName, etc.)
- Opens Yelp signup page
- Detects form type
- Fills all fields with YOUR data
- Returns confirmation to save in database

**All fields are properly filled** including lastName, because it uses the exact Python selectors you provided!

## Important: Browser Visibility

**By default, the browser window is VISIBLE** so you can watch the automation happen in real-time. This makes debugging much easier!

The bot will:
1. Open a Chrome browser window
2. Navigate to Yelp signup
3. Fill in all the form fields
4. Keep the browser open for you to review

If you want headless mode (no browser window), you would need to explicitly modify the frontend code to send `headless: true`, but by default it's always visible.

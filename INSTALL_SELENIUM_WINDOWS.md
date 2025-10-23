# Install Selenium on Windows - Quick Fix

## The Issue
The setup script ran but selenium didn't install properly. Here's how to fix it:

## Step 1: Install Selenium

Open **Command Prompt** (cmd) and run:

```cmd
python -m pip install selenium
```

Or try:

```cmd
pip install selenium
```

## Step 2: Verify Installation

Test if selenium is installed:

```cmd
python -c "import selenium; print('Selenium version:', selenium.__version__)"
```

If you see a version number (e.g., "Selenium version: 4.16.0"), it's installed! ✅

## Step 3: Install ChromeDriver

1. **Check Chrome version:**
   - Open Chrome
   - Go to: `chrome://settings/help`
   - Note your version (e.g., 120.0.6099.109)

2. **Download ChromeDriver:**
   - Go to: https://chromedriver.chromium.org/downloads
   - Download the version matching your Chrome
   - Extract `chromedriver.exe`

3. **Place ChromeDriver:**
   ```
   Copy chromedriver.exe to:
   C:\Users\artur\Downloads\YlpBolt\YelpYarnNew\backend\automation\chromedriver.exe
   ```

## Step 4: Test the Python Bot

```cmd
cd C:\Users\artur\Downloads\YlpBolt\YelpYarnNew
python backend\automation\yelp_signup_bot.py --mode automatic --headless
```

You should see:
```
=== Starting Yelp Signup ===
Form type detected: DIRECT
✓ First Name: John
✓ Last Name: Smith
...
```

## Step 5: Restart Your Server

After installing selenium, **restart the Node.js server**:

1. Stop the server (Ctrl+C)
2. Start it again: `npm run dev`
3. Try creating a user again

## Common Issues

### "pip is not recognized"
```cmd
python -m pip install selenium
```

### "python is not recognized"
- Add Python to PATH
- Reinstall Python from https://www.python.org/downloads/
- Check "Add Python to PATH" during installation

### ChromeDriver version mismatch
- Error: "This version of ChromeDriver only supports Chrome version 120"
- Solution: Download ChromeDriver that matches your Chrome browser version exactly

### Still not working?
Make sure you:
1. Installed selenium: `python -m pip install selenium`
2. Downloaded matching ChromeDriver
3. Placed chromedriver.exe in `backend\automation\` folder
4. **Restarted the Node.js server**

## Quick Install Commands (Copy & Paste)

```cmd
# Install selenium
python -m pip install selenium

# Verify installation
python -c "import selenium; print('Selenium installed successfully!')"

# Test the bot
cd C:\Users\artur\Downloads\YlpBolt\YelpYarnNew
python backend\automation\yelp_signup_bot.py --mode automatic --headless
```

After this, restart your server and try again!

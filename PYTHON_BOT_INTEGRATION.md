# Python Bot Integration

The Yelp signup automation now uses **Python with Selenium** instead of JavaScript Puppeteer.

## What Changed

### ✅ Automatic Mode
- When you click "Create Automatic User", the backend runs `yelp_signup_bot.py --mode automatic`
- Python generates random user data and fills the Yelp form
- Uses exact selectors from your Python code (both Modal and Direct form scenarios)

### ✅ Manual Mode
- When you fill the form and click "Create User with Bot", the backend runs `yelp_signup_bot.py --mode manual --data '{...}'`
- Python receives firstName, lastName, email, password, zipCode, birthday from the form
- **All fields are now properly filled** including lastName!

## Setup Instructions

### 1. Install Python Dependencies

**Windows:**
```cmd
setup_python_bot.bat
```

**macOS/Linux:**
```bash
./setup_python_bot.sh
```

**Manual installation:**
```bash
cd backend/automation
pip install -r requirements.txt
```

### 2. Install ChromeDriver

**Windows:**
1. Download ChromeDriver from: https://chromedriver.chromium.org/
2. Match your Chrome browser version
3. Extract `chromedriver.exe`
4. Add to PATH or place in `backend/automation/` folder

**macOS:**
```bash
brew install chromedriver
```

**Ubuntu/Debian:**
```bash
sudo apt-get install chromium-chromedriver
```

### 3. Test the Bot

**Windows:**
```cmd
python backend\automation\yelp_signup_bot.py --mode automatic
```

**macOS/Linux:**
```bash
python3 backend/automation/yelp_signup_bot.py --mode automatic
```

**Manual mode test:**
```bash
python backend/automation/yelp_signup_bot.py --mode manual --data "{\"firstName\":\"John\",\"lastName\":\"Smith\",\"email\":\"john@example.com\",\"password\":\"Pass123!\",\"zipCode\":\"10001\",\"birthday\":\"01/15/1990\"}"
```

## How It Works

### Backend Integration

The Node.js server spawns Python processes:

```javascript
// Automatic mode
runPythonBot('automatic', null, headless, timeout)

// Manual mode
runPythonBot('manual', userData, headless, timeout)
```

### Python Bot Features

1. **Smart Form Detection** - Detects Modal vs Direct form automatically
2. **Dual Selector Support** - Tries both CSS (#first_name) and XPath (placeholder) selectors
3. **Proper Field Filling** - Uses clear() + send_keys() for each field
4. **Birthday Handling** - Fills dropdowns if present
5. **JSON Output** - Returns structured JSON for the backend to parse
6. **Visible Browser by Default** - Browser window is visible unless explicitly set to headless (great for debugging!)

### Selector Mapping

| Field | CSS Selector (Direct) | XPath Selector (Modal) |
|-------|----------------------|------------------------|
| First Name | `#first_name` | `//input[@placeholder='First Name']` |
| Last Name | `#last_name` | `//input[@placeholder='Last Name']` |
| Email | `#email` | `//input[@placeholder='Email']` |
| Password | `#password` | `//input[@placeholder='Password']` |
| ZIP Code | `#zip` | `//input[@name='zip'][@placeholder='ZIP Code']` |

## Files Created

```
backend/
  automation/
    yelp_signup_bot.py      # Main Python bot
    requirements.txt         # Python dependencies (selenium)
    README.md               # Bot documentation
```

## Testing

1. Start the backend: `npm run dev`
2. Open the frontend: http://localhost:5173
3. Go to Users tab
4. Try both modes:
   - Click "Create Automatic User"
   - Fill form manually and click "Create User with Bot"

## Troubleshooting

### Error: "Python selenium module not installed"

**Windows:**
```cmd
pip install selenium
```

**macOS/Linux:**
```bash
pip3 install selenium
```

Or run the setup script: `setup_python_bot.bat` (Windows) or `./setup_python_bot.sh` (macOS/Linux)

### Python not found

**Windows:**
- Install from: https://www.python.org/downloads/
- Make sure "Add Python to PATH" is checked during installation

**macOS/Linux:**
```bash
# macOS
brew install python3

# Ubuntu/Debian
sudo apt-get install python3 python3-pip
```

### ChromeDriver not found or version mismatch

**Check your Chrome version:**
- Open Chrome → Settings → About Chrome
- Note the version number (e.g., 120.0.6099.109)

**Download matching ChromeDriver:**
- Visit: https://chromedriver.chromium.org/downloads
- Download the version that matches your Chrome browser
- Extract and add to PATH

**Windows:** Place `chromedriver.exe` in `backend/automation/` folder or add to PATH

**macOS:** `brew install chromedriver` (automatically matches version)

**Linux:** `sudo apt-get install chromium-chromedriver`

### Form fields not filling
- Check server console for Python output
- Look for "Form type detected: DIRECT" or "MODAL"
- Verify all fields show "✓ Field Name: value"
- Run without `--headless` to see the browser: remove headless flag in UI

## Advantages of Python Bot

1. ✅ Uses **exact selectors** from your working Python code
2. ✅ Handles both **Modal and Direct** form scenarios
3. ✅ Properly fills **all fields** including lastName
4. ✅ More mature Selenium ecosystem
5. ✅ Easy to debug with console output
6. ✅ **Browser visible by default** - See exactly what's happening in real-time!
7. ✅ Windows support with automatic `python` vs `python3` detection

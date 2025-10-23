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

Run the setup script:
```bash
./setup_python_bot.sh
```

Or manually:
```bash
cd backend/automation
pip3 install -r requirements.txt
```

### 2. Install ChromeDriver

**macOS:**
```bash
brew install chromedriver
```

**Ubuntu/Debian:**
```bash
sudo apt-get install chromium-chromedriver
```

**Windows:**
- Download from: https://chromedriver.chromium.org/
- Add to PATH

### 3. Test the Bot

**Automatic mode:**
```bash
python3 backend/automation/yelp_signup_bot.py --mode automatic
```

**Manual mode:**
```bash
python3 backend/automation/yelp_signup_bot.py --mode manual --data '{"firstName":"John","lastName":"Smith","email":"john@example.com","password":"Pass123!","zipCode":"10001","birthday":"01/15/1990"}'
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

### Python not found
```bash
# Install Python 3
sudo apt-get install python3 python3-pip
```

### Selenium not found
```bash
pip3 install selenium
```

### ChromeDriver not found
- Make sure ChromeDriver is in your PATH
- Version must match your Chrome browser version

### Form fields not filling
- Check server console for Python output
- Look for "Form type detected: DIRECT" or "MODAL"
- Verify all fields show "✓ Field Name: value"

## Advantages of Python Bot

1. ✅ Uses **exact selectors** from your working Python code
2. ✅ Handles both **Modal and Direct** form scenarios
3. ✅ Properly fills **all fields** including lastName
4. ✅ More mature Selenium ecosystem
5. ✅ Easy to debug with console output
6. ✅ Can run headless or visible for debugging

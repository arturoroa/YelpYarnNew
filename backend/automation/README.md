# Yelp Signup Automation

Python-based Yelp signup automation using Selenium.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Chrome WebDriver:
   - Download ChromeDriver from https://chromedriver.chromium.org/
   - Or use: `brew install chromedriver` (macOS)
   - Or use: `apt-get install chromium-chromedriver` (Ubuntu)

## Usage

### Automatic Mode (Random Data)
```bash
python3 yelp_signup_bot.py --mode automatic
```

### Manual Mode (Provided Data)
```bash
python3 yelp_signup_bot.py --mode manual --data '{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"Test123!","zipCode":"10001","birthday":"01/15/1990"}'
```

### Options
- `--headless` : Run in headless mode (no visible browser)
- `--timeout SECONDS` : Set timeout (default: 30 seconds)

## API Integration

The Node.js backend automatically calls this Python script via the following endpoints:
- `/api/users/create-automated` - Automatic mode
- `/api/users/create-with-data` - Manual mode

## Output

The script outputs JSON with the following structure:
```json
{
  "success": true,
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "Test123!",
    "zipCode": "10001",
    "birthday": "01/15/1990",
    "init_time": 1234567890000,
    "last_time": 1234567895000
  }
}
```

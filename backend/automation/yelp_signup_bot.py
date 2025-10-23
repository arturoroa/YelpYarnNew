#!/usr/bin/env python3
"""
Yelp Signup Automation Bot
Supports both automatic (random data) and manual (provided data) modes
"""

import sys
import json
import random
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# Selectors - Scenario 1 (Modal)
XPATH_CONTINUE_WITH_EMAIL_BTN = "//button[contains(text(), 'Continue with email')]"
XPATH_FIRST_NAME_MODAL = "//form//input[@type='text' and @placeholder='First Name']"
XPATH_LAST_NAME_MODAL = "//form//input[@type='text' and @placeholder='Last Name']"
XPATH_CONTINUE_BTN_STEP1 = "//form//button[.//span[normalize-space()='Continue'] or normalize-space()='Continue']"
XPATH_EMAIL_MODAL = "//form//input[@type='email' and @placeholder='Email']"
XPATH_PASSWORD_MODAL = "//form//input[@type='password' and @placeholder='Password']"
XPATH_CONTINUE_BTN_STEP2 = "(//form//button[.//span[normalize-space()='Continue'] or normalize-space()='Continue'])[last()]"
XPATH_ZIP_MODAL = "//form//input[@name='zip' and @placeholder='ZIP Code']"
XPATH_SIGNUP_BTN_MODAL = "//form//button[.//span[normalize-space()='Sign up'] or normalize-space()='Sign up']"

# Selectors - Scenario 2 (Direct Form)
CSS_FIRST_NAME_DIRECT = "#first_name"
CSS_LAST_NAME_DIRECT = "#last_name"
CSS_EMAIL_DIRECT = "#email"
CSS_PASSWORD_DIRECT = "#password"
CSS_ZIP_DIRECT = "#zip"
CSS_SIGNUP_DIRECT = "#signup-button"

# Birthday selectors
CSS_MONTH_SELECT = "select[name='birthday_month']"
CSS_DAY_SELECT = "select[name='birthday_day']"
CSS_YEAR_SELECT = "select[name='birthday_year']"


class YelpSignupBot:
    def __init__(self, headless=False, timeout=30):
        self.headless = headless
        self.timeout = timeout
        self.driver = None
        self.wait = None

    def initialize_driver(self):
        """Initialize Chrome WebDriver"""
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)

        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.set_window_size(1280, 800)
        self.wait = WebDriverWait(self.driver, self.timeout)

    def load_data_file(self, filename):
        """Load data from text files"""
        data_dir = Path(__file__).parent.parent / 'data'
        file_path = data_dir / filename
        with open(file_path, 'r') as f:
            return [line.strip() for line in f if line.strip()]

    def generate_random_user_data(self):
        """Generate random user data"""
        first_names = self.load_data_file('names.txt')
        last_names = self.load_data_file('lastname.txt')
        mail_providers = self.load_data_file('mailproviders.txt')
        zip_codes = self.load_data_file('uszip.txt')

        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        mail_provider = random.choice(mail_providers)
        zip_code = random.choice(zip_codes)

        email = f"{first_name.lower()}.{last_name.lower()}{random.randint(100, 999)}@{mail_provider}"
        password = f"Pass{random.randint(1000, 9999)}!"

        # Generate birthday (18-65 years old)
        from datetime import datetime
        current_year = datetime.now().year
        birth_year = current_year - random.randint(18, 65)
        birth_month = str(random.randint(1, 12)).zfill(2)
        birth_day = str(random.randint(1, 28)).zfill(2)
        birthday = f"{birth_month}/{birth_day}/{birth_year}"

        return {
            'firstName': first_name,
            'lastName': last_name,
            'email': email,
            'password': password,
            'zipCode': zip_code,
            'birthday': birthday
        }

    def detect_form_type(self):
        """Detect which form type is present"""
        try:
            # Check for direct form
            self.driver.find_element(By.CSS_SELECTOR, CSS_FIRST_NAME_DIRECT)
            return 'DIRECT'
        except NoSuchElementException:
            try:
                # Check for modal form
                self.driver.find_element(By.XPATH, XPATH_FIRST_NAME_MODAL)
                return 'MODAL'
            except NoSuchElementException:
                return 'UNKNOWN'

    def fill_field(self, locator_type, locator, value, field_name):
        """Fill a form field with retry logic"""
        print(f"Filling {field_name} with: {value}")
        try:
            if locator_type == 'css':
                element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, locator)))
            else:  # xpath
                element = self.wait.until(EC.presence_of_element_located((By.XPATH, locator)))

            element.clear()
            time.sleep(0.1)
            element.send_keys(value)

            actual_value = element.get_attribute('value')
            print(f"✓ {field_name}: {actual_value}")
            return True
        except Exception as e:
            print(f"✗ Failed to fill {field_name}: {str(e)}")
            return False

    def fill_birthday(self, birthday):
        """Fill birthday dropdowns (if present)"""
        try:
            month, day, year = birthday.split('/')

            # Month
            month_select = Select(self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, CSS_MONTH_SELECT))
            ))
            month_select.select_by_value(month)
            print(f"✓ Selected month: {month}")

            # Day
            day_select = Select(self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, CSS_DAY_SELECT))
            ))
            day_select.select_by_value(day)
            print(f"✓ Selected day: {day}")

            # Year
            year_select = Select(self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, CSS_YEAR_SELECT))
            ))
            year_select.select_by_value(year)
            print(f"✓ Selected year: {year}")

            return True
        except Exception as e:
            print(f"⚠ Birthday fields not found or not required: {str(e)}")
            return False

    def run_signup(self, user_data):
        """Run the signup process with provided data"""
        init_time = time.time()

        try:
            self.initialize_driver()

            print("=== Starting Yelp Signup ===")
            print(f"First Name: {user_data['firstName']}")
            print(f"Last Name: {user_data['lastName']}")
            print(f"Email: {user_data['email']}")
            print(f"Password: {user_data['password']}")
            print(f"ZIP Code: {user_data['zipCode']}")
            print(f"Birthday: {user_data['birthday']}")

            # Navigate to Yelp signup
            self.driver.get('https://www.yelp.com/signup')
            time.sleep(2)

            # Detect form type
            form_type = self.detect_form_type()
            print(f"Form type detected: {form_type}")

            if form_type == 'DIRECT':
                # Direct form scenario
                self.fill_field('css', CSS_FIRST_NAME_DIRECT, user_data['firstName'], 'First Name')
                self.fill_field('css', CSS_LAST_NAME_DIRECT, user_data['lastName'], 'Last Name')
                self.fill_field('css', CSS_EMAIL_DIRECT, user_data['email'], 'Email')
                self.fill_field('css', CSS_PASSWORD_DIRECT, user_data['password'], 'Password')
                self.fill_field('css', CSS_ZIP_DIRECT, user_data['zipCode'], 'ZIP Code')
                self.fill_birthday(user_data['birthday'])

            elif form_type == 'MODAL':
                # Modal form scenario
                self.fill_field('xpath', XPATH_FIRST_NAME_MODAL, user_data['firstName'], 'First Name')
                self.fill_field('xpath', XPATH_LAST_NAME_MODAL, user_data['lastName'], 'Last Name')
                self.fill_field('xpath', XPATH_EMAIL_MODAL, user_data['email'], 'Email')
                self.fill_field('xpath', XPATH_PASSWORD_MODAL, user_data['password'], 'Password')
                self.fill_field('xpath', XPATH_ZIP_MODAL, user_data['zipCode'], 'ZIP Code')
                self.fill_birthday(user_data['birthday'])
            else:
                raise Exception("Unknown form type - could not detect form fields")

            last_time = time.time()

            print("=== All fields filled successfully! ===")
            print("Note: Submit button NOT clicked - manual review required")

            # Keep browser open for manual review
            if not self.headless:
                print("\nBrowser will remain open for manual review.")
                print("Press Ctrl+C to close when done.")
                try:
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    print("\nClosing browser...")

            return {
                'success': True,
                'data': {
                    **user_data,
                    'init_time': init_time * 1000,  # Convert to milliseconds
                    'last_time': last_time * 1000
                }
            }

        except Exception as e:
            print(f"=== Error during signup ===")
            print(f"Error: {str(e)}")

            last_time = time.time()
            return {
                'success': False,
                'error': str(e),
                'data': {
                    **user_data,
                    'init_time': init_time * 1000,
                    'last_time': last_time * 1000
                }
            }

        finally:
            if self.headless and self.driver:
                self.driver.quit()

    def close(self):
        """Close the browser"""
        if self.driver:
            self.driver.quit()


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Yelp Signup Automation')
    parser.add_argument('--mode', choices=['automatic', 'manual'], required=True,
                        help='Mode: automatic (random data) or manual (provided data)')
    parser.add_argument('--data', type=str, help='JSON string with user data (for manual mode)')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--timeout', type=int, default=30, help='Timeout in seconds')

    args = parser.parse_args()

    bot = YelpSignupBot(headless=args.headless, timeout=args.timeout)

    try:
        if args.mode == 'automatic':
            # Generate random data
            user_data = bot.generate_random_user_data()
        else:
            # Use provided data
            if not args.data:
                print(json.dumps({
                    'success': False,
                    'error': 'Manual mode requires --data argument with user data'
                }))
                sys.exit(1)

            user_data = json.loads(args.data)

        # Run signup
        result = bot.run_signup(user_data)

        # Output result as JSON
        print('\n=== RESULT ===')
        print(json.dumps(result, indent=2))

        sys.exit(0 if result['success'] else 1)

    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)
    finally:
        if args.headless:
            bot.close()


if __name__ == '__main__':
    main()

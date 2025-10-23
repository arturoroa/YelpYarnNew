import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class YelpSignupAutomation {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 30000;
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  readDataFile(filename) {
    const filePath = path.join(__dirname, '../data', filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').filter(line => line.trim());
  }

  generateUserData() {
    const firstNames = this.readDataFile('names.txt');
    const lastNames = this.readDataFile('lastname.txt');
    const mailProviders = this.readDataFile('mailproviders.txt');
    const zipCodes = this.readDataFile('uszip.txt');

    const firstName = this.getRandomElement(firstNames);
    const lastName = this.getRandomElement(lastNames);
    const mailProvider = this.getRandomElement(mailProviders);
    const zipCode = this.getRandomElement(zipCodes);

    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@${mailProvider}`;
    const password = `Pass${Math.floor(Math.random() * 10000)}!`;

    const currentYear = new Date().getFullYear();
    const minAge = 18;
    const maxAge = 65;
    const birthYear = currentYear - minAge - Math.floor(Math.random() * (maxAge - minAge));
    const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const birthday = `${birthMonth}/${birthDay}/${birthYear}`;

    return {
      firstName,
      lastName,
      email,
      password,
      zipCode,
      birthday,
      init_time: Date.now()
    };
  }

  async runSignupFlowWithData(userData) {
    try {
      await this.initialize();
      userData.init_time = userData.init_time || Date.now();

      console.log('=== Starting Yelp Signup with User Data ===');
      console.log('First Name:', userData.firstName);
      console.log('Last Name:', userData.lastName);
      console.log('Email:', userData.email);
      console.log('Password:', userData.password);
      console.log('ZIP Code:', userData.zipCode);
      console.log('Birthday:', userData.birthday);

      await this.page.goto('https://www.yelp.com/signup', {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      // Wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('=== Detecting form type (Modal vs Direct) ===');

      // Check which scenario we're in
      const formType = await this.page.evaluate(() => {
        const hasDirectForm = document.querySelector('#first_name') !== null;
        const hasModalForm = document.querySelector("input[placeholder='First Name']") !== null;
        return {
          isDirect: hasDirectForm,
          isModal: hasModalForm,
          type: hasDirectForm ? 'DIRECT' : (hasModalForm ? 'MODAL' : 'UNKNOWN')
        };
      });

      console.log('Form type detected:', formType.type);

      // Helper function to fill a field with multiple selector attempts
      const fillField = async (selectors, value, fieldName) => {
        console.log(`Filling ${fieldName} with value: "${value}"`);

        for (const selector of selectors) {
          try {
            await this.page.waitForSelector(selector, { timeout: 3000 });

            // Clear and fill
            await this.page.evaluate((sel) => {
              const field = document.querySelector(sel);
              if (field) {
                field.focus();
                field.value = '';
              }
            }, selector);

            await new Promise(resolve => setTimeout(resolve, 100));
            await this.page.type(selector, value, { delay: 50 });

            // Verify
            const actualValue = await this.page.evaluate((sel) => {
              return document.querySelector(sel)?.value || '';
            }, selector);

            console.log(`✓ ${fieldName}: "${actualValue}" (using ${selector})`);
            return actualValue;
          } catch (err) {
            console.log(`  ⚠ Selector "${selector}" not found, trying next...`);
          }
        }

        throw new Error(`Could not fill ${fieldName} - no valid selector found`);
      };

      // Define selectors for both scenarios (Direct form first, then Modal, then fallback)
      const selectors = {
        firstName: [
          '#first_name',
          "input[placeholder='First Name']",
          'input[name="first_name"]'
        ],
        lastName: [
          '#last_name',
          "input[placeholder='Last Name']",
          'input[name="last_name"]'
        ],
        email: [
          '#email',
          "input[type='email'][placeholder='Email']",
          'input[name="email"]'
        ],
        password: [
          '#password',
          "input[type='password'][placeholder='Password']",
          'input[name="password"]'
        ],
        zipCode: [
          '#zip',
          "input[name='zip'][placeholder='ZIP Code']",
          'input[name="zip_code"]'
        ]
      };

      // Fill all fields
      await fillField(selectors.firstName, userData.firstName, 'First Name');
      await fillField(selectors.lastName, userData.lastName, 'Last Name');
      await fillField(selectors.email, userData.email, 'Email');
      await fillField(selectors.password, userData.password, 'Password');
      await fillField(selectors.zipCode, userData.zipCode, 'ZIP Code');

      // Handle birthday - check if dropdowns exist
      console.log('Checking for birthday fields...');
      const hasBirthdayDropdowns = await this.page.evaluate(() => {
        return document.querySelector('select[name="birthday_month"]') !== null;
      });

      if (hasBirthdayDropdowns) {
        console.log('Filling birthday dropdowns...');
        const [month, day, year] = userData.birthday.split('/');

        await this.page.select('select[name="birthday_month"]', month);
        console.log('✓ Selected month:', month);

        await this.page.select('select[name="birthday_day"]', day);
        console.log('✓ Selected day:', day);

        await this.page.select('select[name="birthday_year"]', year);
        console.log('✓ Selected year:', year);
      } else {
        console.log('⚠ No birthday dropdowns found (may not be required in this form)');
      }

      console.log('=== All fields filled! Check the browser to verify. ===');
      console.log('Note: Submit button NOT clicked - manual review required');

      const lastTime = Date.now();
      userData.last_time = lastTime;

      return {
        success: true,
        data: userData
      };
    } catch (error) {
      console.error('=== Error during signup automation ===');
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
      const lastTime = Date.now();

      return {
        success: false,
        error: error.message,
        data: userData ? { ...userData, last_time: lastTime } : null
      };
    }
  }

  async runSignupFlow() {
    const initTime = Date.now();
    let userData = null;

    try {
      await this.initialize();
      userData = this.generateUserData();

      console.log('Generated user data:', {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      });

      await this.page.goto('https://www.yelp.com/signup', {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      await this.page.waitForSelector('input[name="first_name"]', { timeout: 5000 });
      await this.page.type('input[name="first_name"]', userData.firstName, { delay: 50 });

      await this.page.waitForSelector('input[name="last_name"]', { timeout: 5000 });
      await this.page.type('input[name="last_name"]', userData.lastName, { delay: 50 });

      await this.page.waitForSelector('input[name="email"]', { timeout: 5000 });
      await this.page.type('input[name="email"]', userData.email, { delay: 50 });

      await this.page.waitForSelector('input[name="password"]', { timeout: 5000 });
      await this.page.type('input[name="password"]', userData.password, { delay: 50 });

      await this.page.waitForSelector('input[name="zip_code"]', { timeout: 5000 });
      await this.page.type('input[name="zip_code"]', userData.zipCode, { delay: 50 });

      await this.page.waitForSelector('select[name="birthday_month"]', { timeout: 5000 });
      const [month, day, year] = userData.birthday.split('/');
      await this.page.select('select[name="birthday_month"]', month);
      await this.page.select('select[name="birthday_day"]', day);
      await this.page.select('select[name="birthday_year"]', year);

      const submitButton = await this.page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      }

      const lastTime = Date.now();
      userData.last_time = lastTime;

      return {
        success: true,
        data: userData
      };
    } catch (error) {
      console.error('Error during signup automation:', error);
      const lastTime = Date.now();

      return {
        success: false,
        error: error.message,
        data: userData ? { ...userData, last_time: lastTime } : null
      };
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  getBrowser() {
    return this.browser;
  }

  getPage() {
    return this.page;
  }
}

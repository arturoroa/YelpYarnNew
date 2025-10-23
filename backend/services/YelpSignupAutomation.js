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

      // Wait a bit for page to fully load
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Waiting for first_name field...');
      await this.page.waitForSelector('input[name="first_name"]', { timeout: 10000 });
      const firstNameField = await this.page.$('input[name="first_name"]');
      await firstNameField.click({ clickCount: 3 });
      await firstNameField.type(userData.firstName, { delay: 50 });
      const fn = await firstNameField.evaluate(el => el.value);
      console.log('✓ Filled first_name:', fn);

      console.log('Waiting for last_name field...');
      await this.page.waitForSelector('input[name="last_name"]', { timeout: 10000 });
      const lastNameField = await this.page.$('input[name="last_name"]');
      await lastNameField.click({ clickCount: 3 });
      await lastNameField.type(userData.lastName, { delay: 50 });
      const ln = await lastNameField.evaluate(el => el.value);
      console.log('✓ Filled last_name:', ln);

      console.log('Waiting for email field...');
      await this.page.waitForSelector('input[name="email"]', { timeout: 10000 });
      const emailField = await this.page.$('input[name="email"]');
      await emailField.click({ clickCount: 3 });
      await emailField.type(userData.email, { delay: 50 });
      const em = await emailField.evaluate(el => el.value);
      console.log('✓ Filled email:', em);

      console.log('Waiting for password field...');
      await this.page.waitForSelector('input[name="password"]', { timeout: 10000 });
      const passwordField = await this.page.$('input[name="password"]');
      await passwordField.click({ clickCount: 3 });
      await passwordField.type(userData.password, { delay: 50 });
      console.log('✓ Filled password (hidden)');

      console.log('Waiting for zip_code field...');
      await this.page.waitForSelector('input[name="zip_code"]', { timeout: 10000 });
      const zipField = await this.page.$('input[name="zip_code"]');
      await zipField.click({ clickCount: 3 });
      await zipField.type(userData.zipCode, { delay: 50 });
      const zp = await zipField.evaluate(el => el.value);
      console.log('✓ Filled zip_code:', zp);

      console.log('Waiting for birthday fields...');
      await this.page.waitForSelector('select[name="birthday_month"]', { timeout: 10000 });
      const [month, day, year] = userData.birthday.split('/');
      await this.page.select('select[name="birthday_month"]', month);
      console.log('✓ Selected month:', month);
      await this.page.select('select[name="birthday_day"]', day);
      console.log('✓ Selected day:', day);
      await this.page.select('select[name="birthday_year"]', year);
      console.log('✓ Selected year:', year);

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

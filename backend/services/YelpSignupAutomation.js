import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

class YelpSignupAutomation {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 30000;
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--start-maximized'
      ]
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  getBrowser() {
    return this.browser;
  }

  getPage() {
    return this.page;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  loadDataFile(filename) {
    try {
      const filePath = join(projectRoot, 'backend', 'data', filename);
      const content = readFileSync(filePath, 'utf8');
      return content.split('\n').filter(line => line.trim());
    } catch (error) {
      console.error(`Failed to load ${filename}:`, error);
      return [];
    }
  }

  generateUserData() {
    const firstNames = this.loadDataFile('names.txt');
    const lastNames = this.loadDataFile('lastname.txt');
    const mailProviders = this.loadDataFile('mailproviders.txt');
    const zipCodes = this.loadDataFile('uszip.txt');

    const firstName = this.getRandomElement(firstNames) || 'John';
    const lastName = this.getRandomElement(lastNames) || 'Doe';
    const mailProvider = this.getRandomElement(mailProviders) || 'gmail.com';
    const zipCode = this.getRandomElement(zipCodes) || '10001';

    const timestamp = Date.now();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@${mailProvider}`;
    const password = `Pass${timestamp}!`;

    const year = 1980 + Math.floor(Math.random() * 30);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const birthday = `${month}/${day}/${year}`;

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
}

export default YelpSignupAutomation;

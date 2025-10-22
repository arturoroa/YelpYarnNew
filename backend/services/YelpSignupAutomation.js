import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_SIGNUP_URL = "https://www.yelp.com/signup";

// Selectors
const CSS_HAMBURGER_BUTTON = "button[aria-label='Menu']";
const XPATH_CONTINUE_WITH_EMAIL = "//button[.//span[normalize-space()='Continue with email'] or normalize-space()='Continue with email']";

// Modal flow selectors
const XPATH_FIRST_NAME_MODAL = "//form//input[@type='text' and @placeholder='First Name']";
const XPATH_LAST_NAME_MODAL = "//form//input[@type='text' and @placeholder='Last Name']";
const XPATH_CONTINUE_BTN_STEP1 = "//form//button[.//span[normalize-space()='Continue'] or normalize-space()='Continue']";
const XPATH_EMAIL_MODAL = "//form//input[@type='email' and @placeholder='Email']";
const XPATH_PASSWORD_MODAL = "//form//input[@type='password' and @placeholder='Password']";
const XPATH_CONTINUE_BTN_STEP2 = "(//form//button[.//span[normalize-space()='Continue'] or normalize-space()='Continue'])[last()]";
const XPATH_ZIP_MODAL = "//form//input[@name='zip' and @placeholder='ZIP Code']";
const XPATH_SIGNUP_BTN_MODAL = "//form//button[.//span[normalize-space()='Sign up'] or normalize-space()='Sign up']";

// Direct form selectors
const CSS_FIRST_NAME_DIRECT = "#first_name";
const CSS_LAST_NAME_DIRECT = "#last_name";
const CSS_EMAIL_DIRECT = "#email";
const CSS_PASSWORD_DIRECT = "#password";
const CSS_ZIP_DIRECT = "#zip";
const CSS_SIGNUP_DIRECT = "#signup-button";

// Captcha
const CSS_CAPTCHA_CHECKBOX = "#checkbox";

// Personalize (post-signup)
const CSS_INPUT_PHONE_PERS = "#input-personalize-phone";
const CSS_GENDER_FEMALE_PERS = "#input-personalize-gender-female";
const CSS_GENDER_MALE_PERS = "#input-personalize-gender-male";
const XPATH_SAVE_CONTINUE_PERS = "//button[.//span[normalize-space()='Save & continue'] or normalize-space()='Save & continue']";

// Timing constants
const TYPING_MIN = 50;
const TYPING_MAX = 300;
const ACTION_MIN = 400;
const ACTION_MAX = 1200;
const POST_SIGNUP_STABILIZATION_MS = 20000;

// Mobile User Agents
const USER_AGENTS_MOBILE = [
  "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.70 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.109 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.85 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
];

const WINDOW_SIZES_MOBILE = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
];

const DEVICE_PIXEL_RATIOS = [2.0, 2.5, 2.625, 2.75, 3.0];

class YelpSignupAutomation {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 30000;
    this.browser = null;
    this.page = null;

    // Data files paths
    const dataDir = path.join(__dirname, '../../data');
    this.namesFile = path.join(dataDir, 'names.txt');
    this.lastnamesFile = path.join(dataDir, 'lastname.txt');
    this.zipsFile = path.join(dataDir, 'uszip.txt');
    this.mailProvidersFile = path.join(dataDir, 'mailproviders.txt');
  }

  async init() {
    const userAgent = this.randomChoice(USER_AGENTS_MOBILE);
    const viewport = this.randomChoice(WINDOW_SIZES_MOBILE);
    const deviceScaleFactor = this.randomChoice(DEVICE_PIXEL_RATIOS);

    this.browser = await puppeteer.launch({
      headless: this.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        `--window-size=${viewport.width},${viewport.height}`,
      ],
      defaultViewport: {
        ...viewport,
        deviceScaleFactor,
        isMobile: true,
        hasTouch: true,
      },
    });

    this.page = await this.browser.newPage();

    await this.page.setUserAgent(userAgent);

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    await this.page.setDefaultTimeout(this.timeout);
  }

  randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async sleep(min, max) {
    const ms = this.randomInt(min, max);
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  readRandomLine(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error(`Empty file: ${filePath}`);
    return this.randomChoice(lines).trim();
  }

  slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  generatePassword(minLen = 12, maxLen = 16) {
    const symbols = "!@#$%^&*()-_=+[]{};:,.?/|";
    const length = this.randomInt(minLen, maxLen);

    const required = [
      String.fromCharCode(this.randomInt(65, 90)), // uppercase
      String.fromCharCode(this.randomInt(97, 122)), // lowercase
      String.fromCharCode(this.randomInt(48, 57)), // digit
      symbols[this.randomInt(0, symbols.length - 1)], // symbol
    ];

    const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' + symbols;
    const remaining = Array.from({ length: Math.max(0, length - required.length) },
      () => allChars[this.randomInt(0, allChars.length - 1)]);

    const password = [...required, ...remaining];
    for (let i = password.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
  }

  composeEmail(firstName, lastName) {
    const user = this.slugify(firstName) || 'user';
    const dom = this.slugify(lastName) || 'domain';
    const digits = Math.random() < 0.6 ? String(this.randomInt(11, 989)) : '';

    const localPart = Math.random() < 0.5
      ? `${user}${digits}${dom.charAt(0)}`
      : `${user}${dom}${digits}`;

    const provider = this.readRandomLine(this.mailProvidersFile).replace('@', '');
    return `${localPart}@${provider}`;
  }

  randomUSPhone() {
    const area = this.randomInt(201, 989);
    const prefix = this.randomInt(200, 999);
    const line = this.randomInt(1000, 9999);
    return `${String(area).padStart(3, '0')}-${String(prefix).padStart(3, '0')}-${String(line).padStart(4, '0')}`;
  }

  nowMillis() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').replace('Z', '');
  }

  async typeHuman(element, text) {
    for (const char of text) {
      await element.type(char, { delay: this.randomInt(TYPING_MIN, TYPING_MAX) });
    }
  }

  async clickElement(selector, isXPath = false) {
    try {
      if (isXPath) {
        await this.page.waitForXPath(selector, { timeout: 5000 });
        const elements = await this.page.$x(selector);
        if (elements.length > 0) {
          await elements[0].click();
          return true;
        }
      } else {
        await this.page.waitForSelector(selector, { visible: true, timeout: 5000 });
        await this.page.click(selector);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  async retryNavigateToSignup(maxSeconds = 300) {
    const deadline = Date.now() + maxSeconds * 1000;
    let attempt = 0;

    while (Date.now() < deadline) {
      try {
        await this.page.goto(TARGET_SIGNUP_URL, { waitUntil: 'networkidle2', timeout: 15000 });

        if (this.page.url() === TARGET_SIGNUP_URL) {
          await this.sleep(800, 1200);
          return true;
        }
      } catch (error) {
        console.log(`Navigation attempt ${attempt + 1} failed, retrying...`);
      }

      attempt++;
      await this.sleep(1200 * Math.min(6, 1 + attempt * 0.5), 2000 * Math.min(6, 1 + attempt * 0.5));
    }

    throw new Error('Failed to navigate to signup page');
  }

  async waitForCheckboxResolution(maxWaitSeconds = 240) {
    const start = Date.now();

    while (Date.now() - start < maxWaitSeconds * 1000) {
      try {
        const checkbox = await this.page.$(CSS_CAPTCHA_CHECKBOX);
        if (checkbox) {
          const ariaChecked = await checkbox.evaluate(el => el.getAttribute('aria-checked'));
          if (ariaChecked === 'true') {
            return true;
          }
        } else {
          return false;
        }
      } catch (error) {
        // Continue waiting
      }

      await this.sleep(1000, 1500);
    }

    return false;
  }

  async tryHamburgerToContinueEmail() {
    try {
      const hamburgerClicked = await this.clickElement(CSS_HAMBURGER_BUTTON);
      if (!hamburgerClicked) return false;

      await this.sleep(800, 1200);

      const continueClicked = await this.clickElement(XPATH_CONTINUE_WITH_EMAIL, true);
      if (!continueClicked) return false;

      await this.sleep(800, 1200);
      return true;
    } catch (error) {
      return false;
    }
  }

  async tryModalFlow(firstName, lastName, email, password, zipcode) {
    try {
      let continueClicked = await this.clickElement(XPATH_CONTINUE_WITH_EMAIL, true);

      if (!continueClicked) {
        const hamburgerOpened = await this.tryHamburgerToContinueEmail();
        if (!hamburgerOpened) return { success: false };
      }

      await this.sleep(600, 900);

      const firstNameElements = await this.page.$x(XPATH_FIRST_NAME_MODAL);
      if (firstNameElements.length === 0) return { success: false };
      await this.typeHuman(firstNameElements[0], firstName);
      await this.sleep(400, 600);

      const lastNameElements = await this.page.$x(XPATH_LAST_NAME_MODAL);
      await this.typeHuman(lastNameElements[0], lastName);
      await this.sleep(400, 600);

      await this.clickElement(XPATH_CONTINUE_BTN_STEP1, true);
      await this.sleep(600, 900);

      const emailElements = await this.page.$x(XPATH_EMAIL_MODAL);
      await this.typeHuman(emailElements[0], email);
      await this.sleep(400, 600);

      const passwordElements = await this.page.$x(XPATH_PASSWORD_MODAL);
      await this.typeHuman(passwordElements[0], password);
      await this.sleep(400, 600);

      await this.clickElement(XPATH_CONTINUE_BTN_STEP2, true);
      await this.sleep(600, 900);

      const zipElements = await this.page.$x(XPATH_ZIP_MODAL);
      await this.typeZipRobust(zipElements[0], zipcode);
      await this.sleep(500, 700);

      const signupTime = this.nowMillis();

      await this.clickElement(XPATH_SIGNUP_BTN_MODAL, true);
      await this.sleep(800, 1200);

      await this.waitForCheckboxResolution(240);
      await this.sleep(POST_SIGNUP_STABILIZATION_MS, POST_SIGNUP_STABILIZATION_MS + 2000);

      await this.maybePersonalizePhone();

      return { success: true, timestamp: signupTime };
    } catch (error) {
      console.error('Modal flow error:', error.message);
      return { success: false };
    }
  }

  async tryDirectFlow(firstName, lastName, email, password, zipcode) {
    try {
      await this.page.waitForSelector(CSS_FIRST_NAME_DIRECT, { visible: true, timeout: 4000 });

      await this.page.type(CSS_FIRST_NAME_DIRECT, firstName, { delay: this.randomInt(TYPING_MIN, TYPING_MAX) });
      await this.sleep(400, 600);

      await this.page.type(CSS_LAST_NAME_DIRECT, lastName, { delay: this.randomInt(TYPING_MIN, TYPING_MAX) });
      await this.sleep(400, 600);

      await this.page.type(CSS_EMAIL_DIRECT, email, { delay: this.randomInt(TYPING_MIN, TYPING_MAX) });
      await this.sleep(400, 600);

      await this.page.type(CSS_PASSWORD_DIRECT, password, { delay: this.randomInt(TYPING_MIN, TYPING_MAX) });
      await this.sleep(400, 600);

      const zipEl = await this.page.$(CSS_ZIP_DIRECT);
      await this.typeZipRobust(zipEl, zipcode);
      await this.sleep(500, 700);

      const signupTime = this.nowMillis();

      await this.page.click(CSS_SIGNUP_DIRECT);
      await this.sleep(800, 1200);

      await this.waitForCheckboxResolution(240);
      await this.sleep(POST_SIGNUP_STABILIZATION_MS, POST_SIGNUP_STABILIZATION_MS + 2000);

      await this.maybePersonalizePhone();

      return { success: true, timestamp: signupTime };
    } catch (error) {
      console.error('Direct flow error:', error.message);
      return { success: false };
    }
  }

  async typeZipRobust(element, zipcode) {
    try {
      await element.click({ clickCount: 3 });
      await element.press('Backspace');
    } catch (error) {
      // Continue
    }

    for (const char of zipcode) {
      await element.type(char, { delay: this.randomInt(TYPING_MIN, TYPING_MAX) });
    }
  }

  async maybePersonalizePhone() {
    try {
      const phoneInput = await this.page.$(CSS_INPUT_PHONE_PERS);
      if (phoneInput) {
        const phone = this.randomUSPhone();
        await this.typeHuman(phoneInput, phone);
        await this.sleep(400, 600);

        const chooseFemale = Math.random() < 0.5;
        const genderSelector = chooseFemale ? CSS_GENDER_FEMALE_PERS : CSS_GENDER_MALE_PERS;

        const genderEl = await this.page.$(genderSelector);
        if (genderEl) {
          await genderEl.click();
          await this.sleep(400, 600);
        }

        await this.clickElement(XPATH_SAVE_CONTINUE_PERS, true);
        await this.sleep(600, 900);
      }
    } catch (error) {
      // Continue - personalize is optional
    }
  }

  async runSignupFlow() {
    const initTime = this.nowMillis();
    let email, password;

    try {
      await this.init();

      const firstName = this.readRandomLine(this.namesFile);
      const lastName = this.readRandomLine(this.lastnamesFile);
      const zipcode = this.readRandomLine(this.zipsFile);
      email = this.composeEmail(firstName, lastName);
      password = this.generatePassword();

      await this.retryNavigateToSignup();

      let result = await this.tryModalFlow(firstName, lastName, email, password, zipcode);

      if (!result.success) {
        result = await this.tryDirectFlow(firstName, lastName, email, password, zipcode);
      }

      const lastTime = result.timestamp || this.nowMillis();

      return {
        success: result.success,
        data: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          password: password,
          zip: zipcode,
          init_time: initTime,
          last_time: lastTime,
          activated: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {
          email: email || 'unknown',
          password: password || 'unknown',
          init_time: initTime,
          last_time: this.nowMillis(),
          activated: 0
        }
      };
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export default YelpSignupAutomation;

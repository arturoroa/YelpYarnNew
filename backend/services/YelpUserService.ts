import puppeteer, { Page } from 'puppeteer';
import { Logger } from '../utils/Logger.js';
import DatabaseManager, { GuvUser } from '../utils/DatabaseManager.js';
import crypto from 'crypto';

export interface YelpUserCreationResult {
  success: boolean;
  guv?: string;
  yelpUserId?: string;
  username?: string;
  email?: string;
  error?: string;
  details?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  environment: {
    yelpBaseUrl: string;
  };
}

export class YelpUserService {
  private static instance: YelpUserService;
  private logger = Logger.getInstance();
  private database = DatabaseManager.getInstance();

  private constructor() {}

  static getInstance(): YelpUserService {
    if (!YelpUserService.instance) {
      YelpUserService.instance = new YelpUserService();
    }
    return YelpUserService.instance;
  }

  async createYelpUser(request: CreateUserRequest): Promise<YelpUserCreationResult> {
    let browser;
    let page: Page;

    try {
      this.logger.info(`Creating Yelp user: ${request.username}`);

      // Check if user already exists in database
      const existingUser = await this.database.getGuvUserByUsername(request.username);
      if (existingUser) {
        return {
          success: false,
          error: 'User already exists',
          details: `Username ${request.username} is already registered with GUV: ${existingUser.guv}`
        };
      }

      // Launch browser for Yelp registration
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate to Yelp signup page
      const signupUrl = `${request.environment.yelpBaseUrl}/signup`;
      await page.goto(signupUrl, { waitUntil: 'networkidle2' });

      this.logger.info('Navigated to Yelp signup page');

      // Fill out registration form
      await this.fillRegistrationForm(page, request);

      // Submit form and handle response
      const registrationResult = await this.submitRegistrationForm(page);

      if (!registrationResult.success) {
        return {
          success: false,
          error: 'Yelp registration failed',
          details: registrationResult.error
        };
      }

      // Extract GUV from cookies or response
      const guv = await this.extractGUV(page);
      if (!guv) {
        return {
          success: false,
          error: 'Failed to extract GUV',
          details: 'Could not retrieve GUV from Yelp after registration'
        };
      }

      // Save user to database
      const passwordHash = crypto.createHash('sha256').update(request.password).digest('hex');
      
      const userId = await this.database.createGuvUser({
        guv,
        username: request.username,
        email: request.email,
        password_hash: passwordHash,
        yelp_user_id: registrationResult.yelpUserId,
        status: 'active'
      });

      this.logger.info(`Successfully created Yelp user: ${request.username} with GUV: ${guv}`);

      return {
        success: true,
        guv,
        yelpUserId: registrationResult.yelpUserId,
        username: request.username,
        email: request.email
      };

    } catch (error) {
      this.logger.error('Error creating Yelp user:', error);
      return {
        success: false,
        error: 'Registration process failed',
        details: error.message
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async fillRegistrationForm(page: Page, request: CreateUserRequest): Promise<void> {
    try {
      // Wait for form elements to load
      await page.waitForSelector('input[name="first_name"], #first_name', { timeout: 10000 });

      // Fill first name
      const firstNameSelector = 'input[name="first_name"], #first_name';
      await page.type(firstNameSelector, request.firstName || request.username);

      // Fill last name
      const lastNameSelector = 'input[name="last_name"], #last_name';
      await page.type(lastNameSelector, request.lastName || 'User');

      // Fill email
      const emailSelector = 'input[name="email"], #email';
      await page.type(emailSelector, request.email);

      // Fill password
      const passwordSelector = 'input[name="password"], #password';
      await page.type(passwordSelector, request.password);

      // Fill confirm password if present
      const confirmPasswordSelector = 'input[name="confirm_password"], #confirm_password';
      const confirmPasswordField = await page.$(confirmPasswordSelector);
      if (confirmPasswordField) {
        await page.type(confirmPasswordSelector, request.password);
      }

      this.logger.info('Registration form filled successfully');

    } catch (error) {
      throw new Error(`Failed to fill registration form: ${error.message}`);
    }
  }

  private async submitRegistrationForm(page: Page): Promise<{ success: boolean; error?: string; yelpUserId?: string }> {
    try {
      // Find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Sign Up")',
        '.signup-button',
        '#signup-submit'
      ];

      let submitButton = null;
      for (const selector of submitSelectors) {
        submitButton = await page.$(selector);
        if (submitButton) break;
      }

      if (!submitButton) {
        throw new Error('Could not find submit button');
      }

      // Click submit and wait for navigation
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        submitButton.click()
      ]);

      // Check for success indicators
      const currentUrl = page.url();
      
      // Check for error messages
      const errorSelectors = [
        '.error-message',
        '.alert-error',
        '.validation-error',
        '[data-testid="error"]'
      ];

      for (const selector of errorSelectors) {
        const errorElement = await page.$(selector);
        if (errorElement) {
          const errorText = await page.evaluate(el => el.textContent, errorElement);
          return {
            success: false,
            error: `Registration error: ${errorText}`
          };
        }
      }

      // Check if we're on a success page or logged in
      if (currentUrl.includes('/user') || currentUrl.includes('/profile') || currentUrl.includes('/home')) {
        // Try to extract user ID from page
        const yelpUserId = await this.extractYelpUserId(page);
        
        return {
          success: true,
          yelpUserId
        };
      }

      return {
        success: false,
        error: 'Registration may have failed - unexpected page after submission'
      };

    } catch (error) {
      return {
        success: false,
        error: `Form submission failed: ${error.message}`
      };
    }
  }

  private async extractGUV(page: Page): Promise<string | null> {
    try {
      // Method 1: Extract from cookies
      const cookies = await page.cookies();
      const guvCookie = cookies.find(cookie => 
        cookie.name.toLowerCase().includes('guv') || 
        cookie.name.toLowerCase().includes('user') ||
        cookie.name === 'yuv'
      );

      if (guvCookie) {
        this.logger.info(`Found GUV in cookie: ${guvCookie.name}`);
        return guvCookie.value;
      }

      // Method 2: Extract from localStorage
      const guvFromStorage = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.toLowerCase().includes('guv') || key.toLowerCase().includes('user')) {
            return localStorage.getItem(key);
          }
        }
        return null;
      });

      if (guvFromStorage) {
        this.logger.info('Found GUV in localStorage');
        return guvFromStorage;
      }

      // Method 3: Extract from page content or meta tags
      const guvFromMeta = await page.evaluate(() => {
        const metaTags = document.querySelectorAll('meta');
        for (const meta of Array.from(metaTags)) {
          if (meta.name && meta.name.toLowerCase().includes('user')) {
            return meta.content;
          }
        }
        return null;
      });

      if (guvFromMeta) {
        this.logger.info('Found GUV in meta tags');
        return guvFromMeta;
      }

      // Method 4: Generate fallback GUV based on timestamp and random
      const fallbackGuv = `guv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.logger.warn(`Could not extract GUV from Yelp, using fallback: ${fallbackGuv}`);
      return fallbackGuv;

    } catch (error) {
      this.logger.error('Error extracting GUV:', error);
      return null;
    }
  }

  private async extractYelpUserId(page: Page): Promise<string | undefined> {
    try {
      // Try to extract user ID from various sources
      const userId = await page.evaluate(() => {
        // Check for user ID in data attributes
        const userElements = document.querySelectorAll('[data-user-id], [data-userid]');
        if (userElements.length > 0) {
          return userElements[0].getAttribute('data-user-id') || userElements[0].getAttribute('data-userid');
        }

        // Check for user ID in script tags
        const scripts = document.querySelectorAll('script');
        for (const script of Array.from(scripts)) {
          const content = script.textContent || '';
          const userIdMatch = content.match(/user[_-]?id['":\s]*['"]?([a-zA-Z0-9_-]+)/i);
          if (userIdMatch) {
            return userIdMatch[1];
          }
        }

        return undefined;
      });

      return userId;
    } catch (error) {
      this.logger.warn('Could not extract Yelp user ID:', error);
      return undefined;
    }
  }

  async validateGuvUser(guv: string): Promise<{ valid: boolean; user?: GuvUser; error?: string }> {
    try {
      const user = await this.database.getGuvUser(guv);
      
      if (!user) {
        return {
          valid: false,
          error: 'GUV not found in database'
        };
      }

      if (user.status !== 'active') {
        return {
          valid: false,
          error: `User status is ${user.status}, not active`
        };
      }

      return {
        valid: true,
        user
      };

    } catch (error) {
      this.logger.error('Error validating GUV user:', error);
      return {
        valid: false,
        error: 'Database error during validation'
      };
    }
  }

  async generateNewGUV(): Promise<string> {
    // Generate a unique GUV
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `guv_${timestamp}_${random}`;
  }
}






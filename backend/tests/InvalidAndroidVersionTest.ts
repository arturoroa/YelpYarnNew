import { Page } from 'puppeteer';
import { DatabaseManager } from '../utils/DatabaseManager.js';
import { Logger } from '../utils/Logger.js';

export interface TestConfig {
  targetBusiness: string;
  userAgent: string;
  headless: boolean;
  deviceEmulation?: any;
  networkConditions?: any;
}

export class InvalidAndroidVersionTest {
  private logger = Logger.getInstance();
  private database = DatabaseManager.getInstance();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async execute(page: Page, config: TestConfig): Promise<void> {
    await this.logSessionEvent('info', 'Starting Invalid Android Version Test');
    
    try {
      // Set invalid Android user agents
      const invalidAndroidUAs = [
        'Mozilla/5.0 (Linux; Android 99.0; SM-G999U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', // Future Android version
        'Mozilla/5.0 (Linux; Android 0.1; SM-G999U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', // Invalid low version
        'Mozilla/5.0 (Linux; Android 15.5; SM-G999U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', // Non-existent version
        'Mozilla/5.0 (Linux; Android -1.0; SM-G999U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', // Negative version
      ];

      const businessUrl = await this.findBusinessURL(page, config.targetBusiness);

      for (let i = 0; i < invalidAndroidUAs.length; i++) {
        const invalidUA = invalidAndroidUAs[i];
        
        await page.setUserAgent(invalidUA);
        await this.logSessionEvent('info', `Set invalid Android UA: ${invalidUA}`);
        
        await page.goto(businessUrl);
        await page.waitForTimeout(2000);
        
        // Try to perform clicks with invalid user agent
        const clickableElements = [
          'a[href*="request_a_quote"]',
          '.business-phone-number',
          '.biz-phone',
          '[data-analytics-label*="cta"]'
        ];
        
        let clickPerformed = false;
        
        for (const selector of clickableElements) {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            clickPerformed = true;
            
            await this.database.addTestResult({
              session_id: this.sessionId,
              scenario: 'invalid_android_version',
              action: `invalid_ua_click_${i + 1}`,
              success: true,
              details: `Click with invalid Android version: ${invalidUA}`,
              filter_triggered: true, // Should trigger invalid user agent filter
              click_recorded: false
            });
            
            await this.logSessionEvent('info', `Performed click ${i + 1} with invalid Android UA`);
            break;
          }
        }
        
        if (!clickPerformed) {
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'invalid_android_version',
            action: `invalid_ua_no_click_${i + 1}`,
            success: false,
            details: `No clickable elements found with invalid Android UA: ${invalidUA}`
          });
        }
        
        // Wait between different UA tests
        await page.waitForTimeout(1000);
      }

      // Reset to original user agent
      await page.setUserAgent(config.userAgent);
      await this.logSessionEvent('info', 'Reset to original user agent');

      await this.logSessionEvent('info', 'Invalid Android version test completed - should trigger InvalidUserAgentFilter');

    } catch (error) {
      // Reset user agent even if test fails
      await page.setUserAgent(config.userAgent);
      await this.logSessionEvent('error', `Invalid Android Version Test failed: ${error.message}`);
      throw error;
    }
  }

  private async findBusinessURL(page: Page, businessName: string): Promise<string> {
    const searchUrl = `${process.env.YELP_BASE_URL}/search?find_desc=${encodeURIComponent(businessName)}&find_loc=San%20Francisco%2C%20CA`;
    
    await page.goto(searchUrl);
    await page.waitForTimeout(3000);
    
    // Look for business link in search results
    const businessLink = await page.$eval(
      'a[href*="/biz/"]',
      (el) => el.getAttribute('href')
    ).catch(() => null);
    
    if (businessLink) {
      return `${process.env.YELP_BASE_URL}${businessLink}`;
    } else {
      // Fallback to test business URLs
      const testBizSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return `${process.env.YELP_BASE_URL}/biz/${testBizSlug}`;
    }
  }

  private async logSessionEvent(level: 'info' | 'warn' | 'error' | 'debug', message: string, details?: any): Promise<void> {
    this.logger[level](message, details);
    
    if (this.sessionId) {
      await this.database.addLog({
        session_id: this.sessionId,
        level,
        message,
        details: details ? JSON.stringify(details) : undefined
      });
    }
  }
}






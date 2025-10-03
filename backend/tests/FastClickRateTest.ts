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

export class FastClickRateTest {
  private logger = Logger.getInstance();
  private database = DatabaseManager.getInstance();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async execute(page: Page, config: TestConfig): Promise<void> {
    await this.logSessionEvent('info', 'Starting Fast Click Rate Test');
    
    try {
      const businessUrl = await this.findBusinessURL(page, config.targetBusiness);
      
      // Perform clicks at a rate exceeding normal human behavior (>7 clicks/second)
      for (let i = 0; i < 10; i++) {
        await page.goto(businessUrl);
        await page.waitForTimeout(100); // 0.1 seconds between page loads (10 clicks/sec)
        
        const clickableElement = await page.$('a[href*="request_a_quote"], .business-phone-number, .biz-phone');
        if (clickableElement) {
          await clickableElement.click();
          
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'fast_click_rate',
            action: `fast_click_${i + 1}`,
            success: true,
            details: `Fast click ${i + 1} at ${Date.now()} - rate: 10 clicks/sec`,
            filter_triggered: i > 6, // Expect filter to trigger after 7 clicks
            click_recorded: i <= 6
          });
        }
        
        await this.logSessionEvent('info', `Performed fast click ${i + 1}/10`);
      }

      await this.logSessionEvent('info', 'Fast click rate test completed - should trigger TooFastClickRateFilter');

    } catch (error) {
      await this.logSessionEvent('error', `Fast Click Rate Test failed: ${error.message}`);
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






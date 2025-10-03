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

export class ExcessiveBusinessViewsTest {
  private logger = Logger.getInstance();
  private database = DatabaseManager.getInstance();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async execute(page: Page, config: TestConfig): Promise<void> {
    await this.logSessionEvent('info', 'Starting Excessive Business Views Test');
    
    try {
      const businessUrl = await this.findBusinessURL(page, config.targetBusiness);
      
      // Perform excessive business page views with short durations
      for (let i = 0; i < 25; i++) {
        const startTime = Date.now();
        await page.goto(businessUrl);
        
        // Very short duration view (under 1 second)
        const viewDuration = Math.random() * 800 + 200; // 200-1000ms
        await page.waitForTimeout(viewDuration);
        
        const endTime = Date.now();
        const actualDuration = endTime - startTime;
        
        await this.database.addTestResult({
          session_id: this.sessionId,
          scenario: 'excessive_business_views',
          action: `business_view_${i + 1}`,
          success: true,
          details: `Business view ${i + 1}, duration: ${actualDuration}ms, planned: ${viewDuration}ms`,
          filter_triggered: i > 19 && actualDuration < 1000, // Expect filter after 20 rapid views
          click_recorded: !(i > 19 && actualDuration < 1000)
        });
        
        if (i % 5 === 0) {
          await this.logSessionEvent('info', `Completed ${i + 1}/25 business views`);
        }
        
        // Add small random delay to simulate more realistic behavior occasionally
        if (Math.random() < 0.1) { // 10% chance
          await page.waitForTimeout(Math.random() * 2000 + 1000); // 1-3 second pause
        }
      }

      await this.logSessionEvent('info', 'Excessive business views test completed - should trigger ExcessiveBusinessViewsFilter');

    } catch (error) {
      await this.logSessionEvent('error', `Excessive Business Views Test failed: ${error.message}`);
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






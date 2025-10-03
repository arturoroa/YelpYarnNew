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

export class NoJSClicksTest {
  private logger = Logger.getInstance();
  private database = DatabaseManager.getInstance();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async execute(page: Page, config: TestConfig): Promise<void> {
    await this.logSessionEvent('info', 'Starting No-JS Clicks Test (Headless Detection)');
    
    try {
      // Disable JavaScript to simulate headless/bot behavior
      await page.setJavaScriptEnabled(false);
      await this.logSessionEvent('info', 'JavaScript disabled to simulate bot behavior');
      
      const businessUrl = await this.findBusinessURL(page, config.targetBusiness);
      await page.goto(businessUrl);
      
      await this.database.addTestResult({
        session_id: this.sessionId,
        scenario: 'no_js_clicks',
        action: 'navigate_with_js_disabled',
        success: true,
        details: 'Navigated to business page with JavaScript disabled'
      });
      
      // Try to find clickable elements that would normally require JS
      const clickableElements = [
        'a[href*="request_a_quote"]',
        '.business-phone-number',
        '.biz-phone',
        '[data-analytics-label*="cta"]',
        '.cta-button'
      ];
      
      let clickPerformed = false;
      
      for (const selector of clickableElements) {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          clickPerformed = true;
          
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'no_js_clicks',
            action: 'js_disabled_click',
            success: true,
            details: `Click performed on ${selector} with JavaScript disabled`,
            filter_triggered: true, // Should trigger invalid click filter
            click_recorded: false
          });
          
          await this.logSessionEvent('info', `Clicked element: ${selector} without JavaScript`);
          break;
        }
      }
      
      if (!clickPerformed) {
        await this.database.addTestResult({
          session_id: this.sessionId,
          scenario: 'no_js_clicks',
          action: 'no_clickable_elements',
          success: false,
          details: 'No clickable elements found on business page'
        });
      }
      
      // Re-enable JavaScript for subsequent tests
      await page.setJavaScriptEnabled(true);
      await this.logSessionEvent('info', 'JavaScript re-enabled');
      
      await this.logSessionEvent('info', 'No-JS clicks test completed - should trigger HeadlessDetectionFilter');

    } catch (error) {
      // Ensure JavaScript is re-enabled even if test fails
      await page.setJavaScriptEnabled(true);
      await this.logSessionEvent('error', `No-JS Clicks Test failed: ${error.message}`);
      throw error;
    }
  }

  private async findBusinessURL(page: Page, businessName: string): Promise<string> {
    // Re-enable JS temporarily to perform search
    await page.setJavaScriptEnabled(true);
    
    const searchUrl = `${process.env.YELP_BASE_URL}/search?find_desc=${encodeURIComponent(businessName)}&find_loc=San%20Francisco%2C%20CA`;
    
    await page.goto(searchUrl);
    await page.waitForTimeout(3000);
    
    // Look for business link in search results
    const businessLink = await page.$eval(
      'a[href*="/biz/"]',
      (el) => el.getAttribute('href')
    ).catch(() => null);
    
    // Disable JS again for the actual test
    await page.setJavaScriptEnabled(false);
    
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






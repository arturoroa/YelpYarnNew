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

export class MobileAppClicksTest {
  private logger = Logger.getInstance();
  private database = DatabaseManager.getInstance();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async execute(page: Page, config: TestConfig): Promise<void> {
    await this.logSessionEvent('info', 'Starting Mobile App Clicks Test');
    
    try {
      // Set mobile app user agent
      const mobileAppUA = 'YelpApp/12.34.0 (iPhone; iOS 15.0; Scale/3.00)';
      await page.setUserAgent(mobileAppUA);
      
      // Set mobile viewport
      await page.setViewport({
        width: 375,
        height: 812,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      });

      await this.logSessionEvent('info', 'Configured mobile app environment');

      // Test mobile app servlets
      const mobileAppTests = [
        {
          servlet: 'mobile_app_search',
          action: 'search_for_business',
          url: `${process.env.YELP_BASE_URL}/search?find_desc=${encodeURIComponent(config.targetBusiness)}&find_loc=San%20Francisco%2C%20CA`
        },
        {
          servlet: 'mobile_app_biz_details',
          action: 'view_business_details',
          url: await this.findBusinessURL(page, config.targetBusiness)
        }
      ];

      for (let i = 0; i < mobileAppTests.length; i++) {
        const test = mobileAppTests[i];
        
        await page.goto(test.url);
        await page.waitForTimeout(3000);
        
        await this.database.addTestResult({
          session_id: this.sessionId,
          scenario: 'mobile_app_clicks',
          action: `${test.servlet}_navigation`,
          success: true,
          details: `Navigated to ${test.servlet} servlet via mobile app`,
          click_recorded: true
        });

        // Look for mobile-specific elements
        const mobileElements = [
          '[data-testid="request-quote-button"]',
          '.mobile-cta-button',
          '.app-cta',
          'button[aria-label*="Call"]',
          'a[href*="tel:"]',
          '.business-phone-action'
        ];

        let clickPerformed = false;

        for (const selector of mobileElements) {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            clickPerformed = true;
            
            await this.database.addTestResult({
              session_id: this.sessionId,
              scenario: 'mobile_app_clicks',
              action: `${test.servlet}_click`,
              success: true,
              details: `Mobile app click on ${selector} in ${test.servlet}`,
              click_recorded: true,
              filter_triggered: false
            });
            
            await this.logSessionEvent('info', `Performed mobile app click in ${test.servlet}`);
            break;
          }
        }

        if (!clickPerformed) {
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'mobile_app_clicks',
            action: `${test.servlet}_no_click`,
            success: false,
            details: `No mobile clickable elements found in ${test.servlet}`
          });
        }

        // Test mobile app request a quote flow
        if (test.servlet === 'mobile_app_biz_details') {
          await this.testMobileAppRequestQuote(page);
        }

        await page.waitForTimeout(2000);
      }

      await this.logSessionEvent('info', 'Mobile app clicks test completed');

    } catch (error) {
      await this.logSessionEvent('error', `Mobile App Clicks Test failed: ${error.message}`);
      throw error;
    }
  }

  private async testMobileAppRequestQuote(page: Page): Promise<void> {
    try {
      // Look for request a quote button specific to mobile app
      const quoteSelectors = [
        '[data-testid="request-quote-button"]',
        'button[aria-label*="Request a Quote"]',
        '.mobile-request-quote',
        'a[href*="request_a_quote"]'
      ];

      for (const selector of quoteSelectors) {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          await page.waitForTimeout(2000);
          
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'mobile_app_clicks',
            action: 'mobile_app_request_a_quote',
            success: true,
            details: `Mobile app request a quote click via ${selector}`,
            click_recorded: true,
            filter_triggered: false
          });
          
          await this.logSessionEvent('info', 'Performed mobile app request a quote action');
          break;
        }
      }
    } catch (error) {
      await this.logSessionEvent('warn', `Mobile app request quote test failed: ${error.message}`);
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






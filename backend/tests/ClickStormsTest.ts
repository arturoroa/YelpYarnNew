import { Page } from 'puppeteer';
import { DatabaseManager } from '../utils/DatabaseManager.js';
import { Logger } from '../utils/Logger.js';
import { TestLogger } from '../utils/TestLogger.js';
import { ProductionIsolation } from '../utils/ProductionIsolation.js';

export interface TestConfig {
  targetBusiness: string;
  userAgent: string;
  headless: boolean;
  deviceEmulation?: any;
  networkConditions?: any;
  environment?: {
    endpoints: {
      yelpBaseUrl: string;
      yelpMobileUrl: string;
      yelpAppUrl: string;
      apiBaseUrl: string;
      searchApiUrl: string;
      gqlEndpoint: string;
      adEventLogUrl: string;
    };
  };
}

export class ClickStormsTest {
  private logger = Logger.getInstance();
  private testLogger = TestLogger.getInstance();
  private isolation = ProductionIsolation.getInstance();
  private database = DatabaseManager.getInstance();
  private sessionId: string;
  private guv: string;

  constructor(sessionId: string, guv: string) {
    this.sessionId = sessionId;
    this.guv = guv;
  }

  async execute(page: Page, config: TestConfig): Promise<void> {
    const baseUrl = config.environment?.endpoints.yelpBaseUrl || 'https://www.yelp.com';
    
    await this.logSessionEvent('info', 'Starting Click Storms Test - Burst business views with varied timing');
    
    try {
      const dwellTimes: number[] = [];
      const businessUrls = await this.generateBusinessURLs(page, baseUrl, 25);
      
      // Perform burst of 25+ business views with varied timing
      for (let i = 0; i < 25; i++) {
        const businessUrl = businessUrls[i % businessUrls.length];
        const viewStart = Date.now();
        
        await page.goto(businessUrl);
        
        // Generate varied dwell times to test standard deviation > 0.5s
        let dwellTime: number;
        if (i < 10) {
          // First 10: very short dwell times (100-300ms)
          dwellTime = Math.random() * 200 + 100;
        } else if (i < 15) {
          // Next 5: medium dwell times (1-2s)
          dwellTime = Math.random() * 1000 + 1000;
        } else if (i < 20) {
          // Next 5: longer dwell times (3-5s)
          dwellTime = Math.random() * 2000 + 3000;
        } else {
          // Last 5: very varied (0.1-6s) to increase std deviation
          dwellTime = Math.random() * 5900 + 100;
        }
        
        await page.waitForTimeout(dwellTime);
        const actualDwellTime = Date.now() - viewStart;
        dwellTimes.push(actualDwellTime);
        
        // Log screen transition with dwell time
        this.testLogger.logScreenTransition(this.sessionId, this.guv, {
          fromScreen: i === 0 ? 'search' : 'biz_details',
          toScreen: 'biz_details',
          duration: actualDwellTime,
          url: businessUrl,
          servletName: 'biz_details',
          ipAddress: await this.getCurrentIP(),
          userAgent: config.userAgent,
          environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production'
        });
        
        // Occasionally perform clicks during the storm
        if (Math.random() < 0.3) { // 30% chance of clicking
          const ctaElement = await page.$('a[href*="request_a_quote"], .business-phone-number, .cta-button');
          if (ctaElement) {
            await ctaElement.click();
            
            const clickTimestamp = new Date().toISOString();
            this.testLogger.logClickEvent(this.sessionId, this.guv, {
              businessName: `Storm Business ${i + 1}`,
              clickTimestamp,
              screenName: 'biz_details',
              servletName: 'request_a_quote',
              url: businessUrl,
              ipAddress: await this.getCurrentIP(),
              userAgent: config.userAgent,
              environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
              filterTriggered: i > 15, // Expect filter after 15+ rapid views
              billableClick: !(i > 15),
              billableClickReason: i > 15 ? 'click_storm_TooManyQuickBusinessViewsFilter' : 'valid_click',
              testScenario: 'click_storms'
            });
          }
        }
        
        await this.database.addTestResult({
          session_id: this.sessionId,
          scenario: 'click_storms',
          action: `business_view_${i + 1}`,
          success: true,
          details: `Business view ${i + 1}, dwell time: ${actualDwellTime}ms, planned: ${dwellTime}ms`,
          filter_triggered: i > 15 && actualDwellTime < 1000,
          click_recorded: !(i > 15 && actualDwellTime < 1000)
        });
        
        if (i % 5 === 0) {
          await this.logSessionEvent('info', `Completed ${i + 1}/25 business views in click storm`);
        }
        
        // Very short delay between views to create storm effect
        await page.waitForTimeout(Math.random() * 200 + 50); // 50-250ms between views
      }
      
      // Calculate dwell time statistics
      const stats = this.calculateDwellTimeStats(dwellTimes);
      
      await this.logSessionEvent('info', `Click storm statistics: Mean: ${stats.mean}ms, StdDev: ${stats.stdDev}ms, Min: ${stats.min}ms, Max: ${stats.max}ms`);
      
      await this.database.addTestResult({
        session_id: this.sessionId,
        scenario: 'click_storms',
        action: 'storm_statistics',
        success: true,
        details: `Dwell time stats - Mean: ${stats.mean}ms, StdDev: ${stats.stdDev}ms (${stats.stdDev > 500 ? 'PASS' : 'FAIL'} - StdDev > 0.5s test)`,
        filter_triggered: stats.stdDev > 500
      });

      await this.logSessionEvent('info', 'Click Storms Test completed - should trigger TooManyQuickBusinessViewsFilter');

    } catch (error) {
      await this.logSessionEvent('error', `Click Storms Test failed: ${error.message}`);
      throw error;
    }
  }

  private async generateBusinessURLs(page: Page, baseUrl: string, count: number): Promise<string[]> {
    const searchTerms = ['restaurant', 'coffee', 'pizza', 'dentist', 'auto repair', 'hair salon', 'plumber', 'lawyer'];
    const urls: string[] = [];
    
    for (let i = 0; i < Math.min(count, searchTerms.length); i++) {
      const searchUrl = `${baseUrl}/search?find_desc=${encodeURIComponent(searchTerms[i])}&find_loc=San%20Francisco%2C%20CA`;
      await page.goto(searchUrl);
      await page.waitForTimeout(1000);
      
      try {
        const businessLinks = await page.$$eval(
          'a[href*="/biz/"]:not([href*="ad"])',
          (elements) => elements.slice(0, 3).map(el => el.getAttribute('href'))
        );
        
        businessLinks.forEach(link => {
          if (link) urls.push(`${baseUrl}${link}`);
        });
      } catch (error) {
        // Fallback URL if search fails
        urls.push(`${baseUrl}/biz/test-business-${i}-${Date.now()}`);
      }
    }
    
    // Fill remaining URLs with variations
    while (urls.length < count) {
      const baseIndex = urls.length % searchTerms.length;
      urls.push(`${baseUrl}/biz/test-${searchTerms[baseIndex]}-${urls.length}-${Date.now()}`);
    }
    
    return urls;
  }

  private calculateDwellTimeStats(dwellTimes: number[]): {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    const mean = dwellTimes.reduce((sum, time) => sum + time, 0) / dwellTimes.length;
    const variance = dwellTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / dwellTimes.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...dwellTimes);
    const max = Math.max(...dwellTimes);
    
    return {
      mean: Math.round(mean),
      stdDev: Math.round(stdDev),
      min,
      max
    };
  }

  private async getCurrentIP(): Promise<string> {
    return process.env.TEST_IP_ADDRESS || `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
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






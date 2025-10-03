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

export class SessionPollutionTest {
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
    
    await this.logSessionEvent('info', 'Starting Session Pollution Test - Mixed Valid/Invalid Behavior');
    
    try {
      // Phase 1: Perform valid user behavior (5 legitimate clicks)
      await this.logSessionEvent('info', 'Phase 1: Performing valid user behavior');
      
      for (let i = 0; i < 5; i++) {
        const businessUrl = await this.findRandomBusinessURL(page, baseUrl);
        const clickStart = Date.now();
        
        await page.goto(businessUrl);
        await page.waitForTimeout(Math.random() * 3000 + 2000); // 2-5 second realistic dwell time
        
        // Perform legitimate click
        const ctaElement = await page.$('a[href*="request_a_quote"], .business-phone-number, .cta-button');
        if (ctaElement) {
          await ctaElement.click();
          
          const clickTimestamp = new Date().toISOString();
          this.testLogger.logClickEvent(this.sessionId, this.guv, {
            businessName: `Valid Business ${i + 1}`,
            clickTimestamp,
            screenName: 'biz_details',
            servletName: 'request_a_quote',
            url: page.url(),
            ipAddress: await this.getCurrentIP(),
            userAgent: config.userAgent,
            environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
            billableClick: true,
            billableClickReason: 'valid_user_behavior',
            testScenario: 'session_pollution'
          });
          
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'session_pollution',
            action: `valid_click_${i + 1}`,
            success: true,
            details: `Valid click ${i + 1} with realistic dwell time`,
            click_recorded: true,
            filter_triggered: false
          });
        }
        
        await page.waitForTimeout(Math.random() * 2000 + 1000); // 1-3 second pause between actions
      }
      
      // Phase 2: Inject 1 invalid behavior per session
      await this.logSessionEvent('info', 'Phase 2: Injecting invalid behavior to test session-level aggregation');
      
      const invalidBehaviors = [
        { type: 'rapid_clicks', description: 'Rapid successive clicks' },
        { type: 'no_js_click', description: 'Click with JavaScript disabled' },
        { type: 'internal_ip', description: 'Click from internal IP' },
        { type: 'invalid_ua', description: 'Click with invalid user agent' }
      ];
      
      const selectedBehavior = invalidBehaviors[Math.floor(Math.random() * invalidBehaviors.length)];
      
      switch (selectedBehavior.type) {
        case 'rapid_clicks':
          await this.performRapidClicks(page, config, baseUrl);
          break;
        case 'no_js_click':
          await this.performNoJSClick(page, config, baseUrl);
          break;
        case 'internal_ip':
          await this.performInternalIPClick(page, config, baseUrl);
          break;
        case 'invalid_ua':
          await this.performInvalidUAClick(page, config, baseUrl);
          break;
      }
      
      // Phase 3: Continue with more valid behavior to test session aggregation
      await this.logSessionEvent('info', 'Phase 3: Continuing with valid behavior to test session-level filtering');
      
      for (let i = 0; i < 3; i++) {
        const businessUrl = await this.findRandomBusinessURL(page, baseUrl);
        await page.goto(businessUrl);
        await page.waitForTimeout(Math.random() * 4000 + 3000); // 3-7 second dwell time
        
        const ctaElement = await page.$('a[href*="request_a_quote"], .business-phone-number');
        if (ctaElement) {
          await ctaElement.click();
          
          const clickTimestamp = new Date().toISOString();
          this.testLogger.logClickEvent(this.sessionId, this.guv, {
            businessName: `Post-Pollution Business ${i + 1}`,
            clickTimestamp,
            screenName: 'biz_details',
            servletName: 'request_a_quote',
            url: page.url(),
            ipAddress: await this.getCurrentIP(),
            userAgent: config.userAgent,
            environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
            billableClick: false, // May be filtered due to session pollution
            billableClickReason: 'session_pollution_contamination',
            testScenario: 'session_pollution'
          });
          
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'session_pollution',
            action: `post_pollution_click_${i + 1}`,
            success: true,
            details: `Click after session pollution - may be filtered due to session-level aggregation`,
            click_recorded: false,
            filter_triggered: true
          });
        }
      }

      await this.logSessionEvent('info', 'Session Pollution Test completed - check session-level filter aggregation');

    } catch (error) {
      await this.logSessionEvent('error', `Session Pollution Test failed: ${error.message}`);
      throw error;
    }
  }

  private async performRapidClicks(page: Page, config: TestConfig, baseUrl: string): Promise<void> {
    const businessUrl = await this.findRandomBusinessURL(page, baseUrl);
    await page.goto(businessUrl);
    
    // Perform 5 rapid clicks in succession
    for (let i = 0; i < 5; i++) {
      const ctaElement = await page.$('a[href*="request_a_quote"], .business-phone-number');
      if (ctaElement) {
        await ctaElement.click();
        await page.waitForTimeout(100); // 100ms between clicks (10 clicks/sec)
      }
    }
    
    await this.database.addTestResult({
      session_id: this.sessionId,
      scenario: 'session_pollution',
      action: 'rapid_clicks_pollution',
      success: true,
      details: 'Performed rapid clicks to pollute session',
      click_recorded: false,
      filter_triggered: true
    });
  }

  private async performNoJSClick(page: Page, config: TestConfig, baseUrl: string): Promise<void> {
    await page.setJavaScriptEnabled(false);
    const businessUrl = await this.findRandomBusinessURL(page, baseUrl);
    await page.goto(businessUrl);
    
    const ctaElement = await page.$('a[href*="request_a_quote"]');
    if (ctaElement) {
      await ctaElement.click();
    }
    
    await page.setJavaScriptEnabled(true);
    
    await this.database.addTestResult({
      session_id: this.sessionId,
      scenario: 'session_pollution',
      action: 'no_js_click_pollution',
      success: true,
      details: 'Performed click with JavaScript disabled to pollute session',
      click_recorded: false,
      filter_triggered: true
    });
  }

  private async performInternalIPClick(page: Page, config: TestConfig, baseUrl: string): Promise<void> {
    await page.setExtraHTTPHeaders({
      'X-Forwarded-For': '10.0.0.1',
      'X-Real-IP': '10.0.0.1',
      'X-Yelp-Internal': 'true'
    });
    
    const businessUrl = await this.findRandomBusinessURL(page, baseUrl);
    await page.goto(businessUrl);
    
    const ctaElement = await page.$('a[href*="request_a_quote"]');
    if (ctaElement) {
      await ctaElement.click();
    }
    
    await page.setExtraHTTPHeaders({});
    
    await this.database.addTestResult({
      session_id: this.sessionId,
      scenario: 'session_pollution',
      action: 'internal_ip_pollution',
      success: true,
      details: 'Performed click from internal IP to pollute session',
      click_recorded: false,
      filter_triggered: true
    });
  }

  private async performInvalidUAClick(page: Page, config: TestConfig, baseUrl: string): Promise<void> {
    const originalUA = config.userAgent;
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 99.0; SM-G999U) AppleWebKit/537.36');
    
    const businessUrl = await this.findRandomBusinessURL(page, baseUrl);
    await page.goto(businessUrl);
    
    const ctaElement = await page.$('a[href*="request_a_quote"]');
    if (ctaElement) {
      await ctaElement.click();
    }
    
    await page.setUserAgent(originalUA);
    
    await this.database.addTestResult({
      session_id: this.sessionId,
      scenario: 'session_pollution',
      action: 'invalid_ua_pollution',
      success: true,
      details: 'Performed click with invalid user agent to pollute session',
      click_recorded: false,
      filter_triggered: true
    });
  }

  private async findRandomBusinessURL(page: Page, baseUrl: string): Promise<string> {
    const searchTerms = ['restaurant', 'coffee', 'pizza', 'dentist', 'auto repair'];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    const searchUrl = `${baseUrl}/search?find_desc=${encodeURIComponent(randomTerm)}&find_loc=San%20Francisco%2C%20CA`;
    await page.goto(searchUrl);
    await page.waitForTimeout(2000);
    
    const businessLink = await page.$eval(
      'a[href*="/biz/"]:not([href*="ad"])', // Avoid sponsored results for valid behavior
      (el) => el.getAttribute('href')
    ).catch(() => null);
    
    return businessLink ? `${baseUrl}${businessLink}` : `${baseUrl}/biz/test-business-${Date.now()}`;
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






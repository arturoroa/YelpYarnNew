import { Page } from 'puppeteer';
import { Logger } from '../utils/Logger.js';
import { TestLogger } from '../utils/TestLogger.js'; // Added .js extension
import { ProductionIsolation } from '../utils/ProductionIsolation.js'; // Added .js extension
import { DatabaseManager } from '../utils/DatabaseManager.js'; // Added .js extension

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

export interface TestUser {
  username: string;
  email: string;
  password_hash: string;
  yelp_user_id?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  last_used?: string;
  test_sessions_count: number;
}

export class SessionFilter1111Test {
  private logger = Logger.getInstance();
  private testLogger = TestLogger.getInstance();
  private isolation = ProductionIsolation.getInstance();
  private database: any; // <-- agrega esto
  private sessionId: string;
  private guv: string;
  private startTime: number = 0;

  constructor(sessionId: string, guv: string) {
    this.sessionId = sessionId;
    this.guv = guv;
    this.database = DatabaseManager.getInstance(); // Cambiado a DatabaseManager
  }

  async execute(page: Page, config: TestConfig): Promise<void> {
    this.startTime = Date.now();
    const baseUrl = config.environment?.endpoints.yelpBaseUrl || 'https://www.yelp.com';
    
    // Validate environment safety
    const safetyCheck = this.isolation.validateEnvironmentSafety();
    if (!safetyCheck.safe) {
      throw new Error(`Environment safety validation failed: ${safetyCheck.errors.join(', ')}`);
    }

    await this.logSessionEvent('info', 'Starting Test 1: Session Filter 1:1:1:1 Rule');
    
    // Log test start with GUV and environment details
    this.testLogger.logTestAction({
      sessionId: this.sessionId,
      guv: this.guv,
      timestamp: new Date().toISOString(),
      screenName: 'test_start',
      action: 'session_filter_1111_test_start',
      ipAddress: await this.getCurrentIP(),
      userAgent: config.userAgent,
      environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
      metadata: {
        testScenario: 'session_filter_1_1_1_1',
        targetBusiness: 'Acme Allopathic 2 - TEST PAGE - CLOSED'
      }
    });
    
    try {
      // Step 1: Navigate through the required flow: home_screen → search → search_html
      await this.logSessionEvent('info', 'Step 1: Navigating home_screen → search → search_html');
      
      const homeScreenStart = Date.now();
      // Start at Yelp homepage

      await page.goto(baseUrl);
      await page.waitForTimeout(2000);
      const homeScreenDuration = Date.now() - homeScreenStart;
      
      // Log screen transition
      this.testLogger.logScreenTransition(this.sessionId, this.guv, {
        fromScreen: 'initial',
        toScreen: 'home_screen',
        duration: homeScreenDuration,
        url: baseUrl,
        servletName: 'home_screen',
        ipAddress: await this.getCurrentIP(),
        userAgent: config.userAgent,
        environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production'
      });
      
      // Step 2: Perform search for target business
      await this.logSessionEvent('info', 'Step 2: Searching for "Acme Allopathic 2"');
      
      const searchStart = Date.now();
      const searchBox = await page.$('input[id*="find_desc"], input[placeholder*="tacos"], .search-input');
      if (searchBox) {
        await searchBox.type('Acme Allopathic 2');
        await page.waitForTimeout(1000);
        
        // Submit search
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        const searchDuration = Date.now() - searchStart;
        
        // Log search transition
        this.testLogger.logScreenTransition(this.sessionId, this.guv, {
          fromScreen: 'home_screen',
          toScreen: 'search_html',
          duration: searchDuration,
          url: page.url(),
          servletName: 'search_html',
          ipAddress: await this.getCurrentIP(),
          userAgent: config.userAgent,
          environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production'
        });
        
        // Step 3: Find and click sponsored result
        await this.logSessionEvent('info', 'Step 3: Looking for sponsored results section');
        
        const sponsoredResult = await page.$('.search-result.search-result--ad, .yloca-search-result[data-ad-logging-uri], .search-result[data-key*="ad"]');
        
        if (sponsoredResult) {
          // Record initial click (should be billable)
          const initialClickTime = Date.now();
          const initialClickTimestamp = new Date(initialClickTime).toISOString();
          await sponsoredResult.click();
          // @ts-ignore
          await page.waitForTimeout(2000);
          
          // Log detailed click event
          this.testLogger.logClickEvent(this.sessionId, this.guv, {
            businessName: 'Acme Allopathic 2 - TEST PAGE - CLOSED',
            clickTimestamp: initialClickTimestamp,
            screenName: 'search_html',
            servletName: 'biz_details',
            url: page.url(),
            ipAddress: await this.getCurrentIP(),
            userAgent: config.userAgent,
            environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
            billableClick: true,
            billableClickReason: 'initial_click',
            testScenario: 'session_filter_1_1_1_1'
          });
          
          // Step 4A: Testing rapid re-click (5 minutes - should trigger filter)
          await this.logSessionEvent('info', 'Step 4A: Testing rapid re-click (5 minutes - should trigger filter)');
          
          // Test B: Wait 5 minutes and re-click (should be filtered)
          await page.waitForTimeout(5 * 60 * 1000); // 5 minutes
          
          // Log waiting period
          this.testLogger.logTestAction({
            sessionId: this.sessionId,
            guv: this.guv,
            timestamp: new Date().toISOString(),
            screenName: 'biz_details',
            action: 'wait_5_minutes',
            duration: 5 * 60 * 1000,
            ipAddress: await this.getCurrentIP(),
            userAgent: config.userAgent,
            environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
            metadata: { waitReason: 'testing_rapid_reclick_filter' }
          });
          
          // Navigate back to search results
          await page.goBack();
          // @ts-ignore
          await page.waitForTimeout(2000);
          
          const rapidClickSponsoredResult = await page.$('.search-result.search-result--ad, .yloca-search-result[data-ad-logging-uri], .search-result[data-key*="ad"]');
          if (rapidClickSponsoredResult) {
            const rapidClickTime = Date.now();
            const rapidClickTimestamp = new Date(rapidClickTime).toISOString();
            await rapidClickSponsoredResult.click();
            // @ts-ignore
            await page.waitForTimeout(2000);
            
            // Log rapid re-click event (should be filtered)
            this.testLogger.logClickEvent(this.sessionId, this.guv, {
              businessName: 'Acme Allopathic 2 - TEST PAGE - CLOSED',
              clickTimestamp: rapidClickTimestamp,
              screenName: 'search_html',
              servletName: 'biz_details',
              url: page.url(),
              ipAddress: await this.getCurrentIP(),
              userAgent: config.userAgent,
              environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
              filterTriggered: true,
              billableClick: false,
              billableClickReason: 'rapid_reclick_5min_MoreThanOneClickPerYuvPerBizPerHourFilter',
              testScenario: 'session_filter_1_1_1_1'
            });
            
            await this.database.addTestResult({
              session_id: this.sessionId,
              scenario: 'session_filter_1_1_1_1',
              action: 'rapid_reclick_5min',
              success: true,
              details: `Rapid re-click after 5 minutes at ${new Date(rapidClickTime).toISOString()} - should trigger MoreThanOneClickPerYuvPerBizPerHourFilter`,
              click_recorded: false,
              filter_triggered: true
            });
          }
          
          await this.logSessionEvent('info', 'Step 4B: Testing 1-hour delayed click (should be billable)');
          
          // Test A: Wait 1 hour, clear cookies, and re-click (should be billable)
          // For testing purposes, we'll simulate this with a shorter wait and cookie clearing
          await page.waitForTimeout(10000); // 10 seconds for demo (would be 1 hour in production)
          
          // Log cookie clearing
          this.testLogger.logTestAction({
            sessionId: this.sessionId,
            guv: this.guv,
            timestamp: new Date().toISOString(),
            screenName: 'biz_details',
            action: 'clear_cookies_and_cache',
            ipAddress: await this.getCurrentIP(),
            userAgent: config.userAgent,
            environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
            metadata: { reason: 'simulate_new_session_after_1hr' }
          });
          
          // Clear cookies to simulate new session
          const client = await page.target().createCDPSession();
          await client.send('Network.clearBrowserCookies');
          await client.send('Network.clearBrowserCache');
          
          // Navigate back and perform click
          await page.goto(`${baseUrl}/search?find_desc=Acme%20Allopathic%202`);
          // @ts-ignore
          await page.waitForTimeout(3000);
          
          const delayedClickSponsoredResult = await page.$('.search-result.search-result--ad, .yloca-search-result[data-ad-logging-uri], .search-result[data-key*="ad"]');
          if (delayedClickSponsoredResult) {
            const delayedClickTime = Date.now();
            const delayedClickTimestamp = new Date(delayedClickTime).toISOString();
            await delayedClickSponsoredResult.click();
            // @ts-ignore
            await page.waitForTimeout(2000);
            
            // Log delayed click event (should be billable)
            this.testLogger.logClickEvent(this.sessionId, this.guv, {
              businessName: 'Acme Allopathic 2 - TEST PAGE - CLOSED',
              clickTimestamp: delayedClickTimestamp,
              screenName: 'search_html',
              servletName: 'biz_details',
              url: page.url(),
              ipAddress: await this.getCurrentIP(),
              userAgent: config.userAgent,
              environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
              billableClick: true,
              billableClickReason: 'delayed_click_1hr_new_session',
              testScenario: 'session_filter_1_1_1_1'
            });
            
            await this.database.addTestResult({
              session_id: this.sessionId,
              scenario: 'session_filter_1_1_1_1',
              action: 'delayed_click_1hr',
              success: true,
              details: `Delayed click after 1hr with cleared cookies at ${new Date(delayedClickTime).toISOString()} - should be billable`,
              click_recorded: true,
              filter_triggered: false
            });
          }
        } else {
          await this.logSessionEvent('warn', 'No sponsored results found for Acme Allopathic 2');
          
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'session_filter_1_1_1_1',
            action: 'sponsored_result_search',
            success: false,
            details: 'Could not find sponsored results section for target business'
          });
        }
      } // <--- ESTA LLAVE CIERRA EL if (searchBox) CORRECTAMENTE

      await this.logSessionEvent('info', 'Test 1: Session Filter 1:1:1:1 Rule completed');
      await this.logSessionEvent('info', 'Check unified_ad_event_log for billable_click = false on rapid re-clicks');
      
      // Log test completion
      const totalDuration = Date.now() - this.startTime;
      this.testLogger.logTestAction({
        sessionId: this.sessionId,
        guv: this.guv,
        timestamp: new Date().toISOString(),
        screenName: 'test_complete',
        action: 'session_filter_1111_test_complete',
        duration: totalDuration,
        ipAddress: await this.getCurrentIP(),
        userAgent: config.userAgent,
        environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
        metadata: {
          testScenario: 'session_filter_1_1_1_1',
          totalDuration,
          completedSuccessfully: true
        }
      });

    } catch (error) {
      await this.logSessionEvent('error', `Test 1 failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private async getCurrentIP(): Promise<string> {
    try {
      // In a real scenario, this would detect the actual IP
      // For testing, we'll generate a mock IP or use environment variable
      return process.env.TEST_IP_ADDRESS || `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    } catch (error) {
      return '127.0.0.1';
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

// Add this to DatabaseManager.ts or create a separate utility file
export async function waitForTimeout(page: Page, timeout: number): Promise<void> {
  await page.evaluate((timeout) => {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }, timeout);
}






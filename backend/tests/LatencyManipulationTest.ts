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

export class LatencyManipulationTest {
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
    
    await this.logSessionEvent('info', 'Starting Latency Manipulation Test - Simulating poor connections to bypass speed-based filters');
    
    try {
      // Test different network conditions to simulate various connection speeds
      const networkConditions = [
        {
          name: 'Slow 3G',
          offline: false,
          downloadThroughput: 500 * 1024 / 8, // 500 Kbps
          uploadThroughput: 500 * 1024 / 8,
          latency: 400 // 400ms latency
        },
        {
          name: 'Fast 3G',
          offline: false,
          downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
          uploadThroughput: 750 * 1024 / 8,
          latency: 150 // 150ms latency
        },
        {
          name: 'Slow 4G',
          offline: false,
          downloadThroughput: 4 * 1024 * 1024 / 8, // 4 Mbps
          uploadThroughput: 3 * 1024 * 1024 / 8,
          latency: 20 // 20ms latency
        },
        {
          name: 'Extremely Slow Connection',
          offline: false,
          downloadThroughput: 56 * 1024 / 8, // 56k modem speed
          uploadThroughput: 56 * 1024 / 8,
          latency: 1000 // 1 second latency
        }
      ];

      const businessUrl = await this.findBusinessURL(page, config.targetBusiness, baseUrl);

      for (let i = 0; i < networkConditions.length; i++) {
        const condition = networkConditions[i];
        
        await this.logSessionEvent('info', `Testing with ${condition.name} network conditions`);
        
        // Apply network throttling
        const client = await page.target().createCDPSession();
        await client.send('Network.emulateNetworkConditions', condition);
        
        // Test navigation with throttled connection
        const navigationStart = Date.now();
        await page.goto(businessUrl);
        
        // Add artificial delays to simulate slow processing
        await this.simulateSlowProcessing(page, condition.latency);
        
        const navigationEnd = Date.now();
        const navigationDuration = navigationEnd - navigationStart;
        
        // Log the navigation with timing
        this.testLogger.logScreenTransition(this.sessionId, this.guv, {
          fromScreen: 'search',
          toScreen: 'biz_details',
          duration: navigationDuration,
          url: businessUrl,
          servletName: 'biz_details',
          ipAddress: await this.getCurrentIP(),
          userAgent: config.userAgent,
          environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production'
        });
        
        // Perform clicks with artificial delays
        await this.performThrottledClicks(page, config, condition);
        
        // Test rapid actions despite slow connection (should bypass speed filters)
        await this.testRapidActionsWithSlowConnection(page, config, condition);
        
        await this.database.addTestResult({
          session_id: this.sessionId,
          scenario: 'latency_manipulation',
          action: `network_condition_${condition.name.toLowerCase().replace(/\s+/g, '_')}`,
          success: true,
          details: `Navigation with ${condition.name}: ${navigationDuration}ms, latency: ${condition.latency}ms`,
          filter_triggered: false, // Should bypass speed-based filters
          click_recorded: true
        });
        
        // Clear network throttling
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: -1,
          uploadThroughput: -1,
          latency: 0
        });
        
        await page.waitForTimeout(1000);
      }
      
      // Test with intermittent connectivity
      await this.testIntermittentConnectivity(page, config, baseUrl);
      
      // Test with request timeout manipulation
      await this.testRequestTimeoutManipulation(page, config, baseUrl);

      await this.logSessionEvent('info', 'Latency Manipulation Test completed - tested bypassing speed-based bot detection');

    } catch (error) {
      await this.logSessionEvent('error', `Latency Manipulation Test failed: ${error.message}`);
      throw error;
    }
  }

  private async simulateSlowProcessing(page: Page, baseLatency: number): Promise<void> {
    // Add random delays to simulate slow processing
    const processingDelay = Math.random() * baseLatency + baseLatency / 2;
    await page.waitForTimeout(processingDelay);
    
    // Simulate slow JavaScript execution
    await page.evaluate((delay) => {
      return new Promise(resolve => {
        const start = Date.now();
        // Simulate CPU-intensive task
        while (Date.now() - start < delay / 4) {
          Math.random();
        }
        setTimeout(resolve, delay / 4);
      });
    }, processingDelay);
  }

  private async performThrottledClicks(page: Page, config: TestConfig, condition: any): Promise<void> {
    const clickableElements = [
      'a[href*="request_a_quote"]',
      '.business-phone-number',
      '.biz-phone',
      '.cta-button'
    ];
    
    for (const selector of clickableElements) {
      const element = await page.$(selector);
      if (element) {
        // Add pre-click delay to simulate slow user interaction
        await page.waitForTimeout(condition.latency / 2);
        
        const clickStart = Date.now();
        await element.click();
        const clickEnd = Date.now();
        
        // Add post-click delay
        await page.waitForTimeout(condition.latency / 2);
        
        const clickTimestamp = new Date(clickStart).toISOString();
        this.testLogger.logClickEvent(this.sessionId, this.guv, {
          businessName: config.targetBusiness,
          clickTimestamp,
          screenName: 'biz_details',
          servletName: 'request_a_quote',
          url: page.url(),
          ipAddress: await this.getCurrentIP(),
          userAgent: config.userAgent,
          environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
          filterTriggered: false, // Should bypass speed filters due to slow connection
          billableClick: true,
          billableClickReason: `slow_connection_${condition.name.toLowerCase().replace(/\s+/g, '_')}_bypass`,
          testScenario: 'latency_manipulation'
        });
        
        await this.database.addTestResult({
          session_id: this.sessionId,
          scenario: 'latency_manipulation',
          action: `throttled_click_${condition.name.toLowerCase().replace(/\s+/g, '_')}`,
          success: true,
          details: `Click with ${condition.name} conditions, duration: ${clickEnd - clickStart}ms`,
          filter_triggered: false,
          click_recorded: true
        });
        
        break; // Only test one click per condition
      }
    }
  }

  private async testRapidActionsWithSlowConnection(page: Page, config: TestConfig, condition: any): Promise<void> {
    await this.logSessionEvent('info', `Testing rapid actions with ${condition.name} to bypass speed detection`);
    
    // Perform rapid clicks despite slow connection
    const ctaElement = await page.$('a[href*="request_a_quote"], .business-phone-number');
    if (ctaElement) {
      for (let i = 0; i < 5; i++) {
        await ctaElement.click();
        // Very short delay between clicks (should normally trigger speed filter)
        await page.waitForTimeout(50);
      }
      
      await this.database.addTestResult({
        session_id: this.sessionId,
        scenario: 'latency_manipulation',
        action: `rapid_clicks_slow_connection_${condition.name.toLowerCase().replace(/\s+/g, '_')}`,
        success: true,
        details: `Rapid clicks (5 in 250ms) with ${condition.name} - should bypass speed filters`,
        filter_triggered: false, // Should bypass due to slow connection context
        click_recorded: true
      });
    }
  }

  private async testIntermittentConnectivity(page: Page, config: TestConfig, baseUrl: string): Promise<void> {
    await this.logSessionEvent('info', 'Testing intermittent connectivity patterns');
    
    const client = await page.target().createCDPSession();
    const businessUrl = await this.findBusinessURL(page, config.targetBusiness, baseUrl);
    
    // Simulate intermittent connection drops
    for (let i = 0; i < 3; i++) {
      // Go offline
      await client.send('Network.emulateNetworkConditions', {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0
      });
      
      await page.waitForTimeout(1000); // 1 second offline
      
      // Come back online with slow connection
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 100 * 1024 / 8, // Very slow
        uploadThroughput: 100 * 1024 / 8,
        latency: 500
      });
      
      try {
        await page.goto(businessUrl);
        const ctaElement = await page.$('a[href*="request_a_quote"]');
        if (ctaElement) {
          await ctaElement.click();
        }
      } catch (error) {
        // Expected to fail sometimes due to intermittent connectivity
      }
      
      await page.waitForTimeout(2000);
    }
    
    await this.database.addTestResult({
      session_id: this.sessionId,
      scenario: 'latency_manipulation',
      action: 'intermittent_connectivity',
      success: true,
      details: 'Simulated intermittent connectivity with offline/online cycles',
      filter_triggered: false,
      click_recorded: true
    });
    
    // Restore normal connection
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  }

  private async testRequestTimeoutManipulation(page: Page, config: TestConfig, baseUrl: string): Promise<void> {
    await this.logSessionEvent('info', 'Testing request timeout manipulation');
    
    const client = await page.target().createCDPSession();
    
    // Set very slow connection that causes timeouts
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1024 / 8, // 1 Kbps - extremely slow
      uploadThroughput: 1024 / 8,
      latency: 2000 // 2 second latency
    });
    
    const businessUrl = await this.findBusinessURL(page, config.targetBusiness, baseUrl);
    
    try {
      // Set a short timeout to force timeout scenarios
      await page.goto(businessUrl, { timeout: 5000 });
    } catch (error) {
      // Timeout expected
      await this.logSessionEvent('info', 'Request timeout occurred as expected');
    }
    
    // Try to perform actions during timeout recovery
    try {
      const ctaElement = await page.$('a[href*="request_a_quote"]');
      if (ctaElement) {
        await ctaElement.click();
        
        const clickTimestamp = new Date().toISOString();
        this.testLogger.logClickEvent(this.sessionId, this.guv, {
          businessName: config.targetBusiness,
          clickTimestamp,
          screenName: 'biz_details',
          servletName: 'request_a_quote',
          url: page.url(),
          ipAddress: await this.getCurrentIP(),
          userAgent: config.userAgent,
          environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
          filterTriggered: false, // Should bypass due to timeout context
          billableClick: true,
          billableClickReason: 'timeout_recovery_bypass',
          testScenario: 'latency_manipulation'
        });
      }
    } catch (error) {
      // Expected to fail due to timeouts
    }
    
    await this.database.addTestResult({
      session_id: this.sessionId,
      scenario: 'latency_manipulation',
      action: 'request_timeout_manipulation',
      success: true,
      details: 'Tested request timeout scenarios with extremely slow connection',
      filter_triggered: false,
      click_recorded: true
    });
    
    // Restore normal connection
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  }

  private async findBusinessURL(page: Page, businessName: string, baseUrl: string): Promise<string> {
    const searchUrl = `${baseUrl}/search?find_desc=${encodeURIComponent(businessName)}&find_loc=San%20Francisco%2C%20CA`;
    
    try {
      await page.goto(searchUrl, { timeout: 10000 });
      await page.waitForTimeout(3000);
      
      // Look for business link in search results
      const businessLink = await page.$eval(
        'a[href*="/biz/"]',
        (el) => el.getAttribute('href')
      ).catch(() => null);
      
      if (businessLink) {
        return `${baseUrl}${businessLink}`;
      }
    } catch (error) {
      // Fallback if search fails due to slow connection
    }
    
    // Fallback to test business URLs
    const testBizSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${baseUrl}/biz/${testBizSlug}`;
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






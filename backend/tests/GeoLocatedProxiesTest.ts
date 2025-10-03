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

export class GeoLocatedProxiesTest {
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
    
    await this.logSessionEvent('info', 'Starting Geo-Located Proxies Test - Testing ads_excluded countries');
    
    try {
      // Countries typically in ads_excluded list
      const excludedCountries = [
        {
          country: 'China',
          ip: '1.2.3.4',
          headers: {
            'X-Forwarded-For': '1.2.3.4',
            'X-Real-IP': '1.2.3.4',
            'CF-IPCountry': 'CN',
            'X-Country-Code': 'CN'
          }
        },
        {
          country: 'Russia',
          ip: '5.6.7.8',
          headers: {
            'X-Forwarded-For': '5.6.7.8',
            'X-Real-IP': '5.6.7.8',
            'CF-IPCountry': 'RU',
            'X-Country-Code': 'RU'
          }
        },
        {
          country: 'Iran',
          ip: '9.10.11.12',
          headers: {
            'X-Forwarded-For': '9.10.11.12',
            'X-Real-IP': '9.10.11.12',
            'CF-IPCountry': 'IR',
            'X-Country-Code': 'IR'
          }
        },
        {
          country: 'North Korea',
          ip: '13.14.15.16',
          headers: {
            'X-Forwarded-For': '13.14.15.16',
            'X-Real-IP': '13.14.15.16',
            'CF-IPCountry': 'KP',
            'X-Country-Code': 'KP'
          }
        },
        {
          country: 'Syria',
          ip: '17.18.19.20',
          headers: {
            'X-Forwarded-For': '17.18.19.20',
            'X-Real-IP': '17.18.19.20',
            'CF-IPCountry': 'SY',
            'X-Country-Code': 'SY'
          }
        }
      ];

      const businessUrl = await this.findBusinessURL(page, config.targetBusiness, baseUrl);

      for (let i = 0; i < excludedCountries.length; i++) {
        const countryConfig = excludedCountries[i];
        
        // Set geo-location headers to simulate proxy from excluded country
        await page.setExtraHTTPHeaders(countryConfig.headers);
        await this.logSessionEvent('info', `Testing from ${countryConfig.country} (${countryConfig.ip})`);
        
        await page.goto(businessUrl);
        await page.waitForTimeout(2000);
        
        // Log the geo-location attempt
        this.testLogger.logTestAction({
          sessionId: this.sessionId,
          guv: this.guv,
          timestamp: new Date().toISOString(),
          screenName: 'biz_details',
          action: 'geo_location_navigation',
          ipAddress: countryConfig.ip,
          userAgent: config.userAgent,
          environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
          metadata: {
            country: countryConfig.country,
            countryCode: countryConfig.headers['CF-IPCountry'],
            testScenario: 'geo_located_proxies'
          }
        });
        
        // Try to perform clicks from excluded country
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
            
            const clickTimestamp = new Date().toISOString();
            this.testLogger.logClickEvent(this.sessionId, this.guv, {
              businessName: config.targetBusiness,
              clickTimestamp,
              screenName: 'biz_details',
              servletName: 'request_a_quote',
              url: page.url(),
              ipAddress: countryConfig.ip,
              userAgent: config.userAgent,
              environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
              filterTriggered: true, // Should be filtered due to excluded country
              billableClick: false,
              billableClickReason: `geo_excluded_country_${countryConfig.headers['CF-IPCountry']}_GeoLocationFilter`,
              testScenario: 'geo_located_proxies'
            });
            
            await this.database.addTestResult({
              session_id: this.sessionId,
              scenario: 'geo_located_proxies',
              action: `excluded_country_click_${countryConfig.country.toLowerCase().replace(' ', '_')}`,
              success: true,
              details: `Click from ${countryConfig.country} (${countryConfig.ip}) - should be filtered by GeoLocationFilter`,
              filter_triggered: true,
              click_recorded: false
            });
            
            await this.logSessionEvent('info', `Performed click from ${countryConfig.country} - should be filtered`);
            break;
          }
        }
        
        if (!clickPerformed) {
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'geo_located_proxies',
            action: `excluded_country_no_click_${countryConfig.country.toLowerCase().replace(' ', '_')}`,
            success: false,
            details: `No clickable elements found from ${countryConfig.country} (${countryConfig.ip})`
          });
        }
        
        // Test impression filtering as well
        await this.testImpressionFiltering(page, countryConfig, baseUrl);
        
        // Wait between different country tests
        await page.waitForTimeout(1000);
      }
      
      // Test with allowed country for comparison
      await this.testAllowedCountry(page, config, baseUrl);

      // Clear headers
      await page.setExtraHTTPHeaders({});
      await this.logSessionEvent('info', 'Cleared geo-location headers');

      await this.logSessionEvent('info', 'Geo-Located Proxies Test completed - should trigger GeoLocationFilter for excluded countries');

    } catch (error) {
      // Clear headers even if test fails
      await page.setExtraHTTPHeaders({});
      await this.logSessionEvent('error', `Geo-Located Proxies Test failed: ${error.message}`);
      throw error;
    }
  }

  private async testImpressionFiltering(page: Page, countryConfig: any, baseUrl: string): Promise<void> {
    try {
      // Navigate to search page to test impression filtering
      const searchUrl = `${baseUrl}/search?find_desc=restaurant&find_loc=San%20Francisco%2C%20CA`;
      await page.goto(searchUrl);
      await page.waitForTimeout(2000);
      
      // Look for sponsored results (impressions)
      const sponsoredResults = await page.$$('.search-result--ad, [data-ad-logging-uri]');
      
      await this.database.addTestResult({
        session_id: this.sessionId,
        scenario: 'geo_located_proxies',
        action: `impression_test_${countryConfig.country.toLowerCase().replace(' ', '_')}`,
        success: true,
        details: `Impression test from ${countryConfig.country} - found ${sponsoredResults.length} sponsored results (should be 0 if filtered)`,
        filter_triggered: sponsoredResults.length === 0,
        click_recorded: false
      });
      
    } catch (error) {
      await this.logSessionEvent('warn', `Impression filtering test failed for ${countryConfig.country}: ${error.message}`);
    }
  }

  private async testAllowedCountry(page: Page, config: TestConfig, baseUrl: string): Promise<void> {
    // Test with US IP (should be allowed)
    const allowedHeaders = {
      'X-Forwarded-For': '8.8.8.8',
      'X-Real-IP': '8.8.8.8',
      'CF-IPCountry': 'US',
      'X-Country-Code': 'US'
    };
    
    await page.setExtraHTTPHeaders(allowedHeaders);
    await this.logSessionEvent('info', 'Testing from allowed country (US)');
    
    const businessUrl = await this.findBusinessURL(page, config.targetBusiness, baseUrl);
    await page.goto(businessUrl);
    await page.waitForTimeout(2000);
    
    const ctaElement = await page.$('a[href*="request_a_quote"], .business-phone-number');
    if (ctaElement) {
      await ctaElement.click();
      
      const clickTimestamp = new Date().toISOString();
      this.testLogger.logClickEvent(this.sessionId, this.guv, {
        businessName: config.targetBusiness,
        clickTimestamp,
        screenName: 'biz_details',
        servletName: 'request_a_quote',
        url: page.url(),
        ipAddress: '8.8.8.8',
        userAgent: config.userAgent,
        environment: config.environment?.endpoints.yelpBaseUrl.includes('test') ? 'test' : 'production',
        filterTriggered: false, // Should NOT be filtered
        billableClick: true,
        billableClickReason: 'allowed_country_US',
        testScenario: 'geo_located_proxies'
      });
      
      await this.database.addTestResult({
        session_id: this.sessionId,
        scenario: 'geo_located_proxies',
        action: 'allowed_country_click_us',
        success: true,
        details: 'Click from US (8.8.8.8) - should be allowed and billable',
        filter_triggered: false,
        click_recorded: true
      });
    }
  }

  private async findBusinessURL(page: Page, businessName: string, baseUrl: string): Promise<string> {
    const searchUrl = `${baseUrl}/search?find_desc=${encodeURIComponent(businessName)}&find_loc=San%20Francisco%2C%20CA`;
    
    await page.goto(searchUrl);
    await page.waitForTimeout(3000);
    
    // Look for business link in search results
    const businessLink = await page.$eval(
      'a[href*="/biz/"]',
      (el) => el.getAttribute('href')
    ).catch(() => null);
    
    if (businessLink) {
      return `${baseUrl}${businessLink}`;
    } else {
      // Fallback to test business URLs
      const testBizSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return `${baseUrl}/biz/${testBizSlug}`;
    }
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






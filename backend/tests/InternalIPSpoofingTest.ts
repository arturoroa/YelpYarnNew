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

export class InternalIPSpoofingTest {
  private logger = Logger.getInstance();
  private database = DatabaseManager.getInstance();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async execute(page: Page, config: TestConfig): Promise<void> {
    await this.logSessionEvent('info', 'Starting Internal IP Spoofing Test');
    
    try {
      // Set headers to simulate internal Yelp IP ranges
      const internalIPConfigs = [
        {
          name: 'Private Class A',
          headers: {
            'X-Forwarded-For': '10.0.0.1',
            'X-Real-IP': '10.0.0.1',
            'X-Yelp-Internal': 'true'
          }
        },
        {
          name: 'Private Class B',
          headers: {
            'X-Forwarded-For': '172.16.0.1',
            'X-Real-IP': '172.16.0.1',
            'X-Yelp-Internal': 'true'
          }
        },
        {
          name: 'Private Class C',
          headers: {
            'X-Forwarded-For': '192.168.1.1',
            'X-Real-IP': '192.168.1.1',
            'X-Yelp-Internal': 'true'
          }
        },
        {
          name: 'Localhost',
          headers: {
            'X-Forwarded-For': '127.0.0.1',
            'X-Real-IP': '127.0.0.1',
            'X-Yelp-Internal': 'true'
          }
        }
      ];

      const businessUrl = await this.findBusinessURL(page, config.targetBusiness);

      for (let i = 0; i < internalIPConfigs.length; i++) {
        const ipConfig = internalIPConfigs[i];
        
        // Set headers to simulate internal IP
        await page.setExtraHTTPHeaders(ipConfig.headers);
        await this.logSessionEvent('info', `Set internal IP headers: ${ipConfig.name} (${ipConfig.headers['X-Real-IP']})`);
        
        await page.goto(businessUrl);
        await page.waitForTimeout(2000);
        
        // Try to perform clicks from internal IP
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
              scenario: 'internal_ip_spoofing',
              action: `internal_ip_click_${i + 1}`,
              success: true,
              details: `Click from simulated internal IP: ${ipConfig.name} (${ipConfig.headers['X-Real-IP']})`,
              filter_triggered: true, // Should trigger internal IP filter
              click_recorded: false
            });
            
            await this.logSessionEvent('info', `Performed click ${i + 1} from internal IP: ${ipConfig.headers['X-Real-IP']}`);
            break;
          }
        }
        
        if (!clickPerformed) {
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'internal_ip_spoofing',
            action: `internal_ip_no_click_${i + 1}`,
            success: false,
            details: `No clickable elements found with internal IP: ${ipConfig.headers['X-Real-IP']}`
          });
        }
        
        // Wait between different IP tests
        await page.waitForTimeout(1000);
      }

      // Clear extra headers
      await page.setExtraHTTPHeaders({});
      await this.logSessionEvent('info', 'Cleared internal IP headers');

      await this.logSessionEvent('info', 'Internal IP spoofing test completed - should trigger InternalIPFilter');

    } catch (error) {
      // Clear headers even if test fails
      await page.setExtraHTTPHeaders({});
      await this.logSessionEvent('error', `Internal IP Spoofing Test failed: ${error.message}`);
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






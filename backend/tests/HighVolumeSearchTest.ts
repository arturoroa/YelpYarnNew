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

export class HighVolumeSearchTest {
  private logger = Logger.getInstance();
  private database = DatabaseManager.getInstance();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async execute(page: Page, config: TestConfig): Promise<void> {
    await this.logSessionEvent('info', 'Starting High Volume Search Test');
    
    try {
      // Test high volume search patterns that might trigger filters
      const searchTerms = [
        'restaurants',
        'pizza',
        'coffee',
        'bars',
        'auto repair',
        'dentist',
        'hair salon',
        'plumber',
        'electrician',
        'lawyer'
      ];

      const locations = [
        'San Francisco, CA',
        'New York, NY',
        'Los Angeles, CA',
        'Chicago, IL',
        'Seattle, WA'
      ];

      // Perform rapid searches to test volume limits
      for (let i = 0; i < 50; i++) {
        const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        const searchUrl = `${process.env.YELP_BASE_URL}/search?find_desc=${encodeURIComponent(searchTerm)}&find_loc=${encodeURIComponent(location)}`;
        
        const startTime = Date.now();
        await page.goto(searchUrl);
        await page.waitForTimeout(Math.random() * 500 + 200); // 200-700ms view time
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        
        await this.database.addTestResult({
          session_id: this.sessionId,
          scenario: 'high_volume_search',
          action: `search_${i + 1}`,
          success: true,
          details: `Search ${i + 1}: "${searchTerm}" in "${location}", duration: ${duration}ms`,
          filter_triggered: i > 30 && duration < 1000, // Expect filter after 30 rapid searches
          click_recorded: !(i > 30 && duration < 1000)
        });

        // Test search suggestions (GQL calls)
        if (i % 10 === 0) {
          await this.testSearchSuggestions(page, searchTerm);
        }

        // Occasionally click on search results
        if (Math.random() < 0.3) { // 30% chance
          await this.clickRandomSearchResult(page, i);
        }

        if (i % 10 === 0) {
          await this.logSessionEvent('info', `Completed ${i + 1}/50 high volume searches`);
        }

        // Very short delay between searches to simulate bot behavior
        await page.waitForTimeout(Math.random() * 100 + 50); // 50-150ms
      }

      await this.logSessionEvent('info', 'High volume search test completed - should trigger HighVolumeSearchFilter');

    } catch (error) {
      await this.logSessionEvent('error', `High Volume Search Test failed: ${error.message}`);
      throw error;
    }
  }

  private async testSearchSuggestions(page: Page, searchTerm: string): Promise<void> {
    try {
      // Navigate to homepage to test search suggestions
      await page.goto(`${process.env.YELP_BASE_URL}`);
      await page.waitForTimeout(1000);

      const searchInput = await page.$('input[id*="find_desc"], input[placeholder*="tacos"], .search-input');
      if (searchInput) {
        // Clear and type character by character to trigger suggestions
        await searchInput.click({ clickCount: 3 }); // Select all
        await page.keyboard.press('Backspace');
        
        for (let i = 0; i < searchTerm.length; i++) {
          await searchInput.type(searchTerm[i]);
          await page.waitForTimeout(100); // Wait for GQL suggestion call
          
          // Check if suggestions appeared
          const suggestions = await page.$('.suggestions, .search-suggestions, [data-testid="suggestions"]');
          if (suggestions) {
            await this.database.addTestResult({
              session_id: this.sessionId,
              scenario: 'high_volume_search',
              action: 'search_suggestion_trigger',
              success: true,
              details: `Search suggestion triggered for "${searchTerm.substring(0, i + 1)}" (GQL call)`
            });
          }
        }
      }
    } catch (error) {
      await this.logSessionEvent('warn', `Search suggestions test failed: ${error.message}`);
    }
  }

  private async clickRandomSearchResult(page: Page, searchIndex: number): Promise<void> {
    try {
      // Look for search results to click
      const resultSelectors = [
        '.search-result a[href*="/biz/"]',
        '.businessName a',
        '[data-testid="business-name"] a',
        '.biz-name a'
      ];

      for (const selector of resultSelectors) {
        const results = await page.$$(selector);
        if (results.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(results.length, 3)); // Click top 3 results
          const result = results[randomIndex];
          
          await result.click();
          await page.waitForTimeout(Math.random() * 1000 + 500); // 500-1500ms on business page
          
          await this.database.addTestResult({
            session_id: this.sessionId,
            scenario: 'high_volume_search',
            action: `search_result_click_${searchIndex}`,
            success: true,
            details: `Clicked search result ${randomIndex + 1} during search ${searchIndex + 1}`,
            click_recorded: true
          });
          
          // Go back to search results
          await page.goBack();
          await page.waitForTimeout(500);
          break;
        }
      }
    } catch (error) {
      await this.logSessionEvent('warn', `Search result click failed: ${error.message}`);
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






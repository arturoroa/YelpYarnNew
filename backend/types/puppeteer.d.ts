import { Page as PuppeteerPage } from 'puppeteer';

declare module 'puppeteer' {
  interface Page extends PuppeteerPage {
    waitForTimeout(timeout: number): Promise<void>;
  }
}






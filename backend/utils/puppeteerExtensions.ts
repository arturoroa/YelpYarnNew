import puppeteer, { Page } from 'puppeteer';

// Añadir método waitForTimeout a Page
if (!('waitForTimeout' in Page.prototype)) {
  (Page.prototype as any).waitForTimeout = async function(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
}

console.log('Puppeteer extensions loaded: waitForTimeout added to Page');

export default puppeteer;






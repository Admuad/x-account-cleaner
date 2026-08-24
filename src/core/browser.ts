import { chromium, Browser, BrowserContext, Page } from 'playwright';
import chalk from 'chalk';
import { AuthManager } from './auth';

export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  username: string;
  close: () => Promise<void>;
}

export class BrowserFactory {
  public static async create(headlessOption: boolean = false): Promise<BrowserInstance> {
    const session = AuthManager.loadSession();
    // If no existing session, must start headed so user can log in
    const isHeadless = session ? headlessOption : false;

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1280,850',
    ];

    let browser: Browser;

    try {
      // Primary: standard Playwright Chromium
      browser = await chromium.launch({
        headless: isHeadless,
        args: launchArgs,
      });
    } catch (primaryErr: any) {
      console.log(chalk.yellow(`⚠️ Standard Chromium launch note: ${primaryErr.message}`));
      console.log(chalk.cyan('🔄 Attempting fallback launch using local system Chrome/Edge...'));

      try {
        browser = await chromium.launch({
          headless: isHeadless,
          channel: 'chrome',
          args: launchArgs,
        });
      } catch (chromeErr) {
        // Fallback to Edge
        browser = await chromium.launch({
          headless: isHeadless,
          channel: 'msedge',
          args: launchArgs,
        });
      }
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    // Inject saved cookies if available
    await AuthManager.injectSession(context);

    const page = await context.newPage();

    // Verify authentication and get current username
    const username = await AuthManager.verifyOrPromptLogin(page, context);

    return {
      browser,
      context,
      page,
      username,
      close: async () => {
        try {
          await context.close();
          await browser.close();
        } catch (e) {
          // Ignore closing error
        }
      },
    };
  }
}

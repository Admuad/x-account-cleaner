import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { BrowserContext, Page } from 'playwright';
import { AccountSession, SessionCookie } from '../types';
import { sleep } from './ratelimit';

const SESSION_FILE = path.resolve(process.cwd(), '.session.json');

export class AuthManager {
  public static loadSession(): AccountSession | null {
    if (fs.existsSync(SESSION_FILE)) {
      try {
        const raw = fs.readFileSync(SESSION_FILE, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        console.warn(chalk.yellow('⚠️ Could not parse .session.json. Re-authentication will be required.'));
      }
    }
    return null;
  }

  public static saveSession(cookies: SessionCookie[], username?: string): void {
    const session: AccountSession = {
      username,
      cookies,
      lastLogin: new Date().toISOString(),
    };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), 'utf8');
    console.log(chalk.green(`🔒 Session securely saved to .session.json for ${username ? '@' + username : 'user'}`));
  }

  public static async injectSession(context: BrowserContext): Promise<boolean> {
    const session = this.loadSession();
    if (session && session.cookies && session.cookies.length > 0) {
      await context.addCookies(session.cookies as any);
      return true;
    }
    return false;
  }

  public static async verifyOrPromptLogin(
    page: Page,
    context: BrowserContext,
    onLoginNeeded?: () => Promise<void>
  ): Promise<string> {
    const spinner = ora('Checking X authentication status...').start();

    // Navigate to X home to test session
    try {
      await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      // Ignore initial navigation timeout if slow network
    }

    await sleep(2000);

    const currentUrl = page.url();
    const isLoggedIn =
      !currentUrl.includes('/login') &&
      !currentUrl.includes('/i/flow/login') &&
      (await page
        .locator(
          '[data-testid="SideNav_AccountSwitcher_Button"], [data-testid="AppTabBar_Home_Link"], [data-testid="tweetButtonInline"]'
        )
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false));

    if (isLoggedIn) {
      const username = await this.extractCurrentUsername(page);
      spinner.succeed(chalk.green(`Authenticated as @${username || 'active_user'}`));
      return username;
    }

    spinner.warn(chalk.yellow('No active login session found.'));

    if (onLoginNeeded) {
      await onLoginNeeded();
    }

    console.log(chalk.cyan.bold('\n======================================================'));
    console.log(chalk.cyan.bold('🔑 INTERACTIVE LOGIN REQUIRED'));
    console.log(chalk.white('Please log in to your X (Twitter) account in the browser window.'));
    console.log(chalk.gray('Complete any 2FA or CAPTCHA verification if requested.'));
    console.log(chalk.cyan.bold('======================================================\n'));

    await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded' });

    // Wait until logged in
    const loginWaitSpinner = ora('Waiting for successful login in browser...').start();

    while (true) {
      await sleep(2000);
      const url = page.url();
      const authenticated =
        !url.includes('/login') &&
        !url.includes('/i/flow/login') &&
        (await page
          .locator(
            '[data-testid="SideNav_AccountSwitcher_Button"], [data-testid="AppTabBar_Home_Link"], [data-testid="tweetButtonInline"]'
          )
          .first()
          .isVisible({ timeout: 1000 })
          .catch(() => false));

      if (authenticated) {
        break;
      }
    }

    const username = await this.extractCurrentUsername(page);
    loginWaitSpinner.succeed(chalk.green(`Login detected! Authenticated as @${username || 'user'}`));

    // Save cookies
    const cookies = await context.cookies();
    this.saveSession(cookies as SessionCookie[], username);

    return username;
  }

  public static async extractCurrentUsername(page: Page): Promise<string> {
    try {
      const accountButton = page.locator('[data-testid="SideNav_AccountSwitcher_Button"]').first();
      if (await accountButton.isVisible()) {
        const text = await accountButton.innerText();
        const match = text.match(/@([A-Za-z0-9_]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }

      // Alternative: check profile link
      const profileLink = page.locator('a[data-testid="AppTabBar_Profile_Link"]').first();
      if (await profileLink.isVisible()) {
        const href = await profileLink.getAttribute('href');
        if (href) {
          return href.replace('/', '').trim();
        }
      }
    } catch (e) {
      // Fallback
    }
    return '';
  }
}

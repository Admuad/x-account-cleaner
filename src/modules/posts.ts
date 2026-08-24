import { Page, Locator } from 'playwright';
import chalk from 'chalk';
import ora from 'ora';
import { CleanerOptions, PurgeStats } from '../types';
import { WhitelistManager } from '../core/whitelist';
import { randomDelay, sleep, handleRateLimit } from '../core/ratelimit';

export class PostPurgeEngine {
  private page: Page;
  private options: CleanerOptions;
  private whitelist: WhitelistManager;
  private stats: PurgeStats;
  private processedTweetIds: Set<string> = new Set();

  constructor(page: Page, options: CleanerOptions, whitelist: WhitelistManager, stats: PurgeStats) {
    this.page = page;
    this.options = options;
    this.whitelist = whitelist;
    this.stats = stats;
  }

  public static async extractHeaderPostCount(page: Page): Promise<number | null> {
    try {
      const headerLocator = page
        .locator(
          'div[data-testid="primaryColumn"] h2 + div, [data-testid="Header"]'
        )
        .filter({ hasText: /posts|tweets|post|tweet/i })
        .first();

      if (await headerLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
        const text = await headerLocator.innerText();
        const match = text.match(/([0-9,.]+[KMkm]?)\s*(posts|tweets|post|tweet)/i);
        if (match && match[1]) {
          const raw = match[1].replace(/,/g, '').toLowerCase();
          if (raw.endsWith('k')) return Math.round(parseFloat(raw) * 1000);
          if (raw.endsWith('m')) return Math.round(parseFloat(raw) * 1000000);
          return parseInt(raw, 10);
        }
      }
    } catch (e) {
      // Fallback
    }
    return null;
  }

  private async purgeTweetElement(article: Locator, mode: 'posts' | 'replies' | 'reposts'): Promise<boolean> {
    try {
      // 1. Check if Retweet / Repost
      const unretweetButton = article.locator('[data-testid="unretweet"]').first();
      if (await unretweetButton.isVisible({ timeout: 300 }).catch(() => false)) {
        if (this.options.dryRun) {
          this.stats.retweetsUndone++;
          return true;
        }

        await unretweetButton.click({ timeout: 1200 });
        await sleep(200);
        const confirmBtn = this.page.locator('[data-testid="unretweetConfirm"]').first();
        if (await confirmBtn.isVisible({ timeout: 1500 })) {
          await confirmBtn.click({ timeout: 1200 });
          this.stats.retweetsUndone++;
          return true;
        }
      }

      // 2. Regular Delete (Original Post, Reply, or Quote Repost)
      const caretButton = article.locator('[data-testid="caret"], button[aria-label="More"]').first();
      if (await caretButton.isVisible({ timeout: 400 }).catch(() => false)) {
        await caretButton.click({ timeout: 1200 });
        await sleep(200);

        const deleteMenuItem = this.page
          .locator('[role="menuitem"]')
          .filter({ hasText: /Delete|delete/i })
          .first();

        if (await deleteMenuItem.isVisible({ timeout: 1200 }).catch(() => false)) {
          if (this.options.dryRun) {
            if (mode === 'replies') this.stats.repliesDeleted++;
            else this.stats.postsDeleted++;
            await this.page.keyboard.press('Escape').catch(() => {});
            return true;
          }

          await deleteMenuItem.click({ timeout: 1200 });
          await sleep(200);

          const confirmBtn = this.page.locator('[data-testid="confirmationSheetConfirm"]').first();
          if (await confirmBtn.isVisible({ timeout: 1800 }).catch(() => false)) {
            await confirmBtn.click({ timeout: 1200 });
            if (mode === 'replies') this.stats.repliesDeleted++;
            else this.stats.postsDeleted++;
            return true;
          }
        } else {
          await this.page.keyboard.press('Escape').catch(() => {});
        }
      }
    } catch (e) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    return false;
  }

  public async runLive(username: string, mode: 'posts' | 'replies' | 'reposts'): Promise<void> {
    let targetUrl = `https://x.com/${username}`;
    if (mode === 'replies') {
      targetUrl = `https://x.com/${username}/with_replies`;
    } else if (mode === 'reposts') {
      targetUrl = `https://x.com/${username}/reposts`;
    }

    console.log(chalk.cyan(`\n🔍 [Worker: ${mode.toUpperCase()}] Navigating to: ${targetUrl}`));
    await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // Read initial database counter from Header
    let initialCount = await PostPurgeEngine.extractHeaderPostCount(this.page);
    if (initialCount !== null) {
      console.log(
        chalk.bold.yellow(
          `📊 [Worker: ${mode.toUpperCase()}] Header Ground Truth: ${initialCount} total account posts remaining.`
        )
      );
      if (initialCount > 3200) {
        console.log(
          chalk.gray(
            `ℹ️ Note: Account has >3,200 posts. Web timeline will purge all visible items up to X's scroll limit.`
          )
        );
      }
    }

    const spinner = ora(`[Worker: ${mode.toUpperCase()}] Scanning and purging ${mode}...`).start();
    let consecutiveEmptyScrolls = 0;
    const maxEmptyScrollsBeforeReload = 6;
    let consecutiveFullReloads = 0;
    const maxConsecutiveReloads = 5;

    // Header-Driven Autonomous Loop
    while (consecutiveFullReloads < maxConsecutiveReloads) {
      if (
        this.options.maxCount &&
        this.stats.postsDeleted + this.stats.repliesDeleted + this.stats.retweetsUndone >= this.options.maxCount
      ) {
        spinner.info(chalk.yellow(`Reached maximum target count (${this.options.maxCount}).`));
        break;
      }

      // Check for real X rate limit on page
      const hasRateLimit = await this.page
        .locator('text="Rate limit exceeded", text="Try again later", text="Something went wrong"')
        .first()
        .isVisible({ timeout: 200 })
        .catch(() => false);

      if (hasRateLimit) {
        spinner.stop();
        await handleRateLimit(true, 45);
        spinner.start(`[Worker: ${mode.toUpperCase()}] Resuming ${mode} purge...`);
      }

      const tweetCount = await this.page.locator('article[data-testid="tweet"]').count();

      if (tweetCount === 0) {
        consecutiveEmptyScrolls++;
        spinner.text = `[Worker: ${mode.toUpperCase()}] Scrolling across timeline gap (${consecutiveEmptyScrolls}/${maxEmptyScrollsBeforeReload})...`;
        await this.page.evaluate(() => window.scrollBy(0, 1500));
        await sleep(1200);

        if (consecutiveEmptyScrolls >= maxEmptyScrollsBeforeReload) {
          consecutiveFullReloads++;

          // Check if Header counter reached 0 or empty state is rendered
          const currentCount = await PostPurgeEngine.extractHeaderPostCount(this.page);
          const isEmptyState = await this.page
            .locator('[data-testid="emptyState"], [data-testid="empty_timeline"]')
            .first()
            .isVisible({ timeout: 1000 })
            .catch(() => false);

          if (currentCount === 0 || (isEmptyState && consecutiveFullReloads >= 2)) {
            spinner.succeed(
              chalk.green.bold(
                `✨ [Zero Ground Truth Confirmed] Header reports 0 posts remaining!`
              )
            );
            break;
          }

          spinner.text = `[Worker: ${mode.toUpperCase()}] Reloading timeline (Attempt ${consecutiveFullReloads}/${maxConsecutiveReloads} | Header: ${currentCount ?? 'syncing'})...`;
          await this.page.reload({ waitUntil: 'domcontentloaded' });
          await sleep(3500);
          consecutiveEmptyScrolls = 0;
        }
        continue;
      }

      let deletedInThisPass = false;

      for (let i = 0; i < tweetCount; i++) {
        const article = this.page.locator('article[data-testid="tweet"]').nth(i);

        try {
          if (!(await article.isVisible().catch(() => false))) {
            continue;
          }

          const statusLink = await article
            .locator('a[href*="/status/"]')
            .first()
            .getAttribute('href', { timeout: 1000 })
            .catch(() => null);

          const tweetId = statusLink ? statusLink.split('/status/')[1]?.split('?')[0]?.split('/')[0] : null;

          if (tweetId && this.processedTweetIds.has(tweetId)) {
            continue;
          }

          if (tweetId) {
            this.processedTweetIds.add(tweetId);
          }

          // Check Whitelist
          const tweetText = await article.locator('[data-testid="tweetText"]').first().innerText({ timeout: 400 }).catch(() => '');
          if (tweetId && this.whitelist.isTweetWhitelisted(tweetId, tweetText)) {
            this.stats.skippedWhitelist++;
            spinner.text = `[Worker: ${mode.toUpperCase()}] [Whitelist] Preserved: ${tweetId}`;
            continue;
          }

          const success = await this.purgeTweetElement(article, mode);
          if (success) {
            deletedInThisPass = true;
            const totalDeleted = this.stats.postsDeleted + this.stats.repliesDeleted + this.stats.retweetsUndone;
            spinner.succeed(
              chalk.green(
                `🗑️ [Worker: ${mode.toUpperCase()}] Purged ${mode === 'reposts' ? 'repost' : (mode === 'replies' ? 'reply' : 'post')} (#${totalDeleted}) [${tweetId || 'item'}]`
              )
            );
            spinner.start(`[Worker: ${mode.toUpperCase()}] Continuing ${mode} purge...`);
            await randomDelay(this.options.minDelay || 400, this.options.maxDelay || 1200);
            break; // Refresh DOM locators
          }
        } catch (err: any) {
          await this.page.keyboard.press('Escape').catch(() => {});
        }
      }

      if (deletedInThisPass) {
        consecutiveEmptyScrolls = 0;
        consecutiveFullReloads = 0; // Reset reload count if we actively deleted items
      } else {
        consecutiveEmptyScrolls++;
        await this.page.evaluate(() => window.scrollBy(0, 1200));
        await sleep(1000);

        if (consecutiveEmptyScrolls >= maxEmptyScrollsBeforeReload) {
          consecutiveFullReloads++;
          const currentCount = await PostPurgeEngine.extractHeaderPostCount(this.page);
          spinner.text = `[Worker: ${mode.toUpperCase()}] Reloading timeline (Attempt ${consecutiveFullReloads}/${maxConsecutiveReloads} | Header: ${currentCount ?? 'syncing'})...`;
          await this.page.reload({ waitUntil: 'domcontentloaded' });
          await sleep(3500);
          consecutiveEmptyScrolls = 0;
        }
      }
    }

    // ========================================================
    // ZERO-STATE VERIFICATION PASS (Header-Checked)
    // ========================================================
    spinner.text = `[Worker: ${mode.toUpperCase()}] [Zero-State Verification] Reloading timeline to confirm 100% clean status...`;
    let verificationPass = 0;
    const maxVerificationCycles = 4;

    while (verificationPass < maxVerificationCycles) {
      verificationPass++;
      await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await sleep(3500);

      const headerCount = await PostPurgeEngine.extractHeaderPostCount(this.page);
      const isEmptyStateVisible = await this.page
        .locator(
          '[data-testid="emptyState"], [data-testid="empty_timeline"], text="You haven’t posted", text="You haven\'t posted", text="hasn’t posted", text="No reposts yet", text="No posts yet", text="Posts will show up here"'
        )
        .first()
        .isVisible({ timeout: 1500 })
        .catch(() => false);

      const residualCount = await this.page.locator('article[data-testid="tweet"]').count();

      if (residualCount > 0) {
        spinner.warn(
          chalk.yellow(
            `\n🧹 [Worker: ${mode.toUpperCase()}] [Zero-State Verification] Found ${residualCount} residual item(s) on fresh reload (Cycle ${verificationPass}/${maxVerificationCycles} | Header: ${headerCount ?? 'syncing'}). Sweeping clean...`
          )
        );
        spinner.start(`Sweeping residual ${mode}...`);

        let sweptAny = false;
        for (let j = 0; j < residualCount; j++) {
          const residualArticle = this.page.locator('article[data-testid="tweet"]').nth(j);
          if (!(await residualArticle.isVisible().catch(() => false))) continue;

          const swept = await this.purgeTweetElement(residualArticle, mode);
          if (swept) {
            sweptAny = true;
            spinner.succeed(chalk.green(`🧹 [Worker: ${mode.toUpperCase()}] Clean-swept residual item`));
            await randomDelay(this.options.minDelay || 400, this.options.maxDelay || 1200);
            break;
          }
        }

        if (sweptAny) {
          continue; // Re-verify
        }
      }

      if (headerCount === 0 || isEmptyStateVisible || residualCount === 0) {
        spinner.succeed(
          chalk.green.bold(
            `✨ [Worker: ${mode.toUpperCase()}] [Zero-State Confirmed] Timeline is 100% clean! Zero residual ${mode} remain.`
          )
        );
        break;
      }
    }

    spinner.succeed(
      chalk.green(
        `[Worker: ${mode.toUpperCase()}] Finished! Processed: ${this.stats.postsDeleted} posts, ${this.stats.repliesDeleted} replies, ${this.stats.retweetsUndone} un-retweets/reposts.`
      )
    );
  }
}

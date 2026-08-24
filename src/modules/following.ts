import { Page } from 'playwright';
import chalk from 'chalk';
import ora from 'ora';
import { CleanerOptions, PurgeStats } from '../types';
import { WhitelistManager } from '../core/whitelist';
import { randomDelay, sleep, handleRateLimit } from '../core/ratelimit';

export class FollowingPurgeEngine {
  private page: Page;
  private options: CleanerOptions;
  private whitelist: WhitelistManager;
  private stats: PurgeStats;
  private processedUsernames: Set<string> = new Set();

  constructor(page: Page, options: CleanerOptions, whitelist: WhitelistManager, stats: PurgeStats) {
    this.page = page;
    this.options = options;
    this.whitelist = whitelist;
    this.stats = stats;
  }

  public static async extractFollowingCount(page: Page): Promise<number | null> {
    try {
      const link = page.locator('a[href$="/following"]').first();
      if (await link.isVisible({ timeout: 1500 }).catch(() => false)) {
        const text = await link.innerText();
        const match = text.match(/([0-9,.]+[KMkm]?)\s*Following/i);
        if (match && match[1]) {
          const raw = match[1].replace(/,/g, '').toLowerCase();
          if (raw.endsWith('k')) return Math.round(parseFloat(raw) * 1000);
          if (raw.endsWith('m')) return Math.round(parseFloat(raw) * 1000000);
          return parseInt(raw, 10);
        }
      }
    } catch (e) {}
    return null;
  }

  public async run(username: string): Promise<void> {
    const followingUrl = `https://x.com/${username}/following`;
    console.log(chalk.cyan(`\n👥 [Worker: Following] Navigating to: ${followingUrl}`));

    await this.page.goto(followingUrl, { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    const initialCount = await FollowingPurgeEngine.extractFollowingCount(this.page);
    if (initialCount !== null) {
      console.log(
        chalk.bold.yellow(
          `📊 [Worker: Following] Target Account Ground Truth: ${initialCount} Following remaining.`
        )
      );
    }

    const spinner = ora('[Worker: Following] Scanning and unfollowing accounts...').start();
    let consecutiveEmptyScrolls = 0;
    const maxEmptyScrollsBeforeReload = 6;
    let consecutiveFullReloads = 0;
    const maxConsecutiveReloads = 5;
    let consecutiveFailedUnfollows = 0;

    while (consecutiveFullReloads < maxConsecutiveReloads) {
      if (this.options.maxCount && this.stats.accountsUnfollowed >= this.options.maxCount) {
        spinner.info(chalk.yellow(`Reached maximum target unfollow count (${this.options.maxCount}).`));
        break;
      }

      // Check for real X rate limit on page
      const hasRateLimit = await this.page
        .locator('text="Rate limit exceeded", text="Try again later", text="unable to follow", text="Something went wrong"')
        .first()
        .isVisible({ timeout: 200 })
        .catch(() => false);

      if (hasRateLimit || consecutiveFailedUnfollows >= 4) {
        spinner.warn(
          chalk.yellow.bold(
            '\n⚠️  X Relationship Limit / Anti-Spam Cooldown detected (X limits unfollows to ~500/day).'
          )
        );
        spinner.stop();
        await handleRateLimit(true, 60);
        consecutiveFailedUnfollows = 0;
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await sleep(3000);
        spinner.start('[Worker: Following] Resuming unfollow operations...');
      }

      const cellCount = await this.page.locator('[data-testid="UserCell"]').count();

      if (cellCount === 0) {
        consecutiveEmptyScrolls++;
        spinner.text = `[Worker: Following] Scrolling to load more accounts (${consecutiveEmptyScrolls}/${maxEmptyScrollsBeforeReload})...`;
        await this.page.evaluate(() => window.scrollBy(0, 1200));
        await sleep(1200);

        if (consecutiveEmptyScrolls >= maxEmptyScrollsBeforeReload) {
          consecutiveFullReloads++;
          const currentCount = await FollowingPurgeEngine.extractFollowingCount(this.page);
          const isEmptyState = await this.page
            .locator('[data-testid="emptyState"], [data-testid="empty_timeline"]')
            .first()
            .isVisible({ timeout: 1000 })
            .catch(() => false);

          if (currentCount === 0 || (isEmptyState && consecutiveFullReloads >= 2)) {
            spinner.succeed(
              chalk.green.bold(
                `✨ [Zero Ground Truth Confirmed] Following list reached 0 remaining!`
              )
            );
            break;
          }

          spinner.text = `[Worker: Following] Reloading Following list (Attempt ${consecutiveFullReloads}/${maxConsecutiveReloads} | Remaining: ${currentCount ?? 'syncing'})...`;
          await this.page.reload({ waitUntil: 'domcontentloaded' });
          await sleep(3500);
          consecutiveEmptyScrolls = 0;
        }
        continue;
      }

      let unfollowedInThisPass = false;

      for (let i = 0; i < cellCount; i++) {
        const cell = this.page.locator('[data-testid="UserCell"]').nth(i);

        try {
          if (!(await cell.isVisible().catch(() => false))) {
            continue;
          }

          // Extract exact username from profile anchor link
          const userLink = cell.locator('a[role="link"][href^="/"]').first();
          let handle: string | null = null;

          if (await userLink.isVisible({ timeout: 400 }).catch(() => false)) {
            const href = await userLink.getAttribute('href').catch(() => null);
            if (href && !href.includes('/status/') && !href.includes('/explore') && !href.includes('/i/')) {
              handle = href.replace('/', '').split('/')[0].split('?')[0].trim();
            }
          }

          if (!handle) {
            const cellText = await cell.innerText({ timeout: 400 }).catch(() => '');
            const match = cellText.match(/@([A-Za-z0-9_]+)/);
            handle = match ? match[1] : null;
          }

          if (handle && this.processedUsernames.has(handle.toLowerCase())) {
            continue;
          }

          if (handle) {
            this.processedUsernames.add(handle.toLowerCase());
          }

          // Check Whitelist
          if (handle && this.whitelist.isUserWhitelisted(handle)) {
            this.stats.skippedWhitelist++;
            spinner.text = `[Worker: Following] [Whitelist] Preserved: @${handle}`;
            continue;
          }

          // Find unfollow button (must be currently Following)
          const unfollowBtn = cell.locator('button[data-testid$="-unfollow"], button:has-text("Following")').first();

          if (!(await unfollowBtn.isVisible({ timeout: 400 }).catch(() => false))) {
            continue;
          }

          if (this.options.dryRun) {
            spinner.info(chalk.magenta(`[DRY RUN] Would unfollow @${handle || 'user'}`));
            this.stats.accountsUnfollowed++;
            continue;
          }

          await unfollowBtn.click({ timeout: 1500 });
          await sleep(200);

          // Confirm unfollow modal
          const confirmBtn = this.page.locator('[data-testid="confirmationSheetConfirm"]').first();
          if (await confirmBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
            await confirmBtn.click({ timeout: 1500 });

            // Verify state changed
            await sleep(300);
            const isStillFollowing = await cell
              .locator('button:has-text("Following")')
              .first()
              .isVisible({ timeout: 500 })
              .catch(() => false);

            if (!isStillFollowing) {
              this.stats.accountsUnfollowed++;
              unfollowedInThisPass = true;
              consecutiveFailedUnfollows = 0;

              spinner.succeed(
                chalk.green(`👋 [Worker: Following] Unfollowed @${handle || 'user'} (#${this.stats.accountsUnfollowed})`)
              );
              spinner.start('[Worker: Following] Continuing unfollow operations...');

              await randomDelay(this.options.minDelay || 400, this.options.maxDelay || 1200);
              break; // Refresh DOM cell locators immediately
            } else {
              consecutiveFailedUnfollows++;
            }
          }
        } catch (err: any) {
          // Ignore transient stale DOM errors
        }
      }

      if (unfollowedInThisPass) {
        consecutiveEmptyScrolls = 0;
        consecutiveFullReloads = 0;
      } else {
        consecutiveEmptyScrolls++;
        await this.page.evaluate(() => window.scrollBy(0, 1000));
        await sleep(1000);

        if (consecutiveEmptyScrolls >= maxEmptyScrollsBeforeReload) {
          consecutiveFullReloads++;
          const currentCount = await FollowingPurgeEngine.extractFollowingCount(this.page);
          spinner.text = `[Worker: Following] Reloading Following list (Attempt ${consecutiveFullReloads}/${maxConsecutiveReloads} | Remaining: ${currentCount ?? 'syncing'})...`;
          await this.page.reload({ waitUntil: 'domcontentloaded' });
          await sleep(3500);
          consecutiveEmptyScrolls = 0;
        }
      }
    }

    // Zero-State Verification Pass
    spinner.text = `[Worker: Following] Verifying final clean Following state...`;
    await this.page.goto(followingUrl, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    const finalFollowing = await FollowingPurgeEngine.extractFollowingCount(this.page);

    spinner.succeed(
      chalk.green(
        `[Worker: Following] Completed! Total verified unfollowed: ${this.stats.accountsUnfollowed} (Remaining on account: ${finalFollowing ?? 0})`
      )
    );
  }
}

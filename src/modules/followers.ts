import { Page } from 'playwright';
import chalk from 'chalk';
import ora from 'ora';
import { CleanerOptions, PurgeStats } from '../types';
import { WhitelistManager } from '../core/whitelist';
import { randomDelay, sleep, handleRateLimit } from '../core/ratelimit';

export class FollowerPurgeEngine {
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

  public async run(username: string): Promise<void> {
    const urls = [
      `https://x.com/${username}/followers`,
      `https://x.com/${username}/verified_followers`,
    ];

    for (const followersUrl of urls) {
      console.log(chalk.cyan(`\n👤 [Worker: Followers] Navigating to: ${followersUrl}`));
      await this.page.goto(followersUrl, { waitUntil: 'domcontentloaded' });
      await sleep(2500);

      const spinner = ora('[Worker: Followers] Scanning and removing followers...').start();
      let consecutiveEmptyScrolls = 0;
      const maxEmptyScrolls = 5;
      let reloadCount = 0;
      const maxReloads = 4;

      while (reloadCount < maxReloads) {
        if (this.options.maxCount && this.stats.followersRemoved >= this.options.maxCount) {
          spinner.info(chalk.yellow(`Reached maximum target follower removal count (${this.options.maxCount}).`));
          break;
        }

        // Check for real rate limit
        const hasRateLimit = await this.page
          .locator('text="Rate limit exceeded", text="Try again later", text="Something went wrong"')
          .first()
          .isVisible({ timeout: 200 })
          .catch(() => false);

        if (hasRateLimit) {
          spinner.stop();
          await handleRateLimit(true, 45);
          spinner.start('[Worker: Followers] Resuming follower removals...');
        }

        const cellCount = await this.page.locator('[data-testid="UserCell"]').count();

        if (cellCount === 0) {
          consecutiveEmptyScrolls++;
          spinner.text = `[Worker: Followers] Scrolling to load more followers (${consecutiveEmptyScrolls}/${maxEmptyScrolls})...`;
          await this.page.evaluate(() => window.scrollBy(0, 1200));
          await sleep(1500);

          if (consecutiveEmptyScrolls >= maxEmptyScrolls) {
            reloadCount++;
            spinner.text = `[Worker: Followers] Reloading page to fetch next batch (${reloadCount}/${maxReloads})...`;
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await sleep(3500);
            consecutiveEmptyScrolls = 0;
          }
          continue;
        }

        let removedInThisPass = false;

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
              spinner.text = `[Worker: Followers] [Whitelist] Preserved: @${handle}`;
              continue;
            }

            const menuBtn = cell
              .locator('[data-testid="userFollowActions"], button[aria-label="More"], [data-testid="caret"]')
              .first();

            if (!(await menuBtn.isVisible({ timeout: 400 }).catch(() => false))) {
              continue;
            }

            if (this.options.dryRun) {
              spinner.info(chalk.magenta(`[DRY RUN] Would remove follower @${handle || 'user'}`));
              this.stats.followersRemoved++;
              continue;
            }

            await menuBtn.click({ timeout: 1500 });
            await sleep(200);

            // Method 1: "Remove this follower"
            const removeFollowerItem = this.page
              .locator('[role="menuitem"]')
              .filter({ hasText: /Remove this follower|Remove follower/i })
              .first();

            if (await removeFollowerItem.isVisible({ timeout: 1500 }).catch(() => false)) {
              await removeFollowerItem.click({ timeout: 1500 });
              await sleep(200);

              const confirmBtn = this.page.locator('[data-testid="confirmationSheetConfirm"]').first();
              if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await confirmBtn.click({ timeout: 1500 });
                this.stats.followersRemoved++;
                removedInThisPass = true;

                spinner.succeed(
                  chalk.green(`🚫 [Worker: Followers] Removed follower @${handle || 'user'} (#${this.stats.followersRemoved})`)
                );
                spinner.start('[Worker: Followers] Continuing follower removals...');

                await randomDelay(this.options.minDelay || 400, this.options.maxDelay || 1200);
                break; // Refresh cells
              }
            } else {
              // Method 2: Soft-block fallback
              const blockItem = this.page
                .locator('[role="menuitem"]')
                .filter({ hasText: /Block @/i })
                .first();

              if (await blockItem.isVisible({ timeout: 1200 }).catch(() => false)) {
                await blockItem.click({ timeout: 1200 });
                await sleep(250);

                const confirmBlock = this.page.locator('[data-testid="confirmationSheetConfirm"]').first();
                if (await confirmBlock.isVisible({ timeout: 1500 })) {
                  await confirmBlock.click({ timeout: 1500 });
                  await sleep(350);

                  const unblockBtn = cell.locator('button:has-text("Blocked"), button[data-testid$="-unblock"]').first();
                  if (await unblockBtn.isVisible({ timeout: 1500 })) {
                    await unblockBtn.click({ timeout: 1500 });
                    await sleep(250);
                    const confirmUnblock = this.page.locator('[data-testid="confirmationSheetConfirm"]').first();
                    if (await confirmUnblock.isVisible({ timeout: 1500 })) {
                      await confirmUnblock.click({ timeout: 1500 });
                    }
                  }

                  this.stats.followersRemoved++;
                  removedInThisPass = true;
                  spinner.succeed(
                    chalk.green(
                      `🚫 [Worker: Followers] Soft-blocked & removed @${handle || 'user'} (#${this.stats.followersRemoved})`
                    )
                  );
                  spinner.start('[Worker: Followers] Continuing follower removals...');
                  await randomDelay(this.options.minDelay || 400, this.options.maxDelay || 1200);
                  break;
                }
              } else {
                await this.page.keyboard.press('Escape');
              }
            }
          } catch (err: any) {
            await this.page.keyboard.press('Escape').catch(() => {});
          }
        }

        if (removedInThisPass) {
          consecutiveEmptyScrolls = 0;
          reloadCount = 0;
        } else {
          consecutiveEmptyScrolls++;
          await this.page.evaluate(() => window.scrollBy(0, 1000));
          await sleep(1000);

          if (consecutiveEmptyScrolls >= maxEmptyScrolls) {
            reloadCount++;
            spinner.text = `[Worker: Followers] Reloading page to fetch next batch (${reloadCount}/${maxReloads})...`;
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await sleep(3500);
            consecutiveEmptyScrolls = 0;
          }
        }
      }

      spinner.succeed(
        chalk.green(`[Worker: Followers] Completed! Total removed: ${this.stats.followersRemoved}`)
      );
    }
  }
}

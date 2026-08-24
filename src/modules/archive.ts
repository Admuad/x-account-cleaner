import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { Page } from 'playwright';
import chalk from 'chalk';
import ora from 'ora';
import { CleanerOptions, PurgeStats, ArchiveTweet } from '../types';
import { WhitelistManager } from '../core/whitelist';
import { randomDelay, sleep, handleRateLimit } from '../core/ratelimit';

export class ArchivePurgeEngine {
  private page: Page;
  private options: CleanerOptions;
  private whitelist: WhitelistManager;
  private stats: PurgeStats;

  constructor(page: Page, options: CleanerOptions, whitelist: WhitelistManager, stats: PurgeStats) {
    this.page = page;
    this.options = options;
    this.whitelist = whitelist;
    this.stats = stats;
  }

  public static parseArchiveFile(filePath: string): ArchiveTweet[] {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Archive file not found at: ${fullPath}`);
    }

    let rawContent = '';

    if (fullPath.endsWith('.zip')) {
      const zip = new AdmZip(fullPath);
      const zipEntries = zip.getEntries();

      const tweetEntry = zipEntries.find(
        (e) =>
          e.entryName.includes('data/tweets.js') ||
          e.entryName.includes('data/tweet.js') ||
          e.entryName.endsWith('tweets.js') ||
          e.entryName.endsWith('tweets.json')
      );

      if (!tweetEntry) {
        throw new Error('Could not find data/tweets.js or tweets.json inside the provided ZIP archive.');
      }

      rawContent = tweetEntry.getData().toString('utf8');
    } else {
      rawContent = fs.readFileSync(fullPath, 'utf8');
    }

    // Strip window.YTD.tweet.part0 = or window.YTD.tweets.part0 =
    const jsonStr = rawContent.replace(/^window\.YTD\.[a-zA-Z0-9_.]+\s*=\s*/, '').trim();

    try {
      const parsed = JSON.parse(jsonStr);
      const tweets: ArchiveTweet[] = [];

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const t = item.tweet || item;
          if (t && (t.id_str || t.id)) {
            tweets.push({
              id: t.id_str || t.id,
              full_text: t.full_text || t.text || '',
              created_at: t.created_at,
              in_reply_to_status_id: t.in_reply_to_status_id_str || t.in_reply_to_status_id,
            });
          }
        }
      }

      return tweets;
    } catch (e: any) {
      throw new Error(`Failed to parse tweets archive JSON: ${e.message}`);
    }
  }

  public async runArchive(archivePath: string): Promise<void> {
    const spinner = ora('Loading and parsing Twitter Archive...').start();
    let tweets: ArchiveTweet[] = [];

    try {
      tweets = ArchivePurgeEngine.parseArchiveFile(archivePath);
      spinner.succeed(chalk.green(`Parsed ${tweets.length} total tweets/replies from archive.`));
    } catch (err: any) {
      spinner.fail(chalk.red(`Error loading archive: ${err.message}`));
      return;
    }

    if (tweets.length === 0) {
      console.log(chalk.yellow('No tweets found in archive.'));
      return;
    }

    console.log(chalk.cyan(`\n🚀 Starting historical deletion of ${tweets.length} archive items...`));

    let index = 0;
    for (const tweet of tweets) {
      index++;

      if (this.options.maxCount && this.stats.postsDeleted + this.stats.repliesDeleted >= this.options.maxCount) {
        console.log(chalk.yellow(`\nReached maximum target limit (${this.options.maxCount}).`));
        break;
      }

      // Check if user specified only posts or only replies
      const isReply = Boolean(tweet.in_reply_to_status_id);
      if (this.options.posts && !this.options.replies && isReply) {
        continue;
      }
      if (this.options.replies && !this.options.posts && !isReply) {
        continue;
      }

      // Whitelist check
      if (this.whitelist.isTweetWhitelisted(tweet.id, tweet.full_text, tweet.created_at)) {
        this.stats.skippedWhitelist++;
        console.log(chalk.gray(`[Whitelist] Skipped preserved tweet ${tweet.id}`));
        continue;
      }

      if (this.options.dryRun) {
        console.log(
          chalk.magenta(
            `[DRY RUN] (${index}/${tweets.length}) Would delete ${isReply ? 'Reply' : 'Post'} [${tweet.id}]: "${tweet.full_text?.slice(0, 45)}..."`
          )
        );
        if (isReply) this.stats.repliesDeleted++;
        else this.stats.postsDeleted++;
        continue;
      }

      const tweetUrl = `https://x.com/i/status/${tweet.id}`;
      try {
        await this.page.goto(tweetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await sleep(1500);

        // Check if tweet already deleted or non-existent
        const isNotFound = await this.page
          .locator('text="Hmm... this page doesn’t exist", text="This Post was deleted"')
          .first()
          .isVisible()
          .catch(() => false);

        if (isNotFound) {
          console.log(chalk.gray(`(${index}/${tweets.length}) Tweet ${tweet.id} already deleted or not found.`));
          continue;
        }

        // Try unretweet first
        const unretweetBtn = this.page.locator('[data-testid="unretweet"]').first();
        if (await unretweetBtn.isVisible().catch(() => false)) {
          await unretweetBtn.click();
          await sleep(500);
          const confirmBtn = this.page.locator('[data-testid="unretweetConfirm"]').first();
          if (await confirmBtn.isVisible({ timeout: 2000 })) {
            await confirmBtn.click();
            this.stats.retweetsUndone++;
            console.log(chalk.red(`(${index}/${tweets.length}) 🔄 Undid retweet for status ${tweet.id}`));
            await randomDelay(this.options.minDelay || 1500, this.options.maxDelay || 3000);
            continue;
          }
        }

        // Look for caret / more button on main tweet
        const caret = this.page.locator('article[data-testid="tweet"] [data-testid="caret"]').first();
        if (await caret.isVisible({ timeout: 4000 }).catch(() => false)) {
          await caret.click();
          await sleep(500);

          const deleteItem = this.page.locator('[role="menuitem"]').filter({ hasText: /Delete|delete/ }).first();
          if (await deleteItem.isVisible({ timeout: 2000 })) {
            await deleteItem.click();
            await sleep(500);

            const confirmDelete = this.page.locator('[data-testid="confirmationSheetConfirm"]').first();
            if (await confirmDelete.isVisible({ timeout: 3000 })) {
              await confirmDelete.click();
              if (isReply) this.stats.repliesDeleted++;
              else this.stats.postsDeleted++;

              console.log(
                chalk.red(
                  `(${index}/${tweets.length}) 🗑️ Deleted ${isReply ? 'reply' : 'post'} [${tweet.id}]: "${tweet.full_text?.slice(0, 40)}..."`
                )
              );
              await randomDelay(this.options.minDelay || 1500, this.options.maxDelay || 3500);
            }
          } else {
            await this.page.keyboard.press('Escape');
          }
        }
      } catch (err: any) {
        this.stats.errors++;
        if (err?.message?.includes('rate limit') || err?.message?.includes('Timeout')) {
          await handleRateLimit(true, 60);
        }
      }
    }

    console.log(
      chalk.green(
        `\n✅ Archive processing finished! Deleted: ${this.stats.postsDeleted} posts, ${this.stats.repliesDeleted} replies, ${this.stats.retweetsUndone} unretweets.`
      )
    );
  }
}

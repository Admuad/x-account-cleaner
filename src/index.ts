#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { CleanerOptions, PurgeStats } from './types';
import { CLIUI } from './cli/ui';
import { CLIWizard } from './cli/wizard';
import { WhitelistManager } from './core/whitelist';
import { BrowserFactory, BrowserInstance } from './core/browser';
import { PostPurgeEngine } from './modules/posts';
import { ArchivePurgeEngine } from './modules/archive';
import { FollowingPurgeEngine } from './modules/following';
import { FollowerPurgeEngine } from './modules/followers';

const program = new Command();

program
  .name('vanishx')
  .description('VanishX — Autonomous tool to wipe X posts, replies, reposts, unfollow accounts, and remove followers')
  .version('2.0.0')
  .option('-p, --posts', 'Delete original posts')
  .option('-r, --replies', 'Delete replies')
  .option('-k, --reposts', 'Undo reposts and retweets')
  .option('-u, --unfollow', 'Unfollow accounts')
  .option('-f, --followers', 'Remove followers')
  .option('-a, --all', 'Full clean slate (posts + replies + reposts + unfollow + followers)')
  .option('--parallel', 'Run operations in parallel multi-tab workers for 2x-4x speedup', false)
  .option('-d, --dry-run', 'Simulation mode (preview actions without executing deletions)', false)
  .option('--archive <path>', 'Path to twitter-archive.zip or tweets.js for complete historical deletion')
  .option('--min-delay <ms>', 'Minimum randomized delay per action in ms', '400')
  .option('--max-delay <ms>', 'Maximum randomized delay per action in ms', '1200')
  .option('--whitelist <path>', 'Custom path to whitelist JSON file', 'whitelist.json')
  .option('--headless', 'Run browser in headless mode', false)
  .option('--max-count <number>', 'Maximum items to process per operation')
  .option('--non-mutuals-only', 'Only unfollow accounts that do not follow you back (preserves mutuals)', false)
  .option('--bots-only', 'Only unfollow flagged bots (default avatar, numeric handles, empty bios)', false);

async function main() {
  CLIUI.printBanner();
  program.parse(process.argv);
  const rawOpts = program.opts();

  let options: CleanerOptions;

  const hasDirectFlags =
    rawOpts.posts ||
    rawOpts.replies ||
    rawOpts.reposts ||
    rawOpts.unfollow ||
    rawOpts.followers ||
    rawOpts.all ||
    rawOpts.archive ||
    rawOpts.nonMutualsOnly ||
    rawOpts.botsOnly;

  if (!hasDirectFlags) {
    options = await CLIWizard.promptOptions();
  } else {
    options = {
      posts: rawOpts.all || Boolean(rawOpts.posts),
      replies: rawOpts.all || Boolean(rawOpts.replies),
      reposts: rawOpts.all || Boolean(rawOpts.reposts),
      unfollow: rawOpts.all || Boolean(rawOpts.unfollow) || Boolean(rawOpts.nonMutualsOnly) || Boolean(rawOpts.botsOnly),
      followers: rawOpts.all || Boolean(rawOpts.followers),
      all: Boolean(rawOpts.all),
      parallel: Boolean(rawOpts.parallel),
      dryRun: Boolean(rawOpts.dryRun),
      archivePath: rawOpts.archive,
      minDelay: parseInt(rawOpts.minDelay, 10) || 400,
      maxDelay: parseInt(rawOpts.maxDelay, 10) || 1200,
      whitelistPath: rawOpts.whitelist,
      headless: Boolean(rawOpts.headless),
      maxCount: rawOpts.maxCount ? parseInt(rawOpts.maxCount, 10) : undefined,
      nonMutualsOnly: Boolean(rawOpts.nonMutualsOnly),
      botsOnly: Boolean(rawOpts.botsOnly),
    };
  }

  const whitelist = new WhitelistManager(options.whitelistPath);
  const whitelistSummary = whitelist.getSummary();

  const stats: PurgeStats = {
    postsDeleted: 0,
    repliesDeleted: 0,
    retweetsUndone: 0,
    accountsUnfollowed: 0,
    followersRemoved: 0,
    skippedWhitelist: 0,
    errors: 0,
    startTime: Date.now(),
  };

  let browserInstance: BrowserInstance | null = null;

  try {
    browserInstance = await BrowserFactory.create(options.headless);
    const username = browserInstance.username || 'user';

    CLIUI.printConfig(username, options, whitelistSummary);

    const activeTasks: Promise<void>[] = [];

    if (options.parallel) {
      console.log(chalk.yellow.bold('⚡ PARALLEL CONCURRENT MODE ACTIVE (Multi-Tab Workers)'));

      if (options.archivePath) {
        const archiveEngine = new ArchivePurgeEngine(browserInstance.page, options, whitelist, stats);
        activeTasks.push(archiveEngine.runArchive(options.archivePath));
      } else {
        if (options.posts || options.all) {
          const postsPage = await browserInstance.context.newPage();
          const postsEngine = new PostPurgeEngine(postsPage, options, whitelist, stats);
          activeTasks.push(postsEngine.runLive(username, 'posts').finally(() => postsPage.close().catch(() => {})));
        }

        if (options.replies || options.all) {
          const repliesPage = await browserInstance.context.newPage();
          const repliesEngine = new PostPurgeEngine(repliesPage, options, whitelist, stats);
          activeTasks.push(repliesEngine.runLive(username, 'replies').finally(() => repliesPage.close().catch(() => {})));
        }

        if (options.reposts || options.all) {
          const repostsPage = await browserInstance.context.newPage();
          const repostsEngine = new PostPurgeEngine(repostsPage, options, whitelist, stats);
          activeTasks.push(repostsEngine.runLive(username, 'reposts').finally(() => repostsPage.close().catch(() => {})));
        }
      }

      if (options.unfollow || options.all) {
        const followingPage = await browserInstance.context.newPage();
        const followingEngine = new FollowingPurgeEngine(followingPage, options, whitelist, stats);
        activeTasks.push(followingEngine.run(username).finally(() => followingPage.close().catch(() => {})));
      }

      if (options.followers || options.all) {
        const followersPage = await browserInstance.context.newPage();
        const followersEngine = new FollowerPurgeEngine(followersPage, options, whitelist, stats);
        activeTasks.push(followersEngine.run(username).finally(() => followersPage.close().catch(() => {})));
      }

      await Promise.all(activeTasks);
    } else {
      // Sequential Execution
      if (options.archivePath) {
        const archiveEngine = new ArchivePurgeEngine(browserInstance.page, options, whitelist, stats);
        await archiveEngine.runArchive(options.archivePath);
      } else {
        if (options.posts || options.all) {
          const postsEngine = new PostPurgeEngine(browserInstance.page, options, whitelist, stats);
          await postsEngine.runLive(username, 'posts');
        }

        if (options.replies || options.all) {
          const repliesEngine = new PostPurgeEngine(browserInstance.page, options, whitelist, stats);
          await repliesEngine.runLive(username, 'replies');
        }

        if (options.reposts || options.all) {
          const repostsEngine = new PostPurgeEngine(browserInstance.page, options, whitelist, stats);
          await repostsEngine.runLive(username, 'reposts');
        }
      }

      if (options.unfollow || options.all) {
        const followingEngine = new FollowingPurgeEngine(browserInstance.page, options, whitelist, stats);
        await followingEngine.run(username);
      }

      if (options.followers || options.all) {
        const followerEngine = new FollowerPurgeEngine(browserInstance.page, options, whitelist, stats);
        await followerEngine.run(username);
      }
    }

    CLIUI.printSummary(stats, options.dryRun);
  } catch (err: any) {
    console.error(chalk.red.bold(`\n❌ Fatal Error: ${err.message}`));
  } finally {
    if (browserInstance) {
      await browserInstance.close();
    }
  }
}

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️ Process interrupted by user. Exiting safely...'));
  process.exit(0);
});

main();

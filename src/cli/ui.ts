import chalk from 'chalk';
import { PurgeStats } from '../types';

export class CLIUI {
  public static printBanner(): void {
    console.log(chalk.redBright.bold(`
   ██╗   ██╗ █████╗ ███╗   ██╗██╗███████╗██╗  ██╗██╗  ██╗
   ██║   ██║██╔══██╗████╗  ██║██║██╔════╝██║  ██║╚██╗██╔╝
   ██║   ██║███████║██╔██╗ ██║██║███████╗███████║ ╚███╔╝ 
   ╚██╗ ██╔╝██╔══██║██║╚██╗██║██║╚════██║██╔══██║ ██╔██╗ 
    ╚████╔╝ ██║  ██║██║ ╚████║██║███████║██║  ██║██╔╝ ██╗
     ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
    `));
    console.log(chalk.gray('  ⚡ VanishX Autonomous 𝕏 Clean Slate Engine • Playwright-Powered • 100% Free\n'));
  }

  public static printConfig(
    username: string,
    options: {
      dryRun?: boolean;
      posts?: boolean;
      replies?: boolean;
      reposts?: boolean;
      unfollow?: boolean;
      followers?: boolean;
      all?: boolean;
      archivePath?: string;
    },
    whitelistStats: { usernamesCount: number; tweetIdsCount: number; keywordsCount: number }
  ): void {
    console.log(chalk.bold.white('⚙️  Active Configuration:'));
    console.log(chalk.gray('──────────────────────────────────────────────────'));
    console.log(`  Account       : ${chalk.green.bold('@' + (username || 'unknown'))}`);
    console.log(`  Mode          : ${options.dryRun ? chalk.magenta.bold('SIMULATION (DRY RUN)') : chalk.red.bold('LIVE EXECUTION')}`);
    console.log(`  Target Posts  : ${options.posts || options.all ? chalk.green('ENABLED') : chalk.gray('Disabled')}`);
    console.log(`  Target Replies: ${options.replies || options.all ? chalk.green('ENABLED') : chalk.gray('Disabled')}`);
    console.log(`  Target Reposts: ${options.reposts || options.all ? chalk.green('ENABLED') : chalk.gray('Disabled')}`);
    console.log(`  Unfollow All  : ${options.unfollow || options.all ? chalk.green('ENABLED') : chalk.gray('Disabled')}`);
    console.log(`  Remove Follow : ${options.followers || options.all ? chalk.green('ENABLED') : chalk.gray('Disabled')}`);
    if (options.archivePath) {
      console.log(`  Archive Data  : ${chalk.yellow(options.archivePath)}`);
    }
    console.log(
      `  Whitelist     : ${chalk.cyan(
        `${whitelistStats.usernamesCount} accounts, ${whitelistStats.tweetIdsCount} tweets, ${whitelistStats.keywordsCount} keywords protected`
      )}`
    );
    console.log(chalk.gray('──────────────────────────────────────────────────\n'));
  }

  public static printSummary(stats: PurgeStats, isDryRun: boolean = false): void {
    const elapsedSeconds = Math.round((Date.now() - stats.startTime) / 1000);
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const timeFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    console.log('\n' + chalk.bold.white('📊 Purge Operation Summary:'));
    console.log(chalk.gray('══════════════════════════════════════════════════'));
    console.log(`  Status              : ${isDryRun ? chalk.magenta.bold('SIMULATION COMPLETED') : chalk.green.bold('PURGE COMPLETED')}`);
    console.log(`  Total Posts Deleted : ${chalk.yellow(stats.postsDeleted)}`);
    console.log(`  Total Replies Purged: ${chalk.yellow(stats.repliesDeleted)}`);
    console.log(`  Retweets/Reposts    : ${chalk.yellow(stats.retweetsUndone)}`);
    console.log(`  Accounts Unfollowed : ${chalk.yellow(stats.accountsUnfollowed)}`);
    console.log(`  Followers Removed   : ${chalk.yellow(stats.followersRemoved)}`);
    console.log(`  Whitelist Preserved : ${chalk.cyan(stats.skippedWhitelist)}`);
    console.log(`  Errors Encountered  : ${stats.errors > 0 ? chalk.red(stats.errors) : chalk.green('0')}`);
    console.log(`  Total Elapsed Time  : ${chalk.white(timeFormatted)}`);
    console.log(chalk.gray('══════════════════════════════════════════════════\n'));
  }
}

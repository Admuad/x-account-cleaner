import inquirer from 'inquirer';
import chalk from 'chalk';
import { CleanerOptions } from '../types';

export class CLIWizard {
  public static async promptOptions(): Promise<CleanerOptions> {
    const modeAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'preset',
        message: 'What would you like to clean on your X account?',
        choices: [
          { name: '🔁 Undo Reposts / Retweets only', value: 'reposts' },
          { name: '💬 Delete Replies only', value: 'replies' },
          { name: '🗑️  Delete Posts only (original tweets)', value: 'posts' },
          { name: '🔥 Delete Posts, Replies & Reposts', value: 'posts_replies_reposts' },
          { name: '👋 Unfollow Non-Mutuals only (preserve mutual friends)', value: 'non_mutuals' },
          { name: '🤖 Unfollow Flagged Bots & Inactive only (default avatar/no bio/numeric handle)', value: 'bots' },
          { name: '🧹 Mass Unfollow All accounts', value: 'unfollow_all' },
          { name: '🚫 Remove Followers only', value: 'followers' },
          { name: '⚡ Full Account Wipe (Posts + Replies + Reposts + Unfollow + Followers)', value: 'all' },
          { name: '🛠️  Custom Multi-Select...', value: 'custom' },
        ],
      },
    ]);

    let selectedPosts = false;
    let selectedReplies = false;
    let selectedReposts = false;
    let selectedUnfollow = false;
    let selectedFollowers = false;
    let nonMutualsOnly = false;
    let botsOnly = false;

    if (modeAnswer.preset === 'posts') {
      selectedPosts = true;
    } else if (modeAnswer.preset === 'replies') {
      selectedReplies = true;
    } else if (modeAnswer.preset === 'reposts') {
      selectedReposts = true;
    } else if (modeAnswer.preset === 'posts_replies_reposts') {
      selectedPosts = true;
      selectedReplies = true;
      selectedReposts = true;
    } else if (modeAnswer.preset === 'non_mutuals') {
      selectedUnfollow = true;
      nonMutualsOnly = true;
    } else if (modeAnswer.preset === 'bots') {
      selectedUnfollow = true;
      botsOnly = true;
    } else if (modeAnswer.preset === 'unfollow_all') {
      selectedUnfollow = true;
    } else if (modeAnswer.preset === 'followers') {
      selectedFollowers = true;
    } else if (modeAnswer.preset === 'all') {
      selectedPosts = true;
      selectedReplies = true;
      selectedReposts = true;
      selectedUnfollow = true;
      selectedFollowers = true;
    } else {
      const customAnswers = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'actions',
          message: 'Select items to clean (Use Spacebar to select/deselect, Enter to confirm):',
          choices: [
            { name: '🔁 Undo Reposts / Retweets', value: 'reposts' },
            { name: '💬 Delete Replies', value: 'replies' },
            { name: '🗑️  Delete Posts', value: 'posts' },
            { name: '👋 Unfollow Accounts', value: 'unfollow' },
            { name: '🚫 Remove Followers', value: 'followers' },
          ],
          validate: (input) => (input.length > 0 ? true : 'Please select at least one action.'),
        },
      ]);
      selectedPosts = customAnswers.actions.includes('posts');
      selectedReplies = customAnswers.actions.includes('replies');
      selectedReposts = customAnswers.actions.includes('reposts');
      selectedUnfollow = customAnswers.actions.includes('unfollow');
      selectedFollowers = customAnswers.actions.includes('followers');
    }

    const actionCount =
      (selectedPosts ? 1 : 0) +
      (selectedReplies ? 1 : 0) +
      (selectedReposts ? 1 : 0) +
      (selectedUnfollow ? 1 : 0) +
      (selectedFollowers ? 1 : 0);

    const detailAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'parallel',
        message: '⚡ Run operations in Parallel? (Multi-tab concurrent workers for 2x-4x speedup)',
        when: () => actionCount > 1,
        default: true,
      },
      {
        type: 'list',
        name: 'source',
        message: 'How should posts/replies/reposts be located?',
        when: () => selectedPosts || selectedReplies || selectedReposts,
        choices: [
          { name: '🌐 Live Profile Timeline (Fast direct crawling)', value: 'live' },
          { name: '📦 Twitter Archive Export File (twitter-archive.zip / tweets.js)', value: 'archive' },
        ],
      },
      {
        type: 'input',
        name: 'archivePath',
        message: 'Enter path to twitter-archive.zip or tweets.js:',
        when: (ans) => ans.source === 'archive',
        validate: (input) => (input.trim() ? true : 'Please provide a valid file path.'),
      },
      {
        type: 'list',
        name: 'speed',
        message: 'Select action pacing speed:',
        choices: [
          { name: '⚡ Fast Turbo (0.4s - 1.2s delay per action)', value: 'fast' },
          { name: '🛡️  Standard Balanced (1.0s - 2.2s delay + jitter)', value: 'safe' },
          { name: '🐢 Slow & Stealth (2.5s - 5.0s delay)', value: 'slow' },
        ],
        default: 'fast',
      },
      {
        type: 'confirm',
        name: 'dryRun',
        message: 'Enable Dry-Run simulation mode? (Preview without deleting)',
        default: false,
      },
      {
        type: 'confirm',
        name: 'headless',
        message: 'Run browser in background headless mode?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'confirmProceed',
        message: chalk.yellow('⚠️  Ready to proceed with selected operations?'),
        default: true,
      },
    ]);

    if (!detailAnswers.confirmProceed) {
      console.log(chalk.red('\nOperation cancelled by user.\n'));
      process.exit(0);
    }

    let minDelay = 400;
    let maxDelay = 1200;
    if (detailAnswers.speed === 'safe') {
      minDelay = 1000;
      maxDelay = 2200;
    } else if (detailAnswers.speed === 'slow') {
      minDelay = 2500;
      maxDelay = 5000;
    }

    return {
      posts: selectedPosts,
      replies: selectedReplies,
      reposts: selectedReposts,
      unfollow: selectedUnfollow,
      followers: selectedFollowers,
      all: selectedPosts && selectedReplies && selectedReposts && selectedUnfollow && selectedFollowers,
      parallel: Boolean(detailAnswers.parallel),
      archivePath: detailAnswers.archivePath,
      dryRun: detailAnswers.dryRun,
      headless: detailAnswers.headless,
      minDelay,
      maxDelay,
      nonMutualsOnly,
      botsOnly,
    };
  }
}

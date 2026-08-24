import readline from 'readline';
import chalk from 'chalk';
import { AuthManager } from './core/auth';
import { SessionCookie } from './types';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function runCookieSetup() {
  console.log(chalk.cyan.bold('\n======================================================'));
  console.log(chalk.cyan.bold('🍪 DIRECT X COOKIE IMPORT (Bypass Login Restrictions)'));
  console.log(chalk.cyan.bold('======================================================\n'));
  console.log(chalk.white('Since you are already logged in on Chrome, you can copy 2 cookies:'));
  console.log(chalk.gray('  1. In Chrome, go to https://x.com'));
  console.log(chalk.gray('  2. Press F12 (or right-click -> Inspect) -> Open the "Application" tab'));
  console.log(chalk.gray('  3. In the left sidebar: Storage -> Cookies -> select "https://x.com"'));
  console.log(chalk.gray('  4. Copy the values for "auth_token" and "ct0"\n'));

  const authToken = (await question(chalk.yellow('Paste your "auth_token" value: '))).trim();
  const ct0 = (await question(chalk.yellow('Paste your "ct0" value: '))).trim();
  const username = (await question(chalk.yellow('Enter your account handle (without @, optional): '))).trim();

  if (!authToken || !ct0) {
    console.log(chalk.red('\n❌ Both auth_token and ct0 are required.\n'));
    rl.close();
    process.exit(1);
  }

  const cookies: SessionCookie[] = [
    {
      name: 'auth_token',
      value: authToken,
      domain: '.x.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'None',
    },
    {
      name: 'ct0',
      value: ct0,
      domain: '.x.com',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'Lax',
    },
  ];

  AuthManager.saveSession(cookies, username.replace(/^@/, ''));
  console.log(chalk.green.bold('\n✅ Cookies successfully saved to .session.json!'));
  console.log(chalk.cyan('Now you can run: npm start\n'));
  rl.close();
}

runCookieSetup();

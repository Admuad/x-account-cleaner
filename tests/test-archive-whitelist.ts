import fs from 'fs';
import path from 'path';
import assert from 'assert';
import chalk from 'chalk';
import { WhitelistManager } from '../src/core/whitelist';
import { ArchivePurgeEngine } from '../src/modules/archive';

function runTests() {
  console.log(chalk.cyan.bold('\n🧪 Running Unit Tests for Whitelist & Archive Engine...\n'));

  // 1. Whitelist Tests
  console.log(chalk.yellow('Test Suite 1: WhitelistManager logic'));
  const testWhitelistPath = path.resolve(__dirname, 'test-whitelist.json');
  fs.writeFileSync(
    testWhitelistPath,
    JSON.stringify({
      usernames: ['alice', '@Bob', 'VitalikButerin'],
      tweetIds: ['1001', '1002'],
      keywordsToKeep: ['#keep', '#important'],
      dateCutoff: '2024-01-01',
    }),
    'utf8'
  );

  const whitelist = new WhitelistManager('tests/test-whitelist.json');

  // Username checks
  assert.strictEqual(whitelist.isUserWhitelisted('alice'), true, 'Should match exact username alice');
  assert.strictEqual(whitelist.isUserWhitelisted('@alice'), true, 'Should match @alice with @ prefix');
  assert.strictEqual(whitelist.isUserWhitelisted('bob'), true, 'Should match bob case-insensitively');
  assert.strictEqual(whitelist.isUserWhitelisted('@VITALIKBUTERIN'), true, 'Should match @VITALIKBUTERIN');
  assert.strictEqual(whitelist.isUserWhitelisted('random_user'), false, 'Should not match unknown user');
  console.log(chalk.green('  ✔ Username matching & normalization passed'));

  // Tweet ID & Keyword checks
  assert.strictEqual(whitelist.isTweetWhitelisted('1001', 'some text'), true, 'Should match whitelisted tweet ID 1001');
  assert.strictEqual(whitelist.isTweetWhitelisted('9999', 'Please #keep this post!'), true, 'Should match keyword #keep');
  assert.strictEqual(whitelist.isTweetWhitelisted('9999', 'Just a normal tweet', '2024-06-15'), true, 'Should preserve tweet after dateCutoff');
  assert.strictEqual(whitelist.isTweetWhitelisted('9999', 'Old tweet', '2023-01-01'), false, 'Should not preserve tweet before dateCutoff');
  console.log(chalk.green('  ✔ Tweet ID, keyword & date cutoff matching passed'));

  // Cleanup test whitelist
  fs.unlinkSync(testWhitelistPath);

  // 2. Archive Parser Tests
  console.log(chalk.yellow('\nTest Suite 2: Archive Parser'));
  const testArchiveJsPath = path.resolve(__dirname, 'test-tweets.js');
  const mockArchiveContent = `window.YTD.tweet.part0 = [
    {
      "tweet": {
        "id_str": "1234567890",
        "full_text": "Hello world from the past!",
        "created_at": "Mon Jan 01 12:00:00 +0000 2024"
      }
    },
    {
      "tweet": {
        "id_str": "1234567891",
        "full_text": "@alice replying to your post",
        "created_at": "Tue Jan 02 12:00:00 +0000 2024",
        "in_reply_to_status_id_str": "999999"
      }
    }
  ]`;
  fs.writeFileSync(testArchiveJsPath, mockArchiveContent, 'utf8');

  const parsedTweets = ArchivePurgeEngine.parseArchiveFile('tests/test-tweets.js');
  assert.strictEqual(parsedTweets.length, 2, 'Should parse 2 tweets');
  assert.strictEqual(parsedTweets[0].id, '1234567890', 'Tweet 0 ID matches');
  assert.strictEqual(parsedTweets[0].full_text, 'Hello world from the past!', 'Tweet 0 text matches');
  assert.strictEqual(Boolean(parsedTweets[0].in_reply_to_status_id), false, 'Tweet 0 is a regular post');
  assert.strictEqual(parsedTweets[1].id, '1234567891', 'Tweet 1 ID matches');
  assert.strictEqual(Boolean(parsedTweets[1].in_reply_to_status_id), true, 'Tweet 1 is a reply');
  console.log(chalk.green('  ✔ Archive JS format extraction & reply distinction passed'));

  // Cleanup test archive
  fs.unlinkSync(testArchiveJsPath);

  console.log(chalk.green.bold('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n'));
}

runTests();

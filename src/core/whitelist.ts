import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { WhitelistConfig } from '../types';

export class WhitelistManager {
  private config: WhitelistConfig;
  private normalizedUsernames: Set<string>;
  private tweetIdSet: Set<string>;

  constructor(customPath?: string) {
    this.config = this.loadConfig(customPath);
    this.normalizedUsernames = new Set(
      (this.config.usernames || []).map((u) => u.toLowerCase().replace(/^@/, '').trim())
    );
    this.tweetIdSet = new Set((this.config.tweetIds || []).map((id) => id.trim()));
  }

  private loadConfig(customPath?: string): WhitelistConfig {
    const defaultPath = path.resolve(process.cwd(), 'whitelist.json');
    const targetPath = customPath ? path.resolve(process.cwd(), customPath) : defaultPath;

    if (fs.existsSync(targetPath)) {
      try {
        const raw = fs.readFileSync(targetPath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          usernames: Array.isArray(parsed.usernames) ? parsed.usernames : [],
          tweetIds: Array.isArray(parsed.tweetIds) ? parsed.tweetIds : [],
          keywordsToKeep: Array.isArray(parsed.keywordsToKeep) ? parsed.keywordsToKeep : [],
          dateCutoff: typeof parsed.dateCutoff === 'string' ? parsed.dateCutoff : undefined,
        };
      } catch (err) {
        console.warn(chalk.yellow(`⚠️ Failed to parse whitelist at ${targetPath}. Proceeding with empty whitelist.`));
      }
    }
    return { usernames: [], tweetIds: [] };
  }

  public isUserWhitelisted(username: string): boolean {
    if (!username) return false;
    const clean = username.toLowerCase().replace(/^@/, '').trim();
    return this.normalizedUsernames.has(clean);
  }

  public isTweetWhitelisted(tweetId: string, tweetText: string = '', createdAt?: string): boolean {
    if (this.tweetIdSet.has(tweetId)) {
      return true;
    }

    if (this.config.keywordsToKeep && this.config.keywordsToKeep.length > 0 && tweetText) {
      const lower = tweetText.toLowerCase();
      const hasKeyword = this.config.keywordsToKeep.some((kw) =>
        lower.includes(kw.toLowerCase().trim())
      );
      if (hasKeyword) return true;
    }

    if (this.config.dateCutoff && createdAt) {
      const cutoffDate = new Date(this.config.dateCutoff);
      const tweetDate = new Date(createdAt);
      if (!isNaN(cutoffDate.getTime()) && !isNaN(tweetDate.getTime())) {
        if (tweetDate >= cutoffDate) {
          return true; // Keep tweets newer than cutoff
        }
      }
    }

    return false;
  }

  public getSummary(): { usernamesCount: number; tweetIdsCount: number; keywordsCount: number } {
    return {
      usernamesCount: this.normalizedUsernames.size,
      tweetIdsCount: this.tweetIdSet.size,
      keywordsCount: this.config.keywordsToKeep?.length || 0,
    };
  }
}

export interface CleanerOptions {
  posts?: boolean;
  replies?: boolean;
  reposts?: boolean;
  unfollow?: boolean;
  followers?: boolean;
  all?: boolean;
  parallel?: boolean;
  dryRun?: boolean;
  archivePath?: string;
  minDelay?: number;
  maxDelay?: number;
  headless?: boolean;
  whitelistPath?: string;
  maxCount?: number;
  nonMutualsOnly?: boolean;
  botsOnly?: boolean;
}

export interface WhitelistConfig {
  usernames: string[];
  tweetIds: string[];
  keywordsToKeep?: string[];
  dateCutoff?: string; // e.g. "2024-01-01" (keep tweets newer than cutoff)
}

export interface PurgeStats {
  postsDeleted: number;
  repliesDeleted: number;
  retweetsUndone: number;
  accountsUnfollowed: number;
  followersRemoved: number;
  skippedWhitelist: number;
  errors: number;
  startTime: number;
}

export interface ArchiveTweet {
  id: string;
  full_text?: string;
  created_at?: string;
  in_reply_to_status_id?: string;
}

export interface SessionCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface AccountSession {
  username?: string;
  cookies: SessionCookie[];
  lastLogin: string;
}

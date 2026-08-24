export interface AccountProfile {
  handle: string;
  name: string;
  avatarUrl: string;
  verified: boolean;
  postsCount: number;
  repliesCount: number;
  repostsCount: number;
  followingCount: number;
  followersCount: number;
  joinedDate: string;
  bio: string;
}

export type DatePreset = 'all' | 'before_2026' | 'older_1y' | 'older_30d' | 'custom';

export interface DateFilterConfig {
  enabled: boolean;
  preset: DatePreset;
  startDate?: string;
  endDate?: string;
}

export type BotSensitivityPreset = 'moderate' | 'aggressive' | 'non_mutuals_only' | 'custom';

export interface BotFilterConfig {
  enabled: boolean;
  preset: BotSensitivityPreset;
  unfollowNonMutuals: boolean;
  unfollowDefaultAvatar: boolean;
  unfollowNumericHandle: boolean;
  unfollowEmptyBio: boolean;
  unfollowExtremeRatio: boolean;
  unfollowInactive: boolean;
}

export type PacingSpeed = 'safe' | 'balanced' | 'turbo';

export interface WhitelistConfig {
  users: string[];
  tweets: string[];
  keywords: string[];
}

export interface PurgeConfig {
  modules: {
    posts: boolean;
    replies: boolean;
    reposts: boolean;
    following: boolean;
    followers: boolean;
  };
  dateFilter: DateFilterConfig;
  botFilter: BotFilterConfig;
  pacing: PacingSpeed;
  whitelist: WhitelistConfig;
}

export interface AuditAccount {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string;
  isDefaultAvatar: boolean;
  isFollowingBack: boolean;
  followingCount: number;
  followersCount: number;
  bio: string;
  botRiskScore: number; // 0 to 100
  riskFlags: string[];
  isWhitelisted: boolean;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'delete' | 'unfollow';
  message: string;
  itemHandle?: string;
  itemId?: string;
}

export interface TelemetryState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'aborted';
  totalTargeted: number;
  totalPurged: number;
  postsDeleted: number;
  repliesDeleted: number;
  repostsUndone: number;
  followingRemoved: number;
  followersPurged: number;
  whitelistSkipped: number;
  velocity: number; // items per second
  elapsedSeconds: number;
  currentAction: string;
  logs: TelemetryLog[];
}

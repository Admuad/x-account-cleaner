import { AuditAccount, BotFilterConfig } from '@/types';

export function calculateBotScore(account: AuditAccount, config: BotFilterConfig): { score: number; flags: string[]; shouldUnfollow: boolean } {
  const flags: string[] = [];
  let score = 0;

  // 1. Non-Mutual Check
  if (!account.isFollowingBack) {
    flags.push('Not Following Back');
    score += 25;
  }

  // 2. Default Avatar Check
  if (account.isDefaultAvatar || !account.avatarUrl) {
    flags.push('Default Avatar');
    score += 35;
  }

  // 3. Random Numeric Pattern Check (e.g. ends with 4+ digits)
  if (/\d{4,}$/.test(account.handle)) {
    flags.push('Auto-Generated Handle (Trailing Numbers)');
    score += 20;
  }

  // 4. Empty Bio Check
  if (!account.bio || account.bio.trim().length === 0) {
    flags.push('Empty Profile Bio');
    score += 15;
  }

  // 5. Extreme Follow Ratio (Following > 50x Followers or Following > 2000 with < 20 followers)
  const ratio = account.followingCount / Math.max(1, account.followersCount);
  if (ratio > 50 || (account.followingCount > 1500 && account.followersCount < 25)) {
    flags.push(`Extreme Follow Ratio (${account.followingCount}:${account.followersCount})`);
    score += 30;
  }

  const normalizedScore = Math.min(100, score);

  // Evaluate if shouldUnfollow based on user config
  let shouldUnfollow = false;

  if (account.isWhitelisted) {
    shouldUnfollow = false;
  } else if (!config.enabled) {
    shouldUnfollow = false;
  } else if (config.preset === 'aggressive') {
    // Aggressive: Unfollow 100% of accounts (except Whitelisted)
    shouldUnfollow = true;
  } else if (config.preset === 'non_mutuals_only') {
    // Strictly unfollow non-mutuals
    shouldUnfollow = !account.isFollowingBack;
  } else if (config.preset === 'moderate') {
    // Moderate: Non-mutual AND (Default Avatar OR Empty Bio OR Numeric Handle OR High Risk Score)
    const hasBotIndicators = account.isDefaultAvatar || !account.avatarUrl || !account.bio || /\d{4,}$/.test(account.handle) || normalizedScore >= 60;
    shouldUnfollow = !account.isFollowingBack && hasBotIndicators;
  } else if (config.preset === 'custom') {
    // Granular Custom Multi-Factor Rules
    const hasAttributeFilter = config.unfollowDefaultAvatar || config.unfollowNumericHandle || config.unfollowEmptyBio || config.unfollowExtremeRatio;

    if (config.unfollowNonMutuals && !hasAttributeFilter) {
      // Only non-mutuals filter active
      shouldUnfollow = !account.isFollowingBack;
    } else if (hasAttributeFilter) {
      let matchesAttribute = false;
      if (config.unfollowDefaultAvatar && (account.isDefaultAvatar || !account.avatarUrl)) matchesAttribute = true;
      if (config.unfollowNumericHandle && /\d{4,}$/.test(account.handle)) matchesAttribute = true;
      if (config.unfollowEmptyBio && (!account.bio || account.bio.trim().length === 0)) matchesAttribute = true;
      if (config.unfollowExtremeRatio && ratio > 50) matchesAttribute = true;

      if (config.unfollowNonMutuals) {
        // Must be Non-Mutual AND match at least one selected attribute
        shouldUnfollow = !account.isFollowingBack && matchesAttribute;
      } else {
        // Matches attribute regardless of mutual status
        shouldUnfollow = matchesAttribute;
      }
    }
  }

  return {
    score: normalizedScore,
    flags,
    shouldUnfollow,
  };
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Calendar, Bot, Shield, Terminal, CheckCircle2, Play, RefreshCw, Zap, ArrowUpRight } from 'lucide-react';
import { AccountProfile, PurgeConfig, AuditAccount, TelemetryState, TelemetryLog } from '@/types';
import { INITIAL_DEMO_PROFILE, INITIAL_AUDIT_ACCOUNTS } from '@/utils/mockData';
import { DateRangeFilter } from './DateRangeFilter';
import { BotDetector } from './BotDetector';
import { PurgeModules } from './PurgeModules';
import { WhitelistManager } from './WhitelistManager';
import { TerminalConsole } from './TerminalConsole';
import { generateXSearchQuery } from '@/utils/dateHelper';

interface DashboardProps {
  isLiveMode: boolean;
  profile: AccountProfile;
  setProfile: React.Dispatch<React.SetStateAction<AccountProfile>>;
  isConnected: boolean;
  onConnect: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  isLiveMode,
  profile,
  setProfile,
  isConnected,
  onConnect,
}) => {
  // Purge Configuration State
  const [config, setConfig] = useState<PurgeConfig>({
    modules: {
      posts: true,
      replies: true,
      reposts: true,
      following: false,
      followers: false,
    },
    dateFilter: {
      enabled: true,
      preset: 'before_2026',
      startDate: '2020-01-01',
      endDate: '2025-12-31',
    },
    botFilter: {
      enabled: true,
      preset: 'moderate',
      unfollowNonMutuals: true,
      unfollowDefaultAvatar: true,
      unfollowNumericHandle: true,
      unfollowEmptyBio: true,
      unfollowExtremeRatio: true,
      unfollowInactive: true,
    },
    pacing: 'balanced',
    whitelist: {
      users: ['elonmusk', 'sama', 'vitalikbuterin'],
      tweets: ['1759281928391'],
      keywords: ['#keep', 'giveaway', 'announcement'],
    },
  });

  // Account Audit List
  const [accounts, setAccounts] = useState<AuditAccount[]>(INITIAL_AUDIT_ACCOUNTS);

  // Telemetry Engine State
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    status: 'idle',
    totalTargeted: 154,
    totalPurged: 0,
    postsDeleted: 0,
    repliesDeleted: 0,
    repostsUndone: 0,
    followingRemoved: 0,
    followersPurged: 0,
    whitelistSkipped: 3,
    velocity: 0,
    elapsedSeconds: 0,
    currentAction: '',
    logs: [],
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle whitelist on account
  const handleToggleWhitelist = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, isWhitelisted: !acc.isWhitelisted } : acc))
    );
  };

  // Quick Action Presets
  const applyPreset = (type: 'legacy_pre2026' | 'bot_sweep' | 'clean_slate' | 'keep_30d') => {
    if (type === 'legacy_pre2026') {
      setConfig((prev) => ({
        ...prev,
        modules: { posts: true, replies: true, reposts: true, following: false, followers: false },
        dateFilter: { enabled: true, preset: 'before_2026', endDate: '2025-12-31' },
      }));
    } else if (type === 'bot_sweep') {
      setConfig((prev) => ({
        ...prev,
        modules: { posts: false, replies: false, reposts: false, following: true, followers: true },
        botFilter: { ...prev.botFilter, enabled: true, preset: 'aggressive' },
      }));
    } else if (type === 'clean_slate') {
      setConfig((prev) => ({
        ...prev,
        modules: { posts: true, replies: true, reposts: true, following: true, followers: false },
        dateFilter: { enabled: false, preset: 'all' },
        botFilter: { ...prev.botFilter, enabled: true, preset: 'moderate' },
      }));
    } else if (type === 'keep_30d') {
      setConfig((prev) => ({
        ...prev,
        modules: { posts: true, replies: true, reposts: true, following: false, followers: false },
        dateFilter: { enabled: true, preset: 'older_30d' },
      }));
    }
  };

  // Simulation / Execution Engine
  const startExecution = () => {
    setTelemetry((prev) => ({
      ...prev,
      status: 'running',
      totalTargeted: config.modules.following ? 120 : 85,
      totalPurged: 0,
      postsDeleted: 0,
      repliesDeleted: 0,
      repostsUndone: 0,
      followingRemoved: 0,
      logs: [
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          message: isLiveMode
            ? `⚡ Dispatching job to Companion Extension for @${profile.handle}...`
            : `🚀 Initializing Sandbox Simulator for @${profile.handle} (Safe Pace: ${config.pacing})...`,
        },
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          message: config.dateFilter.enabled
            ? `🔍 Date boundary active: ${generateXSearchQuery(profile.handle, config.dateFilter)}`
            : '🔍 Operating on full chronological timeline (Date filter disabled)',
        },
      ],
    }));
  };

  // Simulator Loop
  useEffect(() => {
    if (telemetry.status === 'running') {
      const delayMs = config.pacing === 'turbo' ? 400 : config.pacing === 'balanced' ? 800 : 1400;

      timerRef.current = setInterval(() => {
        setTelemetry((prev) => {
          if (prev.totalPurged >= prev.totalTargeted) {
            clearInterval(timerRef.current!);
            return {
              ...prev,
              status: 'completed',
              velocity: 0,
              logs: [
                ...prev.logs,
                {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  type: 'success',
                  message: '✔ Zero-state verification complete! Profile header counter confirmed 0 remaining.',
                },
              ],
            };
          }

          const isPost = config.modules.posts && Math.random() > 0.4;
          const isReply = config.modules.replies && !isPost && Math.random() > 0.3;
          const isUnfollow = config.modules.following && !isPost && !isReply;

          let logItem: TelemetryLog;
          const currentTotal = prev.totalPurged + 1;

          if (isUnfollow) {
            const botAccounts = ['@AlexTrader98314', '@CryptoBot_8812', '@john_dev_29381', '@airdrop_hunter_9999'];
            const target = botAccounts[Math.floor(Math.random() * botAccounts.length)];
            logItem = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'unfollow',
              message: `Unfollowed non-mutual bot ${target} (Risk: 95%, Default Avatar)`,
            };
          } else if (isReply) {
            const tweetId = `18${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
            logItem = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'delete',
              message: `Purged reply ID ${tweetId} (Timestamp: 2025-11-14)`,
            };
          } else {
            const tweetId = `17${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
            logItem = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'delete',
              message: `Deleted post ID ${tweetId} [Pre-2026 Archive]`,
            };
          }

          const currentVelocity = config.pacing === 'turbo' ? 2.5 : config.pacing === 'balanced' ? 1.4 : 0.8;

          return {
            ...prev,
            totalPurged: currentTotal,
            postsDeleted: isPost ? prev.postsDeleted + 1 : prev.postsDeleted,
            repliesDeleted: isReply ? prev.repliesDeleted + 1 : prev.repliesDeleted,
            repostsUndone: !isPost && !isReply && !isUnfollow ? prev.repostsUndone + 1 : prev.repostsUndone,
            followingRemoved: isUnfollow ? prev.followingRemoved + 1 : prev.followingRemoved,
            velocity: currentVelocity,
            logs: [...prev.logs.slice(-60), logItem],
          };
        });
      }, delayMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [telemetry.status, config.pacing, config.modules]);

  const pauseExecution = () => setTelemetry((prev) => ({ ...prev, status: 'paused', velocity: 0 }));
  const resumeExecution = () => setTelemetry((prev) => ({ ...prev, status: 'running' }));
  const abortExecution = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTelemetry((prev) => ({
      ...prev,
      status: 'aborted',
      velocity: 0,
      logs: [
        ...prev.logs,
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          type: 'warn',
          message: '⚠️ Execution aborted by user. Session state preserved safely.',
        },
      ],
    }));
  };

  const exportReport = () => {
    const reportData = {
      account: profile.handle,
      timestamp: new Date().toISOString(),
      config,
      telemetry,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `purge-audit-${profile.handle}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Account Profile Bar */}
      <div className="clean-card p-6 border-space-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.handle}
              className="w-14 h-14 rounded-full object-cover border-2 border-coral shadow-coral-sm"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-space-card border-2 border-coral flex items-center justify-center text-xl font-bold text-coral">
              {profile.handle[0]}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-space-text">{profile.name}</h1>
              <span className="text-xs text-space-muted font-mono">@{profile.handle}</span>
              {profile.verified && <CheckCircle2 className="w-4 h-4 text-brand-xblue" />}
            </div>
            <p className="text-xs text-space-muted mt-0.5 line-clamp-1">{profile.bio}</p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center space-x-4 sm:space-x-6 text-xs font-mono">
          <div>
            <div className="text-space-muted text-[10px] uppercase">Posts & Replies</div>
            <div className="text-sm font-bold text-space-text">
              {(profile.postsCount + profile.repliesCount).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-space-muted text-[10px] uppercase">Following</div>
            <div className="text-sm font-bold text-space-text">
              {profile.followingCount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-space-muted text-[10px] uppercase">Followers</div>
            <div className="text-sm font-bold text-space-text">
              {profile.followersCount.toLocaleString()}
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="text-space-muted text-[10px] uppercase">Joined</div>
            <div className="text-sm font-bold text-space-text">{profile.joinedDate}</div>
          </div>
        </div>
      </div>

      {/* Quick Presets Launchpad Bar */}
      <div className="clean-card p-4 border-space-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-space-text">
          <Zap className="w-4 h-4 text-coral" />
          <span>Quick Preset Strategy:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => applyPreset('legacy_pre2026')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              config.dateFilter.enabled && config.dateFilter.preset === 'before_2026'
                ? 'bg-coral text-white border-coral shadow-coral-sm'
                : 'bg-space-darkest text-space-subtext border-space-border hover:border-space-border-light'
            }`}
          >
            🎯 Legacy Wipe (Pre-2026)
          </button>

          <button
            onClick={() => applyPreset('bot_sweep')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              config.modules.following && config.botFilter.preset === 'aggressive'
                ? 'bg-coral text-white border-coral shadow-coral-sm'
                : 'bg-space-darkest text-space-subtext border-space-border hover:border-space-border-light'
            }`}
          >
            🤖 Bot & Ghost Purge
          </button>

          <button
            onClick={() => applyPreset('keep_30d')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              config.dateFilter.enabled && config.dateFilter.preset === 'older_30d'
                ? 'bg-coral text-white border-coral shadow-coral-sm'
                : 'bg-space-darkest text-space-subtext border-space-border hover:border-space-border-light'
            }`}
          >
            ⏳ Keep Last 30 Days
          </button>

          <button
            onClick={() => applyPreset('clean_slate')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              !config.dateFilter.enabled && config.modules.posts && config.modules.following
                ? 'bg-coral text-white border-coral shadow-coral-sm'
                : 'bg-space-darkest text-space-subtext border-space-border hover:border-space-border-light'
            }`}
          >
            🔥 Total Clean Slate
          </button>
        </div>
      </div>

      {/* Main Grid: Date Filter & Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DateRangeFilter
          config={config.dateFilter}
          onChange={(newDateConfig) => setConfig({ ...config, dateFilter: newDateConfig })}
          userHandle={profile.handle}
        />

        <PurgeModules
          config={config}
          onChange={setConfig}
          profile={profile}
        />
      </div>

      {/* Bot & Non-Mutuals Hub */}
      <BotDetector
        config={config.botFilter}
        onChange={(newBotConfig) => setConfig({ ...config, botFilter: newBotConfig })}
        accounts={accounts}
        onToggleWhitelist={handleToggleWhitelist}
      />

      {/* Whitelist Manager */}
      <WhitelistManager
        whitelist={config.whitelist}
        onChange={(newWhitelist) => setConfig({ ...config, whitelist: newWhitelist })}
      />

      {/* Live Telemetry Console */}
      <TerminalConsole
        telemetry={telemetry}
        onStart={startExecution}
        onPause={pauseExecution}
        onResume={resumeExecution}
        onAbort={abortExecution}
        onExportReport={exportReport}
      />
    </div>
  );
};

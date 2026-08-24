'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { TwitterAvatar } from '@/components/TwitterAvatar';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { BotDetector } from '@/components/BotDetector';
import { PurgeModules } from '@/components/PurgeModules';
import { WhitelistManager } from '@/components/WhitelistManager';
import { TerminalConsole } from '@/components/TerminalConsole';
import { AccountProfile, PurgeConfig, AuditAccount, TelemetryState, TelemetryLog } from '@/types';
import { INITIAL_AUDIT_ACCOUNTS } from '@/utils/mockData';
import { generateXSearchQuery } from '@/utils/dateHelper';
import { Calendar, Bot, Shield, Terminal, Search, Puzzle, CheckCircle2, Zap, ArrowRight, RefreshCw, Sliders } from 'lucide-react';

export default function AppPage() {
  const [handleInput, setHandleInput] = useState<string>('elonmusk');
  const [activeHandle, setActiveHandle] = useState<string>('elonmusk');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dates' | 'bots' | 'whitelist' | 'telemetry'>('dates');

  // Dynamic Profile State
  const [profile, setProfile] = useState<AccountProfile>({
    handle: 'elonmusk',
    name: 'Elon Musk',
    avatarUrl: '',
    verified: true,
    postsCount: 1240,
    repliesCount: 4180,
    repostsCount: 520,
    followingCount: 780,
    followersCount: 195000000,
    joinedDate: 'June 2009',
    bio: '',
  });

  // Purge Config State
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
      users: ['sama', 'vitalikbuterin', 'jack'],
      tweets: ['1759281928391'],
      keywords: ['#keep', 'giveaway', 'announcement'],
    },
  });

  const [accounts, setAccounts] = useState<AuditAccount[]>(INITIAL_AUDIT_ACCOUNTS);

  // Telemetry Engine State
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    status: 'idle',
    totalTargeted: 95,
    totalPurged: 0,
    postsDeleted: 0,
    repliesDeleted: 0,
    repostsUndone: 0,
    followingRemoved: 0,
    followersPurged: 0,
    whitelistSkipped: 2,
    velocity: 0,
    elapsedSeconds: 0,
    currentAction: '',
    logs: [],
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Input Submit
  const handleUpdateHandle = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = handleInput.replace(/^@/, '').trim();
    if (!clean) return;
    setActiveHandle(clean);
    setProfile((prev) => ({
      ...prev,
      handle: clean,
      name: `@${clean}`,
    }));
  };

  // Toggle whitelist immunity on account
  const handleToggleWhitelist = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, isWhitelisted: !acc.isWhitelisted } : acc))
    );
  };

  // Detect Active Tab from Extension
  const detectActiveTab = () => {
    if (typeof window !== 'undefined' && (window as any).chrome?.runtime) {
      (window as any).chrome.runtime.sendMessage(
        { type: 'GET_X_PROFILE' },
        (response: any) => {
          if (response?.handle) {
            setActiveHandle(response.handle);
            setHandleInput(response.handle);
            setProfile((prev) => ({ ...prev, handle: response.handle, name: `@${response.handle}` }));
            setIsLiveMode(true);
          } else {
            alert('Could not detect an active 𝕏 tab. Please open x.com in your browser first.');
          }
        }
      );
    } else {
      // Simulation feedback if extension not in current context
      const detected = 'my_active_handle';
      setActiveHandle(detected);
      setHandleInput(detected);
      setProfile((prev) => ({ ...prev, handle: detected, name: `@${detected}` }));
      setIsLiveMode(true);
    }
  };

  // Execution Handlers
  const startExecution = () => {
    setActiveTab('telemetry');
    setTelemetry((prev) => ({
      ...prev,
      status: 'running',
      totalTargeted: config.modules.following ? 120 : 65,
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
            ? `⚡ Connecting to Companion Extension for @${profile.handle}...`
            : `🚀 Initializing Sandbox Simulator for @${profile.handle} (Pacing: ${config.pacing})...`,
        },
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          message: config.dateFilter.enabled
            ? `🔍 Date filter active: ${generateXSearchQuery(profile.handle, config.dateFilter)}`
            : '🔍 Full timeline mode active (all dates targeted)',
        },
      ],
    }));
  };

  useEffect(() => {
    if (telemetry.status === 'running') {
      const delayMs = config.pacing === 'turbo' ? 400 : config.pacing === 'balanced' ? 800 : 1300;

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
                  message: '✔ Zero-state verification pass complete! 0 matching items remaining.',
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
              message: `Unfollowed non-mutual bot ${target} (Risk: 95%)`,
            };
          } else if (isReply) {
            const tweetId = `18${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
            logItem = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'delete',
              message: `Purged reply ID ${tweetId} (Timestamp: 2025-10-18)`,
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
          message: '⚠️ Execution aborted by user.',
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
    downloadAnchor.setAttribute('download', `vanishx-audit-${profile.handle}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-space-black text-space-text flex flex-col selection:bg-coral selection:text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Top Control Bar: Dynamic Handle & Mode Selector */}
        <div className="clean-card p-5 border-space-border flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Handle Search with Unavatar */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <TwitterAvatar handle={activeHandle} size="lg" />
            <form onSubmit={handleUpdateHandle} className="flex items-center space-x-2 flex-1 sm:flex-initial">
              <div className="flex items-center bg-space-darkest border border-space-border rounded-lg px-3 py-2 text-xs">
                <span className="text-coral font-bold mr-1">@</span>
                <input
                  type="text"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder="Enter 𝕏 handle"
                  className="bg-transparent text-xs text-space-text focus:outline-none w-28 sm:w-36 font-semibold"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-space-card hover:bg-space-card-hover border border-space-border text-xs font-semibold text-space-text transition-all"
              >
                Load
              </button>
            </form>

            <button
              onClick={detectActiveTab}
              title="Detect active handle from open 𝕏 browser tab"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-space-darkest hover:bg-space-card border border-space-border text-xs text-space-muted hover:text-space-text transition-all"
            >
              <Puzzle className="w-3.5 h-3.5 text-coral" />
              <span>Detect Tab</span>
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-space-darkest border border-space-border rounded-lg p-1 text-xs font-semibold">
            <button
              onClick={() => setIsLiveMode(false)}
              className={`px-3.5 py-1.5 rounded-md transition-all ${
                !isLiveMode
                  ? 'bg-space-card text-space-text shadow-sm border border-space-border'
                  : 'text-space-muted hover:text-space-text'
              }`}
            >
              Sandbox Demo
            </button>
            <button
              onClick={() => setIsLiveMode(true)}
              className={`px-3.5 py-1.5 rounded-md flex items-center space-x-1.5 transition-all ${
                isLiveMode
                  ? 'bg-coral text-white font-bold'
                  : 'text-space-muted hover:text-space-text'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Extension Mode</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-space-border pb-1 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('dates')}
            className={`px-4 py-2.5 rounded-t-lg flex items-center space-x-2 transition-all ${
              activeTab === 'dates'
                ? 'bg-space-card text-coral border-t-2 border-coral border-x border-space-border font-bold'
                : 'text-space-muted hover:text-space-text'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1. Purge & Date Window</span>
          </button>

          <button
            onClick={() => setActiveTab('bots')}
            className={`px-4 py-2.5 rounded-t-lg flex items-center space-x-2 transition-all ${
              activeTab === 'bots'
                ? 'bg-space-card text-coral border-t-2 border-coral border-x border-space-border font-bold'
                : 'text-space-muted hover:text-space-text'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>2. Bot & Non-Mutuals</span>
          </button>

          <button
            onClick={() => setActiveTab('whitelist')}
            className={`px-4 py-2.5 rounded-t-lg flex items-center space-x-2 transition-all ${
              activeTab === 'whitelist'
                ? 'bg-space-card text-coral border-t-2 border-coral border-x border-space-border font-bold'
                : 'text-space-muted hover:text-space-text'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>3. Whitelist Vault</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-4 py-2.5 rounded-t-lg flex items-center space-x-2 transition-all ${
              activeTab === 'telemetry'
                ? 'bg-space-card text-coral border-t-2 border-coral border-x border-space-border font-bold'
                : 'text-space-muted hover:text-space-text'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>4. Live Telemetry</span>
            {telemetry.status === 'running' && (
              <span className="w-2 h-2 rounded-full bg-coral"></span>
            )}
          </button>
        </div>

        {/* Tab Viewport */}
        <div>
          {activeTab === 'dates' && (
            <div className="space-y-6">
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
              <div className="flex justify-end">
                <button
                  onClick={() => setActiveTab('bots')}
                  className="coral-button px-6 py-2.5 text-xs flex items-center space-x-2"
                >
                  <span>Next: Configure Bot Radar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'bots' && (
            <div className="space-y-6">
              <BotDetector
                config={config.botFilter}
                onChange={(newBotConfig) => setConfig({ ...config, botFilter: newBotConfig })}
                accounts={accounts}
                onToggleWhitelist={handleToggleWhitelist}
              />
              <div className="flex justify-between">
                <button
                  onClick={() => setActiveTab('dates')}
                  className="px-5 py-2 rounded-lg bg-space-card border border-space-border text-xs text-space-muted hover:text-space-text"
                >
                  Back: Date Range
                </button>
                <button
                  onClick={() => setActiveTab('whitelist')}
                  className="coral-button px-6 py-2.5 text-xs flex items-center space-x-2"
                >
                  <span>Next: Whitelist Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'whitelist' && (
            <div className="space-y-6">
              <WhitelistManager
                whitelist={config.whitelist}
                onChange={(newWhitelist) => setConfig({ ...config, whitelist: newWhitelist })}
              />
              <div className="flex justify-between">
                <button
                  onClick={() => setActiveTab('bots')}
                  className="px-5 py-2 rounded-lg bg-space-card border border-space-border text-xs text-space-muted hover:text-space-text"
                >
                  Back: Bot Radar
                </button>
                <button
                  onClick={startExecution}
                  className="coral-button px-6 py-2.5 text-xs flex items-center space-x-2 font-bold"
                >
                  <span>Execute Clean Sweep</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <TerminalConsole
                telemetry={telemetry}
                onStart={startExecution}
                onPause={pauseExecution}
                onResume={resumeExecution}
                onAbort={abortExecution}
                onExportReport={exportReport}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

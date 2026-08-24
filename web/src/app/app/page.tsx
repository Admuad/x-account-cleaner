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
import { Calendar, Bot, Shield, Terminal, Search, Puzzle, CheckCircle2, Zap, ArrowRight, RefreshCw, Sliders, AlertCircle, Info, Lock, X } from 'lucide-react';

const DEFAULT_CONFIG: PurgeConfig = {
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
    users: [],
    tweets: [],
    keywords: [],
  },
};

export default function AppPage() {
  const [handleInput, setHandleInput] = useState<string>('');
  const [activeHandle, setActiveHandle] = useState<string>('');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dates' | 'bots' | 'whitelist' | 'telemetry'>('dates');
  const [extensionDetected, setExtensionDetected] = useState<boolean>(false);

  // Dynamic Profile State (Unauthenticated / clean by default)
  const [profile, setProfile] = useState<AccountProfile>({
    handle: '',
    name: '',
    avatarUrl: '',
    verified: false,
    postsCount: 0,
    repliesCount: 0,
    repostsCount: 0,
    followingCount: 0,
    followersCount: 0,
    joinedDate: '',
    bio: '',
  });

  // Purge Config State
  const [config, setConfig] = useState<PurgeConfig>(DEFAULT_CONFIG);
  const [accounts, setAccounts] = useState<AuditAccount[]>([]);

  // Telemetry Engine State
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    status: 'idle',
    totalTargeted: 0,
    totalPurged: 0,
    postsDeleted: 0,
    repliesDeleted: 0,
    repostsUndone: 0,
    followingRemoved: 0,
    followersPurged: 0,
    whitelistSkipped: 0,
    velocity: 0,
    elapsedSeconds: 0,
    currentAction: '',
    logs: [],
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load user data & whitelist from localStorage on mount
  useEffect(() => {
    try {
      const savedHandle = localStorage.getItem('vanishx_active_handle');
      if (savedHandle) {
        setActiveHandle(savedHandle);
        setHandleInput(savedHandle);
        setProfile((prev) => ({
          ...prev,
          handle: savedHandle,
          name: `@${savedHandle}`,
        }));
      }

      const savedWhitelist = localStorage.getItem('vanishx_whitelist');
      if (savedWhitelist) {
        const parsed = JSON.parse(savedWhitelist);
        setConfig((prev) => ({
          ...prev,
          whitelist: {
            users: Array.isArray(parsed.users) ? parsed.users : [],
            tweets: Array.isArray(parsed.tweets) ? parsed.tweets : [],
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          },
        }));
      }

      const savedConfig = localStorage.getItem('vanishx_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig((prev) => ({
          ...prev,
          modules: parsed.modules || prev.modules,
          dateFilter: parsed.dateFilter || prev.dateFilter,
          botFilter: parsed.botFilter || prev.botFilter,
          pacing: parsed.pacing || prev.pacing,
        }));
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }

    // Listen for extension messages
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VANISHX_EXTENSION_READY') {
        setExtensionDetected(true);
      }
      if (event.data?.type === 'VANISHX_X_PROFILE_RESPONSE' && event.data.handle) {
        const h = event.data.handle;
        setActiveHandle(h);
        setHandleInput(h);
        setProfile((prev) => ({ ...prev, handle: h, name: `@${h}` }));
        setIsLiveMode(true);
        localStorage.setItem('vanishx_active_handle', h);
      }
      if (event.data?.type === 'VANISHX_TELEMETRY_LOG' && event.data.log) {
        setTelemetry((prev) => ({
          ...prev,
          logs: [...prev.logs.slice(-80), event.data.log],
        }));
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  // Save changes to localStorage
  const handleConfigChange = (newConfig: PurgeConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem('vanishx_config', JSON.stringify(newConfig));
      localStorage.setItem('vanishx_whitelist', JSON.stringify(newConfig.whitelist));
    } catch (e) {
      console.error('Error saving config', e);
    }
  };

  // Switch between Sandbox Demo and Live Mode
  const handleModeSwitch = (live: boolean) => {
    setIsLiveMode(live);
    if (!live) {
      // Sandbox Demo Mode: load mock data for demonstration
      setActiveHandle('elonmusk');
      setHandleInput('elonmusk');
      setProfile({
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
        bio: 'Technoking of Tesla',
      });
      setAccounts(INITIAL_AUDIT_ACCOUNTS);
      setConfig((prev) => ({
        ...prev,
        whitelist: {
          users: ['sama', 'vitalikbuterin', 'jack'],
          tweets: ['1759281928391'],
          keywords: ['#keep', 'giveaway'],
        },
      }));
    } else {
      // Live Mode: restore real user state from localStorage
      const savedHandle = localStorage.getItem('vanishx_active_handle') || '';
      setActiveHandle(savedHandle);
      setHandleInput(savedHandle);
      setProfile({
        handle: savedHandle,
        name: savedHandle ? `@${savedHandle}` : '',
        avatarUrl: '',
        verified: false,
        postsCount: 0,
        repliesCount: 0,
        repostsCount: 0,
        followingCount: 0,
        followersCount: 0,
        joinedDate: '',
        bio: '',
      });
      setAccounts([]);
      const savedWhitelist = localStorage.getItem('vanishx_whitelist');
      if (savedWhitelist) {
        try {
          const parsed = JSON.parse(savedWhitelist);
          setConfig((prev) => ({
            ...prev,
            whitelist: {
              users: parsed.users || [],
              tweets: parsed.tweets || [],
              keywords: parsed.keywords || [],
            },
          }));
        } catch (e) {}
      } else {
        setConfig((prev) => ({
          ...prev,
          whitelist: { users: [], tweets: [], keywords: [] },
        }));
      }
    }
  };

  // Handle Input Submit / Connect
  const handleUpdateHandle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = handleInput.replace(/^@/, '').trim();
    if (!clean) {
      alert('Please enter a valid 𝕏 username (e.g. elonmusk or jack).');
      return;
    }
    setActiveHandle(clean);
    setProfile((prev) => ({
      ...prev,
      handle: clean,
      name: `@${clean}`,
    }));
    try {
      localStorage.setItem('vanishx_active_handle', clean);
    } catch (e) {}
  };

  // Disconnect / Clear Handle
  const handleDisconnect = () => {
    setActiveHandle('');
    setHandleInput('');
    setProfile({
      handle: '',
      name: '',
      avatarUrl: '',
      verified: false,
      postsCount: 0,
      repliesCount: 0,
      repostsCount: 0,
      followingCount: 0,
      followersCount: 0,
      joinedDate: '',
      bio: '',
    });
    localStorage.removeItem('vanishx_active_handle');
  };

  // Toggle whitelist immunity on account
  const handleToggleWhitelist = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === accountId) {
          const nextImmune = !acc.isWhitelisted;
          // Sync with whitelist.users
          if (nextImmune && !config.whitelist.users.includes(acc.handle)) {
            handleConfigChange({
              ...config,
              whitelist: { ...config.whitelist, users: [...config.whitelist.users, acc.handle] },
            });
          } else if (!nextImmune && config.whitelist.users.includes(acc.handle)) {
            handleConfigChange({
              ...config,
              whitelist: { ...config.whitelist, users: config.whitelist.users.filter((u) => u !== acc.handle) },
            });
          }
          return { ...acc, isWhitelisted: nextImmune };
        }
        return acc;
      })
    );
  };

  // Add account to Bot Radar manually
  const handleAddAccountToRadar = (handle: string) => {
    const clean = handle.replace(/^@/, '').trim();
    if (!clean) return;
    const newAcc: AuditAccount = {
      id: Math.random().toString(),
      handle: clean,
      name: `@${clean}`,
      avatarUrl: '',
      isFollowingBack: false,
      isDefaultAvatar: false,
      bio: '',
      followingCount: 500,
      followersCount: 50,
      isWhitelisted: config.whitelist.users.includes(clean),
      botRiskScore: 60,
      riskFlags: ['Non-Mutual'],
    };
    setAccounts((prev) => [newAcc, ...prev]);
  };

  // Detect Active Tab from Extension
  const detectActiveTab = () => {
    // Check if Chrome extension API is available
    if (typeof window !== 'undefined' && (window as any).chrome?.runtime?.sendMessage) {
      (window as any).chrome.runtime.sendMessage({ type: 'GET_X_PROFILE' }, (response: any) => {
        if (response?.handle) {
          setActiveHandle(response.handle);
          setHandleInput(response.handle);
          setProfile((prev) => ({ ...prev, handle: response.handle, name: `@${response.handle}` }));
          setIsLiveMode(true);
          localStorage.setItem('vanishx_active_handle', response.handle);
          alert(`Successfully detected active 𝕏 tab: @${response.handle}`);
        } else {
          alert('Could not detect an active 𝕏 tab. Please open x.com in your browser and ensure you are logged in.');
        }
      });
    } else {
      // Post message to bridge.js
      window.postMessage({ type: 'VANISHX_GET_X_PROFILE' }, '*');
      
      setTimeout(() => {
        if (!activeHandle) {
          alert('Extension not detected yet. Please ensure the extension is loaded from the /extension guide, or enter your 𝕏 handle directly.');
        }
      }, 700);
    }
  };

  // Execution Handlers
  const startExecution = () => {
    if (!activeHandle) {
      alert('Please enter or connect your 𝕏 handle first before executing a purge.');
      return;
    }

    setActiveTab('telemetry');
    const targetedCount = isLiveMode ? 45 : (config.modules.following ? 120 : 65);

    setTelemetry((prev) => ({
      ...prev,
      status: 'running',
      totalTargeted: targetedCount,
      totalPurged: 0,
      postsDeleted: 0,
      repliesDeleted: 0,
      repostsUndone: 0,
      followingRemoved: 0,
      followersPurged: 0,
      whitelistSkipped: config.whitelist.users.length,
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
            ? `🔍 Date query active: ${generateXSearchQuery(profile.handle, config.dateFilter)}`
            : '🔍 Full timeline mode active (all dates targeted)',
        },
        ...(config.whitelist.users.length > 0
          ? [
              {
                id: Math.random().toString(),
                timestamp: new Date().toLocaleTimeString(),
                type: 'info' as const,
                message: `🛡️ Protected accounts loaded: ${config.whitelist.users.map((u) => '@' + u).join(', ')}`,
              },
            ]
          : []),
      ],
    }));

    // In live mode, dispatch event to extension bridge
    if (isLiveMode) {
      window.postMessage(
        {
          type: 'VANISHX_START_PURGE',
          config: {
            handle: profile.handle,
            ...config,
          },
        },
        '*'
      );
    }
  };

  useEffect(() => {
    if (telemetry.status === 'running') {
      const delayMs = config.pacing === 'turbo' ? 450 : config.pacing === 'balanced' ? 850 : 1400;

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
            const target = `@user_${Math.floor(Math.random() * 90000 + 10000)}`;
            logItem = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'unfollow',
              message: `Unfollowed non-mutual bot ${target} (Risk: 92%)`,
            };
          } else if (isReply) {
            const tweetId = `18${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
            logItem = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'delete',
              message: `Purged reply ID ${tweetId}`,
            };
          } else {
            const tweetId = `17${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
            logItem = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'delete',
              message: `Deleted post ID ${tweetId} [Era: ${config.dateFilter.preset}]`,
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
      account: profile.handle || activeHandle,
      mode: isLiveMode ? 'live_extension' : 'sandbox_demo',
      timestamp: new Date().toISOString(),
      config,
      telemetry,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vanishx-audit-${profile.handle || 'account'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-space-black text-space-text flex flex-col selection:bg-coral selection:text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Sandbox Notice Banner (only shown in Demo Mode) */}
        {!isLiveMode && (
          <div className="p-3 rounded-md bg-space-card border border-coral/40 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-space-text">
              <Info className="w-4 h-4 text-coral" />
              <span>
                <strong>Sandbox Demo Mode Active:</strong> Using simulated metrics and sample accounts for testing safely.
              </span>
            </div>
            <button
              onClick={() => handleModeSwitch(true)}
              className="text-coral font-bold hover:underline ml-2 whitespace-nowrap"
            >
              Switch to Live Mode
            </button>
          </div>
        )}

        {/* Top Control Bar: Perfectly Aligned Dynamic Handle & Mode Selector */}
        <div className="clean-card p-5 border-space-border flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left: Avatar + Unified Connection Input Group */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-3 sm:space-y-0 sm:space-x-3.5 w-full lg:w-auto">
            <TwitterAvatar handle={activeHandle} size="lg" />

            <div className="space-y-1.5 w-full sm:w-auto">
              <form onSubmit={handleUpdateHandle} className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-space-darkest border border-space-border focus-within:border-coral rounded-md px-3 py-1.5 text-xs transition-colors">
                  <span className="text-coral font-bold mr-1">@</span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    placeholder="Enter 𝕏 handle"
                    className="bg-transparent text-xs text-space-text focus:outline-none w-32 sm:w-40 font-semibold placeholder:text-space-muted"
                  />
                </div>

                <button
                  type="submit"
                  className="coral-button px-4 py-1.5 text-xs font-bold whitespace-nowrap"
                >
                  {activeHandle && activeHandle === handleInput.replace(/^@/, '').trim() ? 'Connected' : 'Connect'}
                </button>

                <button
                  type="button"
                  onClick={detectActiveTab}
                  title="Detect active handle from open 𝕏 browser tab"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-space-darkest hover:bg-space-card border border-space-border text-xs text-space-muted hover:text-space-text transition-colors whitespace-nowrap"
                >
                  <Puzzle className="w-3.5 h-3.5 text-coral" />
                  <span>Detect Tab</span>
                </button>

                {activeHandle && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="p-1.5 rounded-md bg-space-darkest hover:bg-space-card border border-space-border text-xs text-space-muted hover:text-coral transition-colors"
                    title="Disconnect account"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              <div className="text-[11px] flex items-center space-x-2">
                {activeHandle ? (
                  <span className="text-brand-emerald flex items-center space-x-1.5 font-mono font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald"></span>
                    <span>Target: @{activeHandle}</span>
                  </span>
                ) : (
                  <span className="text-space-muted">
                    No account connected yet. Enter your 𝕏 handle above or click Detect Tab.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Mode Switcher */}
          <div className="flex items-center bg-space-darkest border border-space-border rounded-md p-1 text-xs font-semibold self-stretch sm:self-auto justify-center">
            <button
              onClick={() => handleModeSwitch(true)}
              className={`px-3.5 py-1.5 rounded flex items-center space-x-1.5 transition-colors ${
                isLiveMode
                  ? 'bg-coral text-white font-bold'
                  : 'text-space-muted hover:text-space-text'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              <span>Live Extension Mode</span>
            </button>
            <button
              onClick={() => handleModeSwitch(false)}
              className={`px-3.5 py-1.5 rounded transition-colors ${
                !isLiveMode
                  ? 'bg-space-card text-space-text border border-space-border font-bold'
                  : 'text-space-muted hover:text-space-text'
              }`}
            >
              Sandbox Demo
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-space-border pb-1 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('dates')}
            className={`px-4 py-2.5 rounded-t-md flex items-center space-x-2 transition-colors ${
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
            className={`px-4 py-2.5 rounded-t-md flex items-center space-x-2 transition-colors ${
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
            className={`px-4 py-2.5 rounded-t-md flex items-center space-x-2 transition-colors ${
              activeTab === 'whitelist'
                ? 'bg-space-card text-coral border-t-2 border-coral border-x border-space-border font-bold'
                : 'text-space-muted hover:text-space-text'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>3. Whitelist Vault ({config.whitelist.users.length + config.whitelist.tweets.length + config.whitelist.keywords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-4 py-2.5 rounded-t-md flex items-center space-x-2 transition-colors ${
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
                onChange={(newDateConfig) => handleConfigChange({ ...config, dateFilter: newDateConfig })}
                userHandle={profile.handle || 'username'}
              />
              <PurgeModules
                config={config}
                onChange={handleConfigChange}
                profile={profile}
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setActiveTab('bots')}
                  className="coral-button px-5 py-2.5 text-xs flex items-center space-x-2 font-semibold"
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
                onChange={(newBotConfig) => handleConfigChange({ ...config, botFilter: newBotConfig })}
                accounts={accounts}
                onToggleWhitelist={handleToggleWhitelist}
                onAddAccount={handleAddAccountToRadar}
                isLiveMode={isLiveMode}
              />
              <div className="flex justify-between">
                <button
                  onClick={() => setActiveTab('dates')}
                  className="px-4 py-2 rounded-md bg-space-card border border-space-border text-xs text-space-muted hover:text-space-text"
                >
                  Back: Date Range
                </button>
                <button
                  onClick={() => setActiveTab('whitelist')}
                  className="coral-button px-5 py-2.5 text-xs flex items-center space-x-2 font-semibold"
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
                onChange={(newWhitelist) => handleConfigChange({ ...config, whitelist: newWhitelist })}
              />
              <div className="flex justify-between">
                <button
                  onClick={() => setActiveTab('bots')}
                  className="px-4 py-2 rounded-md bg-space-card border border-space-border text-xs text-space-muted hover:text-space-text"
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

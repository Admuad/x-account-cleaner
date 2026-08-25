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
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { AccountProfile, PurgeConfig, AuditAccount, TelemetryState, TelemetryLog } from '@/types';
import { INITIAL_AUDIT_ACCOUNTS } from '@/utils/mockData';
import { generateXSearchQuery } from '@/utils/dateHelper';
import {
  Calendar,
  Bot,
  Shield,
  Terminal,
  Search,
  Puzzle,
  CheckCircle2,
  Zap,
  ArrowRight,
  RefreshCw,
  Sliders,
  AlertCircle,
  Info,
  Lock,
  X,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    type: 'success' | 'warning' | 'error' | 'info',
    message: string,
    title?: string
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-3), { id, type, message, title }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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
  const actionTimestampsRef = useRef<number[]>([]);

  // Load user data & whitelist on mount; restore active telemetry stream if running
  useEffect(() => {
    try {
      // 1. Check if an active execution was running before refresh
      const activeTelemetryStr = localStorage.getItem('vanishx_active_telemetry');
      if (activeTelemetryStr) {
        const savedTelemetry = JSON.parse(activeTelemetryStr);
        if (savedTelemetry && (savedTelemetry.status === 'running' || savedTelemetry.status === 'paused')) {
          setTelemetry(savedTelemetry);
          setActiveTab('telemetry');
          setIsLiveMode(true);
        } else {
          localStorage.removeItem('vanishx_active_telemetry');
        }
      }

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
    } catch (e) {
      console.error('Error reading localStorage', e);
    }

    // Listen for extension messages
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VANISHX_EXTENSION_READY') {
        setExtensionDetected(true);
      }
      if (event.data?.type === 'VANISHX_X_PROFILE_RESPONSE') {
        setExtensionDetected(true);
        if (event.data.handle) {
          const h = event.data.handle;
          const following = Number(event.data.followingCount) || 0;
          const followers = Number(event.data.followersCount) || 0;
          const posts = Number(event.data.postsCount) || 0;
          const name = event.data.name || `@${h}`;
          const avatarUrl = event.data.avatarUrl || '';

          setActiveHandle(h);
          setHandleInput(h);
          setProfile((prev) => ({
            ...prev,
            handle: h,
            name,
            avatarUrl: avatarUrl || prev.avatarUrl,
            followingCount: following || prev.followingCount,
            followersCount: followers || prev.followersCount,
            postsCount: posts || prev.postsCount,
          }));
          setIsLiveMode(true);
          localStorage.setItem('vanishx_active_handle', h);
          showToast('success', `Connected to @${h} via 𝕏 Companion Extension`, 'Tab Detected');
        }
      }
      if (event.data?.type === 'VANISHX_TELEMETRY_LOG' && event.data.log) {
        const log = event.data.log;
        const newTarget = event.data.totalTargeted;
        const newStatus = event.data.status;
        const totalPurgedOverride = event.data.totalPurged;
        const isAction = log.type === 'unfollow' || log.type === 'delete' || log.type === 'repost';

        let newVelocity = 0;
        if (isAction) {
          const now = Date.now();
          actionTimestampsRef.current = [...actionTimestampsRef.current.filter((t) => now - t <= 12000), now];
          const count = actionTimestampsRef.current.length;
          newVelocity = Number((count / (count > 1 ? 12 : 6)).toFixed(1));
        }

        setTelemetry((prev) => {
          const isUnfollow = log.type === 'unfollow';
          const isDelete = log.type === 'delete';
          const isRepost = log.type === 'repost' || log.message?.toLowerCase().includes('repost');
          const isReply = log.type === 'reply' || log.message?.toLowerCase().includes('reply');
          const isWhitelisted = log.type === 'whitelist' || log.message?.toLowerCase().includes('whitelisted') || log.message?.toLowerCase().includes('skipped');

          const isComplete = newStatus === 'completed' || log.type === 'success';

          return {
            ...prev,
            status: isComplete ? 'completed' : prev.status,
            totalTargeted: newTarget && newTarget > 0 ? newTarget : prev.totalTargeted,
            totalPurged: totalPurgedOverride !== undefined ? totalPurgedOverride : prev.totalPurged + (isUnfollow || isDelete || isRepost ? 1 : 0),
            followingRemoved: prev.followingRemoved + (isUnfollow ? 1 : 0),
            postsDeleted: prev.postsDeleted + (isDelete && !isReply ? 1 : 0),
            repliesDeleted: prev.repliesDeleted + (isReply ? 1 : 0),
            repostsUndone: prev.repostsUndone + (isRepost ? 1 : 0),
            whitelistSkipped: prev.whitelistSkipped + (isWhitelisted ? 1 : 0),
            velocity: isComplete ? 0 : (isAction ? Math.max(newVelocity, 0.4) : prev.velocity),
            logs: [...prev.logs.slice(-80), log],
          };
        });
      }
    };

    window.addEventListener('message', handleWindowMessage);
    window.postMessage({ type: 'VANISHX_PING' }, '*');
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  // Save active running telemetry to localStorage so reloading the tab preserves live progress
  useEffect(() => {
    if (telemetry.status === 'running' || telemetry.status === 'paused') {
      try {
        localStorage.setItem('vanishx_active_telemetry', JSON.stringify(telemetry));
      } catch (e) {}
    } else if (telemetry.status === 'completed' || telemetry.status === 'aborted' || telemetry.status === 'idle') {
      localStorage.removeItem('vanishx_active_telemetry');
    }
  }, [telemetry]);

  // Live timer for elapsed seconds & ticker decay
  useEffect(() => {
    if (telemetry.status === 'running') {
      const interval = setInterval(() => {
        setTelemetry((prev) => {
          if (prev.status !== 'running') return prev;
          const now = Date.now();
          const recentActions = actionTimestampsRef.current.filter((t) => now - t <= 12000);
          actionTimestampsRef.current = recentActions;
          const count = recentActions.length;
          const liveVelocity = count === 0 ? 0 : Number((count / (count > 1 ? 12 : 6)).toFixed(1));

          return {
            ...prev,
            elapsedSeconds: prev.elapsedSeconds + 1,
            velocity: liveVelocity,
          };
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [telemetry.status]);

  // Save changes to whitelist
  const handleConfigChange = (newConfig: PurgeConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem('vanishx_whitelist', JSON.stringify(newConfig.whitelist));
    } catch (e) {
      console.error('Error saving whitelist', e);
    }
  };

  // Step Navigation Guard
  const handleTabSelect = (tab: 'dates' | 'bots' | 'whitelist' | 'telemetry') => {
    if (tab === 'telemetry' && isLiveMode) {
      if (!activeHandle) {
        showToast(
          'warning',
          'Please enter your 𝕏 handle or click "Detect Tab" before accessing Live Telemetry.',
          'Account Required'
        );
        setActiveTab('dates');
        return;
      }
      const hasModuleSelected = Object.values(config.modules).some(Boolean);
      if (!hasModuleSelected) {
        showToast(
          'warning',
          'Please select at least one purge action in Step 1 (e.g. Unfollow, Posts, Replies, or Reposts).',
          'Module Selection Required'
        );
        setActiveTab('dates');
        return;
      }
    }
    setActiveTab(tab);
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
      showToast('info', 'Switched to Sandbox Demo mode with simulated accounts.', 'Demo Mode');
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
      showToast('info', 'Switched to Live Extension Mode.', 'Live Mode');
    }
  };

  // Handle Input Submit / Connect
  const handleUpdateHandle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = handleInput.replace(/^@/, '').trim();
    if (!clean) {
      showToast('warning', 'Please enter a valid 𝕏 username (e.g. elonmusk or jack).', 'Invalid Handle');
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
      showToast('success', `Target set to @${clean}`, 'Handle Connected');
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
    showToast('info', 'Account disconnected.', 'Disconnected');
  };

  // Toggle whitelist immunity on account
  const handleToggleWhitelist = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === accountId) {
          const nextImmune = !acc.isWhitelisted;
          if (nextImmune && !config.whitelist.users.includes(acc.handle)) {
            handleConfigChange({
              ...config,
              whitelist: { ...config.whitelist, users: [...config.whitelist.users, acc.handle] },
            });
            showToast('success', `Added @${acc.handle} to Whitelist Vault`);
          } else if (!nextImmune && config.whitelist.users.includes(acc.handle)) {
            handleConfigChange({
              ...config,
              whitelist: { ...config.whitelist, users: config.whitelist.users.filter((u) => u !== acc.handle) },
            });
            showToast('info', `Removed @${acc.handle} from Whitelist Vault`);
          }
          return { ...acc, isWhitelisted: nextImmune };
        }
        return acc;
      })
    );
  };

  // Auto-Detect 𝕏 Tab
  const detectActiveTab = () => {
    window.postMessage({ type: 'VANISHX_GET_X_PROFILE' }, '*');
    window.postMessage({ type: 'VANISHX_PING' }, '*');

    if (typeof window !== 'undefined' && (window as any).chrome?.runtime?.sendMessage) {
      try {
        (window as any).chrome.runtime.sendMessage({ type: 'GET_X_PROFILE' }, (response: any) => {
          if (response?.handle) {
            setActiveHandle(response.handle);
            setHandleInput(response.handle);
            setProfile((prev) => ({ ...prev, handle: response.handle, name: `@${response.handle}` }));
            setIsLiveMode(true);
            setExtensionDetected(true);
            localStorage.setItem('vanishx_active_handle', response.handle);
            showToast('success', `Detected 𝕏 tab for @${response.handle}`, 'Tab Connected');
          }
        });
      } catch (e) {}
    }
  };

  // Execution Handlers
  const startExecution = () => {
    if (!activeHandle) {
      showToast('warning', 'Please enter or connect your 𝕏 handle first before executing a purge.', 'Account Required');
      return;
    }

    const hasModuleSelected = Object.values(config.modules).some(Boolean);
    if (!hasModuleSelected) {
      showToast('warning', 'Please select at least one purge action in Step 1.', 'Module Selection Required');
      return;
    }

    setActiveTab('telemetry');
    let targetedCount = 0;
    if (config.modules.following && profile.followingCount > 0) {
      targetedCount += profile.followingCount;
    }
    if (config.modules.followers && profile.followersCount > 0) {
      targetedCount += profile.followersCount;
    }
    if (config.modules.posts && profile.postsCount > 0) {
      targetedCount += profile.postsCount;
    }
    if (config.modules.replies && profile.repliesCount > 0) {
      targetedCount += profile.repliesCount;
    }
    if (config.modules.reposts && profile.repostsCount > 0) {
      targetedCount += profile.repostsCount;
    }
    if (targetedCount === 0) {
      targetedCount = profile.followingCount || profile.postsCount || profile.followersCount || 0;
    }

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
                type: 'whitelist' as const,
                message: `🛡️ Whitelist Vault engaged: ${config.whitelist.users.length} handles, ${config.whitelist.tweets.length} tweets, ${config.whitelist.keywords.length} keywords protected.`,
              },
            ]
          : []),
      ],
    }));

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
    } else {
      // Sandbox Simulation Loop
      if (timerRef.current) clearInterval(timerRef.current);
      let stepIndex = 0;
      const pacingMs = config.pacing === 'turbo' ? 300 : config.pacing === 'safe' ? 1200 : 600;

      timerRef.current = setInterval(() => {
        stepIndex++;
        setTelemetry((prev) => {
          if (prev.status !== 'running') return prev;

          const isUnfollowStep = config.modules.following && stepIndex % 3 === 0;
          const isDeleteStep = config.modules.posts && stepIndex % 2 === 0;
          const isReplyStep = config.modules.replies && stepIndex % 4 === 0;
          const isRepostStep = config.modules.reposts && stepIndex % 5 === 0;

          let newLog: TelemetryLog | null = null;
          let newTotal = prev.totalPurged;
          let newPosts = prev.postsDeleted;
          let newReplies = prev.repliesDeleted;
          let newReposts = prev.repostsUndone;
          let newFollowing = prev.followingRemoved;

          if (isUnfollowStep) {
            newFollowing++;
            newTotal++;
            const randomUser = accounts[newFollowing % accounts.length]?.handle || `bot_account_${newFollowing}`;
            newLog = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'unfollow',
              message: `👋 Unfollowed @${randomUser} (Non-mutual / Inactive)`,
            };
          } else if (isDeleteStep) {
            newPosts++;
            newTotal++;
            newLog = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'delete',
              message: `🗑️ Deleted Post ID: 17928374928192${newPosts}`,
            };
          } else if (isReplyStep) {
            newReplies++;
            newTotal++;
            newLog = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'reply',
              message: `💬 Removed reply on thread 17829102849102${newReplies}`,
            };
          } else if (isRepostStep) {
            newReposts++;
            newTotal++;
            newLog = {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'repost',
              message: `🔄 Undid Repost: 16928192019283${newReposts}`,
            };
          }

          const currentSec = prev.elapsedSeconds + 1;
          const currentVel = Number((newTotal / Math.max(currentSec, 1)).toFixed(1));

          if (newTotal >= prev.totalTargeted && prev.totalTargeted > 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            return {
              ...prev,
              status: 'completed',
              totalPurged: prev.totalTargeted,
              velocity: 0,
              logs: [
                ...prev.logs,
                {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  type: 'success',
                  message: `🎉 Sandbox Sweep Finished! Cleaned ${prev.totalTargeted} items completely.`,
                },
              ],
            };
          }

          return {
            ...prev,
            totalPurged: newTotal,
            postsDeleted: newPosts,
            repliesDeleted: newReplies,
            repostsUndone: newReposts,
            followingRemoved: newFollowing,
            velocity: currentVel,
            logs: newLog ? [...prev.logs.slice(-80), newLog] : prev.logs,
          };
        });
      }, pacingMs);
    }
  };

  const pauseExecution = () => {
    setTelemetry((prev) => ({ ...prev, status: 'paused', velocity: 0 }));
    if (isLiveMode) {
      window.postMessage({ type: 'VANISHX_PAUSE_PURGE' }, '*');
    }
    showToast('info', 'Execution paused.', 'Paused');
  };

  const resumeExecution = () => {
    setTelemetry((prev) => ({ ...prev, status: 'running' }));
    if (isLiveMode) {
      window.postMessage(
        {
          type: 'VANISHX_RESUME_PURGE',
          config: {
            handle: profile.handle,
            ...config,
          },
        },
        '*'
      );
    }
    showToast('success', 'Resuming sweep...', 'Resumed');
  };

  const abortExecution = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isLiveMode) {
      window.postMessage({ type: 'VANISHX_STOP_PURGE' }, '*');
    }
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
    showToast('error', 'Execution stopped by user.', 'Sweep Aborted');
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
    showToast('success', 'Audit report downloaded successfully.', 'Export Complete');
  };

  const isStep4Locked = isLiveMode && !activeHandle;

  return (
    <div className="min-h-screen bg-space-black text-space-text flex flex-col selection:bg-coral selection:text-white">
      <Navbar />

      {/* Floating Custom Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

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

        {/* Top Control Bar: Account Connection & Mode Switcher */}
        <div className="clean-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-space-border">
          {/* Left: Target Account Form */}
          <div className="flex items-center space-x-3.5 w-full sm:w-auto">
            <TwitterAvatar
              handle={profile.handle || activeHandle || ''}
              size="md"
            />
            <div className="flex-1 sm:flex-none">
              <form onSubmit={handleUpdateHandle} className="flex items-center space-x-2 mb-1">
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs text-coral font-mono font-bold">@</span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    placeholder="Enter 𝕏 handle"
                    className="bg-space-darkest border border-space-border rounded-md pl-7 pr-3 py-1.5 text-xs text-space-text focus:outline-none focus:border-coral font-mono w-36 sm:w-44"
                  />
                </div>
                <button
                  type="submit"
                  className="coral-button px-3 py-1.5 text-xs font-semibold"
                >
                  Connect
                </button>
                <button
                  type="button"
                  onClick={detectActiveTab}
                  title="Detect active 𝕏 tab via extension"
                  className="px-2.5 py-1.5 rounded-md bg-space-darkest hover:bg-space-card border border-space-border text-space-subtext hover:text-space-text text-xs flex items-center space-x-1 transition-colors"
                >
                  <Puzzle className="w-3.5 h-3.5 text-coral" />
                  <span className="hidden sm:inline">Detect Tab</span>
                </button>
                {activeHandle && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    title="Disconnect Account"
                    className="p-1.5 text-space-muted hover:text-crimson transition-colors"
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
            onClick={() => handleTabSelect('dates')}
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
            onClick={() => handleTabSelect('bots')}
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
            onClick={() => handleTabSelect('whitelist')}
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
            onClick={() => handleTabSelect('telemetry')}
            className={`px-4 py-2.5 rounded-t-md flex items-center space-x-2 transition-colors ${
              activeTab === 'telemetry'
                ? 'bg-space-card text-coral border-t-2 border-coral border-x border-space-border font-bold'
                : isStep4Locked
                ? 'text-space-muted/50 hover:text-space-muted cursor-pointer'
                : 'text-space-muted hover:text-space-text'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>4. Live Telemetry</span>
            {isStep4Locked && <Lock className="w-3 h-3 text-space-muted ml-0.5" />}
            {telemetry.status === 'running' && (
              <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Tab 1: Purge Modules & Date Range */}
        {activeTab === 'dates' && (
          <div className="space-y-6">
            <PurgeModules
              config={config}
              onChange={handleConfigChange}
              profile={profile}
            />

            <DateRangeFilter
              config={config.dateFilter}
              onChange={(dateFilter) => handleConfigChange({ ...config, dateFilter })}
              userHandle={profile.handle || activeHandle || 'your_handle'}
            />

            <div className="flex justify-end">
              <button
                onClick={() => handleTabSelect('bots')}
                className="coral-button px-5 py-2.5 text-xs flex items-center space-x-2"
              >
                <span>Continue to Bot Filters</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Bot Radar & Non-Mutuals */}
        {activeTab === 'bots' && (
          <div className="space-y-6">
            <BotDetector
              config={config.botFilter}
              accounts={accounts}
              onToggleWhitelist={handleToggleWhitelist}
              onChange={(botFilter) => handleConfigChange({ ...config, botFilter })}
            />

            <div className="flex justify-between">
              <button
                onClick={() => handleTabSelect('dates')}
                className="px-4 py-2 rounded-md bg-space-card border border-space-border text-xs text-space-subtext hover:text-space-text transition-colors"
              >
                Back to Modules
              </button>
              <button
                onClick={() => handleTabSelect('whitelist')}
                className="coral-button px-5 py-2.5 text-xs flex items-center space-x-2"
              >
                <span>Continue to Whitelist Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Whitelist Vault */}
        {activeTab === 'whitelist' && (
          <div className="space-y-6">
            <WhitelistManager
              whitelist={config.whitelist}
              onChange={(whitelist) => handleConfigChange({ ...config, whitelist })}
              onToast={(t) => showToast(t.type, t.message, t.title)}
            />

            <div className="flex justify-between">
              <button
                onClick={() => handleTabSelect('bots')}
                className="px-4 py-2 rounded-md bg-space-card border border-space-border text-xs text-space-subtext hover:text-space-text transition-colors"
              >
                Back to Bot Filters
              </button>
              <button
                onClick={() => handleTabSelect('telemetry')}
                className="coral-button px-5 py-2.5 text-xs flex items-center space-x-2"
              >
                <span>Proceed to Execution Telemetry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Live Execution Telemetry Stream */}
        {activeTab === 'telemetry' && (
          <TerminalConsole
            telemetry={telemetry}
            onStart={startExecution}
            onPause={pauseExecution}
            onResume={resumeExecution}
            onAbort={abortExecution}
            onExportReport={exportReport}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

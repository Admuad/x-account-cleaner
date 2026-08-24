'use client';

import React, { useState } from 'react';
import { Bot, UserX, Shield, AlertTriangle, CheckCircle2, Sliders, Users, Search, Plus, RefreshCw } from 'lucide-react';
import { BotFilterConfig, BotSensitivityPreset, AuditAccount } from '@/types';
import { calculateBotScore } from '@/utils/botScoring';
import { TwitterAvatar } from './TwitterAvatar';

interface BotDetectorProps {
  config: BotFilterConfig;
  onChange: (config: BotFilterConfig) => void;
  accounts: AuditAccount[];
  onToggleWhitelist: (accountId: string) => void;
  onAddAccount?: (handle: string) => void;
  onScanFollowing?: () => void;
  isLiveMode?: boolean;
}

export const BotDetector: React.FC<BotDetectorProps> = ({
  config,
  onChange,
  accounts,
  onToggleWhitelist,
  onAddAccount,
  onScanFollowing,
  isLiveMode = false,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'flagged' | 'whitelisted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newHandleInput, setNewHandleInput] = useState('');

  const presets: { id: BotSensitivityPreset; title: string; desc: string }[] = [
    {
      id: 'moderate',
      title: 'Balanced Bot Sweeper',
      desc: 'Flags high-confidence bots (default avatars, empty bios, extreme ratios).',
    },
    {
      id: 'aggressive',
      title: 'Aggressive Purge',
      desc: 'Flags all non-mutuals, suspected scrapers, and unverified bot handles.',
    },
    {
      id: 'non_mutuals_only',
      title: 'Non-Mutuals Only',
      desc: 'Strictly unfollows accounts that do not follow you back (ignores mutuals).',
    },
    {
      id: 'custom',
      title: 'Custom Multi-Factor Rules',
      desc: 'Toggle individual heuristic weights and relationship parameters.',
    },
  ];

  // Evaluate accounts with active bot config
  const evaluatedAccounts = accounts.map((acc) => {
    const evaluation = calculateBotScore(acc, config);
    return {
      ...acc,
      botRiskScore: evaluation.score,
      riskFlags: evaluation.flags,
      shouldUnfollow: evaluation.shouldUnfollow,
    };
  });

  const flaggedCount = evaluatedAccounts.filter((a) => a.shouldUnfollow).length;
  const whitelistedCount = evaluatedAccounts.filter((a) => a.isWhitelisted).length;

  const filteredList = evaluatedAccounts.filter((a) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!a.handle.toLowerCase().includes(q) && !(a.name || '').toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filterTab === 'flagged') return a.shouldUnfollow;
    if (filterTab === 'whitelisted') return a.isWhitelisted;
    return true;
  });

  const handleAddNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandleInput.trim() || !onAddAccount) return;
    onAddAccount(newHandleInput.trim().replace(/^@/, ''));
    setNewHandleInput('');
  };

  return (
    <div id="bot-detector" className="clean-card p-5 border-space-border">
      {/* Component Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-space-darkest border border-space-border flex items-center justify-center text-coral">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-space-text flex items-center space-x-2">
              <span>Multi-Factor Bot & Non-Mutual Radar</span>
              <span className="coral-badge text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                HEURISTIC ENGINE
              </span>
            </h2>
            <p className="text-xs text-space-muted">
              Classify accounts by relationship, avatar status, numeric patterns, & follow ratios
            </p>
          </div>
        </div>

        {/* Enable / Disable Toggle */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-space-border-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-coral"></div>
        </label>
      </div>

      {config.enabled ? (
        <div className="space-y-4 pt-1">
          {/* Preset Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {presets.map((p) => {
              const isSelected = config.preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onChange({ ...config, preset: p.id })}
                  className={`p-3 rounded-md text-left transition-colors border ${
                    isSelected
                      ? 'bg-space-card-hover border-coral'
                      : 'bg-space-darkest border-space-border hover:border-space-border-light'
                  }`}
                >
                  <div className="text-xs font-bold text-space-text mb-1 flex items-center justify-between">
                    <span>{p.title}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-coral"></span>}
                  </div>
                  <p className="text-[11px] text-space-muted leading-snug">{p.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Granular Custom Checkboxes (if custom selected) */}
          {config.preset === 'custom' && (
            <div className="p-3.5 rounded-md bg-space-darkest border border-space-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              <label className="flex items-center space-x-2 text-space-subtext cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.unfollowNonMutuals}
                  onChange={(e) => onChange({ ...config, unfollowNonMutuals: e.target.checked })}
                  className="rounded border-space-border text-coral focus:ring-coral"
                />
                <span>Unfollow Non-Mutuals (No "Follows you" tag)</span>
              </label>

              <label className="flex items-center space-x-2 text-space-subtext cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.unfollowDefaultAvatar}
                  onChange={(e) => onChange({ ...config, unfollowDefaultAvatar: e.target.checked })}
                  className="rounded border-space-border text-coral focus:ring-coral"
                />
                <span>Default / Egg Avatars</span>
              </label>

              <label className="flex items-center space-x-2 text-space-subtext cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.unfollowNumericHandle}
                  onChange={(e) => onChange({ ...config, unfollowNumericHandle: e.target.checked })}
                  className="rounded border-space-border text-coral focus:ring-coral"
                />
                <span>Auto-Generated Handles (@user123456)</span>
              </label>

              <label className="flex items-center space-x-2 text-space-subtext cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.unfollowEmptyBio}
                  onChange={(e) => onChange({ ...config, unfollowEmptyBio: e.target.checked })}
                  className="rounded border-space-border text-coral focus:ring-coral"
                />
                <span>Empty Bio & No Header Banner</span>
              </label>

              <label className="flex items-center space-x-2 text-space-subtext cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.unfollowExtremeRatio}
                  onChange={(e) => onChange({ ...config, unfollowExtremeRatio: e.target.checked })}
                  className="rounded border-space-border text-coral focus:ring-coral"
                />
                <span>Extreme Follow Ratio (&gt;50x Followers)</span>
              </label>
            </div>
          )}

          {/* Interactive Account Audit Deck */}
          <div className="pt-2">
            {/* Top Toolbar: Search, Add, Deck Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 text-xs">
              <div className="flex items-center space-x-2 flex-1 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-space-muted absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter audit accounts..."
                    className="w-full bg-space-darkest border border-space-border rounded-md pl-8 pr-3 py-1.5 text-xs text-space-text focus:outline-none focus:border-coral"
                  />
                </div>

                {onAddAccount && (
                  <form onSubmit={handleAddNewAccount} className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      value={newHandleInput}
                      onChange={(e) => setNewHandleInput(e.target.value)}
                      placeholder="Add @handle"
                      className="w-28 bg-space-darkest border border-space-border rounded-md px-2.5 py-1.5 text-xs text-space-text focus:outline-none focus:border-coral"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 rounded-md bg-space-card hover:bg-space-card-hover border border-space-border text-xs text-space-text"
                      title="Add account to radar"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>

              {/* Deck Tabs & Actions */}
              <div className="flex items-center space-x-2">
                {onScanFollowing && (
                  <button
                    onClick={onScanFollowing}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-space-darkest hover:bg-space-card border border-space-border text-[11px] text-space-text transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-coral" />
                    <span>Scan Following</span>
                  </button>
                )}

                <div className="flex items-center space-x-1 bg-space-darkest p-0.5 rounded-md border border-space-border">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold ${
                      filterTab === 'all' ? 'bg-space-card text-space-text' : 'text-space-muted'
                    }`}
                  >
                    All ({evaluatedAccounts.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('flagged')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold ${
                      filterTab === 'flagged' ? 'bg-coral text-white' : 'text-space-muted'
                    }`}
                  >
                    Targeted ({flaggedCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('whitelisted')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold ${
                      filterTab === 'whitelisted' ? 'bg-brand-emerald text-black' : 'text-space-muted'
                    }`}
                  >
                    Immune ({whitelistedCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Account Cards Grid */}
            {filteredList.length === 0 ? (
              <div className="p-8 rounded-md bg-space-darkest border border-dashed border-space-border text-center text-xs text-space-muted">
                {accounts.length === 0 ? (
                  <div className="space-y-2">
                    <p>No following accounts loaded yet.</p>
                    <p className="text-[11px]">Connect the extension or add accounts to inspect bot risk.</p>
                  </div>
                ) : (
                  <p>No accounts match your active filter.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {filteredList.map((acc) => {
                  return (
                    <div
                      key={acc.id}
                      className={`p-3 rounded-md border transition-colors ${
                        acc.isWhitelisted
                          ? 'bg-space-darkest border-brand-emerald/40'
                          : acc.shouldUnfollow
                          ? 'bg-space-darkest border-coral/50'
                          : 'bg-space-darkest border-space-border'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2.5">
                          <TwitterAvatar handle={acc.handle} size="sm" />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-space-text">{acc.name || acc.handle}</span>
                              <span className="text-[11px] text-space-muted">@{acc.handle}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-space-muted font-mono mt-0.5">
                              <span>{acc.followingCount.toLocaleString()} Following</span>
                              <span>•</span>
                              <span>{acc.followersCount.toLocaleString()} Followers</span>
                            </div>
                          </div>
                        </div>

                        {/* Bot Score Badge & Whitelist Toggle */}
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              acc.botRiskScore >= 70
                                ? 'bg-red-950/70 text-red-400 border border-red-800/60'
                                : acc.botRiskScore >= 40
                                ? 'bg-amber-950/70 text-amber-400 border border-amber-800/60'
                                : 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                            }`}
                          >
                            Risk: {acc.botRiskScore}%
                          </span>

                          <button
                            onClick={() => onToggleWhitelist(acc.id)}
                            title={acc.isWhitelisted ? 'Immune to Unfollowing (Whitelisted)' : 'Add to Whitelist'}
                            className={`p-1 rounded text-xs border ${
                              acc.isWhitelisted
                                ? 'bg-brand-emerald text-black border-brand-emerald'
                                : 'bg-space-card text-space-muted border-space-border hover:text-coral'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Risk Flags Pills */}
                      {acc.riskFlags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {acc.riskFlags.map((flag, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-space-card border border-space-border text-space-muted"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-md bg-space-darkest/60 border border-dashed border-space-border text-center text-xs text-space-muted">
          Bot & relationship detection is disabled.
        </div>
      )}
    </div>
  );
};

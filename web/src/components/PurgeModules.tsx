'use client';

import React from 'react';
import { Trash2, MessageSquare, Repeat, UserMinus, Users, Gauge } from 'lucide-react';
import { PurgeConfig, PacingSpeed, AccountProfile } from '@/types';

interface PurgeModulesProps {
  config: PurgeConfig;
  onChange: (config: PurgeConfig) => void;
  profile: AccountProfile;
}

export const PurgeModules: React.FC<PurgeModulesProps> = ({
  config,
  onChange,
  profile,
}) => {
  const toggleModule = (key: keyof PurgeConfig['modules']) => {
    onChange({
      ...config,
      modules: {
        ...config.modules,
        [key]: !config.modules[key],
      },
    });
  };

  const setPacing = (pacing: PacingSpeed) => {
    onChange({
      ...config,
      pacing,
    });
  };

  const modulesList: {
    key: keyof PurgeConfig['modules'];
    title: string;
    desc: string;
    count: number;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'posts',
      title: 'Original Posts',
      desc: 'Stand-alone tweets authored by your account',
      count: profile.postsCount,
      icon: <Trash2 className="w-4 h-4 text-coral" />,
    },
    {
      key: 'replies',
      title: 'Replies & Mentions',
      desc: 'All responses, threads, and tweet interactions',
      count: profile.repliesCount,
      icon: <MessageSquare className="w-4 h-4 text-coral" />,
    },
    {
      key: 'reposts',
      title: 'Reposts / Retweets',
      desc: 'Shared retweets on the dedicated /reposts tab',
      count: profile.repostsCount,
      icon: <Repeat className="w-4 h-4 text-coral" />,
    },
    {
      key: 'following',
      title: 'Following Cleanup',
      desc: 'Unfollow non-mutuals, bots, & inactive handles',
      count: profile.followingCount,
      icon: <UserMinus className="w-4 h-4 text-coral" />,
    },
    {
      key: 'followers',
      title: 'Remove Followers',
      desc: 'Block & unblock ghost followers to cleanse ratio',
      count: profile.followersCount,
      icon: <Users className="w-4 h-4 text-coral" />,
    },
  ];

  return (
    <div className="clean-card p-5 border-space-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-space-text flex items-center space-x-2">
            <span>Target Modules</span>
            <span className="coral-badge text-[10px] font-mono px-2 py-0.5 rounded font-bold">
              SELECTIVE PURGE
            </span>
          </h2>
          <p className="text-xs text-space-muted">
            Choose which areas of your account to scan and clean
          </p>
        </div>

        {/* Pacing Speed Selector */}
        <div className="flex items-center space-x-1.5 bg-space-darkest p-1 rounded-md border border-space-border text-xs">
          <Gauge className="w-3.5 h-3.5 text-coral ml-1" />
          <button
            onClick={() => setPacing('safe')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
              config.pacing === 'safe'
                ? 'bg-space-card text-brand-emerald font-bold border border-space-border'
                : 'text-space-muted hover:text-space-text'
            }`}
          >
            Safe (2.5s-4.5s)
          </button>
          <button
            onClick={() => setPacing('balanced')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
              config.pacing === 'balanced'
                ? 'bg-space-card text-coral font-bold border border-space-border'
                : 'text-space-muted hover:text-space-text'
            }`}
          >
            Balanced (1.2s-2.5s)
          </button>
          <button
            onClick={() => setPacing('turbo')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
              config.pacing === 'turbo'
                ? 'bg-space-card text-amber-400 font-bold border border-space-border'
                : 'text-space-muted hover:text-space-text'
            }`}
          >
            Turbo (0.7s-1.2s)
          </button>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {modulesList.map((m) => {
          const isEnabled = config.modules[m.key];
          return (
            <div
              key={m.key}
              onClick={() => toggleModule(m.key)}
              className={`p-3.5 rounded-md border cursor-pointer transition-colors flex items-start justify-between ${
                isEnabled
                  ? 'bg-space-card-hover border-coral'
                  : 'bg-space-darkest border-space-border hover:border-space-border-light'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-md bg-space-card border border-space-border">
                  {m.icon}
                </div>
                <div>
                  <div className="text-xs font-bold text-space-text flex items-center space-x-2">
                    <span>{m.title}</span>
                    {m.count > 0 && (
                      <span className="font-mono text-[10px] text-space-muted bg-space-card px-1.5 py-0.2 rounded border border-space-border">
                        {m.count.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-space-muted leading-tight mt-0.5">
                    {m.desc}
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={isEnabled}
                onChange={() => {}}
                className="mt-1 rounded border-space-border text-coral focus:ring-coral pointer-events-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

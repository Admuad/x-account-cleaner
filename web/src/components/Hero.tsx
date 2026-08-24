'use client';

import React from 'react';
import { Calendar, Bot, ShieldCheck, Zap, ArrowRight, Play, Terminal, Lock, CheckCircle2 } from 'lucide-react';
import { AccountProfile } from '@/types';

interface HeroProps {
  profile: AccountProfile;
  onExploreDemo: () => void;
  onConnect: () => void;
  isConnected: boolean;
}

export const Hero: React.FC<HeroProps> = ({
  profile,
  onExploreDemo,
  onConnect,
  isConnected,
}) => {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 border-b border-space-border">
      {/* Background Subtle Coral Glow Accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-coral/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Tag Pill */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-space-card border border-space-border text-xs font-medium text-coral mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-coral animate-ping"></span>
            <span>Zero Serverless Compute Limits • 100% Client-Side Engine</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-space-text tracking-tight leading-tight mb-6">
            Surgically Purge Your 𝕏 Timeline. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral via-coral-400 to-amber-400">
              Unfollow Bots & Non-Mutuals.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-space-muted leading-relaxed mb-8">
            Autonomous, high-speed account cleaner that executes directly on your device. Filter tweets by custom dates (e.g. before Dec 31, 2025), mass-unfollow ghost bots, and wipe thousands of posts with zero cloud credential risk.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <button
              onClick={onExploreDemo}
              className="coral-button px-6 py-3.5 text-sm flex items-center space-x-2.5 shadow-coral-sm"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Interactive Sandbox</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!isConnected ? (
              <button
                onClick={onConnect}
                className="px-6 py-3.5 rounded-lg bg-space-card hover:bg-space-card-hover border border-space-border text-space-text font-semibold text-sm flex items-center space-x-2.5 transition-all"
              >
                <span>Connect 𝕏 Profile (OAuth 2.0)</span>
              </button>
            ) : (
              <div className="px-5 py-3 rounded-lg bg-space-card border border-brand-emerald/40 text-brand-emerald font-semibold text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Connected as @{profile.handle}</span>
              </div>
            )}
          </div>

          {/* Device Agnostic Support Badges */}
          <div className="flex items-center justify-center space-x-6 text-xs text-space-muted">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-coral"></span>
              <span>macOS</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-coral"></span>
              <span>Windows</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-coral"></span>
              <span>Linux</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-coral"></span>
              <span>iOS / Android (Kiwi & Orion)</span>
            </span>
          </div>
        </div>

        {/* Feature Grid Highlights */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-14">
          <div className="clean-card p-5">
            <div className="w-10 h-10 rounded-lg bg-space-darkest border border-space-border flex items-center justify-center text-coral mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-space-text mb-1">Date-Range Engine</h3>
            <p className="text-xs text-space-muted">
              Target posts before Dec 31 2025, between custom dates, or from account creation with search jump queries.
            </p>
          </div>

          <div className="clean-card p-5">
            <div className="w-10 h-10 rounded-lg bg-space-darkest border border-space-border flex items-center justify-center text-coral mb-3">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-space-text mb-1">Multi-Factor Bot Radar</h3>
            <p className="text-xs text-space-muted">
              Intelligently scores non-mutuals, default egg avatars, random digit handles, and inactive scrapers.
            </p>
          </div>

          <div className="clean-card p-5">
            <div className="w-10 h-10 rounded-lg bg-space-darkest border border-space-border flex items-center justify-center text-coral mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-space-text mb-1">Immutable Whitelist</h3>
            <p className="text-xs text-space-muted">
              Safeguard friends, viral tweets, and protected keywords with foolproof zero-state preservation.
            </p>
          </div>

          <div className="clean-card p-5">
            <div className="w-10 h-10 rounded-lg bg-space-darkest border border-space-border flex items-center justify-center text-coral mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-space-text mb-1">Zero-State Ground Truth</h3>
            <p className="text-xs text-space-muted">
              Header post-counter verification loop ensures 100% clean wipe without virtual DOM phantom leftovers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

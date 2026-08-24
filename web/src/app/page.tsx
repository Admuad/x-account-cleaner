'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Calendar, Bot, ShieldCheck, ArrowRight, Terminal, Puzzle, Play, CheckCircle2 } from 'lucide-react';
import { TwitterAvatar } from '@/components/TwitterAvatar';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-space-black text-space-text flex flex-col selection:bg-coral/20 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-20 pb-20 border-b border-space-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-space-card border border-space-border text-xs font-semibold text-coral mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-coral"></span>
            <span>Client-Side Architecture • Zero Server Quotas</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-space-text mb-6">
            Surgically Purge Your 𝕏 History. <br />
            <span className="text-coral">
              Unfollow Bots & Non-Mutuals.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-space-muted leading-relaxed mb-10">
            Autonomous account cleaner engineered to run directly in your browser. Target historical posts before specific dates, isolate non-mutual bots, and cleanse timelines with zero cloud credential risk.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-16">
            <Link
              href="/app"
              className="coral-button px-6 py-3 text-xs font-bold flex items-center space-x-2"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Launch Web App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/extension"
              className="px-5 py-3 rounded-md bg-space-card hover:bg-space-card-hover border border-space-border text-space-text font-semibold text-xs flex items-center space-x-2 transition-colors"
            >
              <Puzzle className="w-3.5 h-3.5 text-coral" />
              <span>Browser Extension</span>
            </Link>

            <Link
              href="/cli"
              className="px-5 py-3 rounded-md bg-space-darkest hover:bg-space-card border border-space-border text-space-muted hover:text-space-text font-semibold text-xs flex items-center space-x-2 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Terminal CLI Guide</span>
            </Link>
          </div>

          {/* Clean Parameter Overview Card */}
          <div className="clean-card p-5 border-space-border max-w-3xl mx-auto text-left">
            <div className="flex items-center justify-between border-b border-space-border pb-3.5 mb-3.5">
              <div className="flex items-center space-x-3">
                <TwitterAvatar handle="elonmusk" size="md" />
                <div>
                  <div className="text-xs font-bold text-space-text">Autonomous Clean Engine</div>
                  <div className="text-[11px] text-space-muted font-mono">Status: Standby • Ground Truth Loop Active</div>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>READY</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-space-darkest p-3 rounded-md border border-space-border">
                <div className="text-[10px] font-mono text-space-muted uppercase">Date Window</div>
                <div className="font-bold text-space-text mt-1">Before Dec 31, 2025</div>
                <div className="text-[10px] text-coral font-mono mt-0.5">until:2025-12-31</div>
              </div>

              <div className="bg-space-darkest p-3 rounded-md border border-space-border">
                <div className="text-[10px] font-mono text-space-muted uppercase">Bot Classification</div>
                <div className="font-bold text-space-text mt-1">Multi-Factor Scoring</div>
                <div className="text-[10px] text-amber-400 font-mono mt-0.5">Flags: Default Avatar, Non-Mutual</div>
              </div>

              <div className="bg-space-darkest p-3 rounded-md border border-space-border">
                <div className="text-[10px] font-mono text-space-muted uppercase">Execution Runtime</div>
                <div className="font-bold text-space-text mt-1">Client-Side Tab Bridge</div>
                <div className="text-[10px] text-brand-emerald font-mono mt-0.5">0 Cloud Tokens Stored</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-space-text tracking-tight mb-2">
            Engineered for Precision & Safety
          </h2>
          <p className="text-xs text-space-muted">
            Eliminate hours of manual scrolling with zero-state verification loops.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="clean-card p-5">
            <div className="w-8 h-8 rounded-md bg-space-darkest border border-space-border flex items-center justify-center text-coral mb-3">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-space-text mb-1.5">Fast-Forward Date Windowing</h3>
            <p className="text-xs text-space-muted leading-relaxed">
              Target specific eras without infinite scrolling. Jump directly to historical dates (e.g. before 2026) using native search operators (`until:YYYY-MM-DD`).
            </p>
          </div>

          <div className="clean-card p-5">
            <div className="w-8 h-8 rounded-md bg-space-darkest border border-space-border flex items-center justify-center text-coral mb-3">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-space-text mb-1.5">Multi-Factor Bot Radar</h3>
            <p className="text-xs text-space-muted leading-relaxed">
              Unfollow non-mutuals, default egg avatars, random numeric handles (`@user128491`), and inactive accounts with custom sensitivity tuning.
            </p>
          </div>

          <div className="clean-card p-5">
            <div className="w-8 h-8 rounded-md bg-space-darkest border border-space-border flex items-center justify-center text-coral mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-space-text mb-1.5">Immutable Whitelist Vault</h3>
            <p className="text-xs text-space-muted leading-relaxed">
              Never delete a milestone tweet or unfollow a friend. Protect specific usernames, tweet IDs, and preservation keywords like `#keep`.
            </p>
          </div>
        </div>
      </section>

      {/* Execution Environments */}
      <section className="py-14 bg-space-darkest/60 border-t border-space-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-lg sm:text-xl font-bold text-space-text tracking-tight mb-2">
              Three Execution Modes
            </h2>
            <p className="text-xs text-space-muted">
              Select the mode that best fits your environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Web App */}
            <div className="clean-card p-5 border-space-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-coral uppercase font-mono">Interactive Web</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-card text-space-muted font-mono border border-space-border">No Install</span>
                </div>
                <h3 className="text-sm font-bold text-space-text mb-1.5">Web App Dashboard</h3>
                <p className="text-xs text-space-muted mb-4 leading-relaxed">
                  Graphical control room with date pickers, bot sensitivity sliders, and live telemetry simulation.
                </p>
              </div>
              <Link href="/app" className="coral-button w-full py-2 text-xs text-center font-bold">
                Launch Web App
              </Link>
            </div>

            {/* Browser Extension */}
            <div className="clean-card p-5 border-coral/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-coral uppercase font-mono">Direct Tab Bridge</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-darkest text-coral font-mono border border-coral/40 font-bold">Recommended</span>
                </div>
                <h3 className="text-sm font-bold text-space-text mb-1.5">Companion Extension</h3>
                <p className="text-xs text-space-muted mb-4 leading-relaxed">
                  Runs directly in your active 𝕏 browser tab. Zero login credentials needed, bypassing all server timeouts.
                </p>
              </div>
              <Link href="/extension" className="coral-button w-full py-2 text-xs text-center font-bold">
                Install Extension
              </Link>
            </div>

            {/* Terminal CLI */}
            <div className="clean-card p-5 border-space-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-amber-400 uppercase font-mono">Headless CLI</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-card text-space-muted font-mono border border-space-border">Terminal</span>
                </div>
                <h3 className="text-sm font-bold text-space-text mb-1.5">Terminal CLI Tool</h3>
                <p className="text-xs text-space-muted mb-4 leading-relaxed">
                  Standalone automation engine for background cron jobs, bulk purges, and automated account hygiene.
                </p>
              </div>
              <Link href="/cli" className="px-4 py-2 rounded-md bg-space-card hover:bg-space-card-hover border border-space-border text-space-text text-xs text-center font-semibold transition-colors">
                View CLI Guide
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

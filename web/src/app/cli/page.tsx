'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Terminal, Copy, Check, Play, Shield, Code, Cpu, Download, ArrowRight } from 'lucide-react';

export default function CliPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Interactive Flag Generator State
  const [flags, setFlags] = useState({
    posts: true,
    replies: true,
    reposts: false,
    unfollow: false,
    untilDate: '2025-12-31',
    hasDate: true,
    turbo: false,
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate dynamic CLI command
  const generateCommand = () => {
    const parts = ['npx x-account-cleaner'];
    if (flags.posts) parts.push('--posts');
    if (flags.replies) parts.push('--replies');
    if (flags.reposts) parts.push('--reposts');
    if (flags.unfollow) parts.push('--unfollow');
    if (flags.hasDate && flags.untilDate) parts.push(`--until ${flags.untilDate}`);
    if (flags.turbo) parts.push('--turbo');
    return parts.join(' ');
  };

  const steps = [
    {
      id: 'step1',
      title: 'Step 1: Install or Clone CLI Tool',
      desc: 'Run directly via npx or clone the standalone lightweight repo',
      commands: [
        { label: 'Instant 1-Line Run (Zero Clone)', cmd: 'npx x-account-cleaner' },
        { label: 'Sparse Clone (CLI Only)', cmd: 'git clone --depth 1 https://github.com/Admuad/x-account-cleaner.git\ncd x-account-cleaner\nnpm install' },
      ],
    },
    {
      id: 'step2',
      title: 'Step 2: Authenticate 𝕏 Session',
      desc: 'Inject your active session cookies once. Never stores your password.',
      commands: [
        { label: 'Interactive Session Cookie Injector', cmd: 'npm run set-cookies' },
      ],
      note: 'Enter your auth_token and ct0 from Chrome DevTools (Application > Cookies > x.com).',
    },
    {
      id: 'step3',
      title: 'Step 3: Launch Interactive Wizard',
      desc: 'Starts the guided terminal wizard with preset options and safe pacing',
      commands: [
        { label: 'Launch Interactive CLI', cmd: 'npm start' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-space-black text-space-text flex flex-col selection:bg-coral selection:text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-space-card border border-space-border text-xs font-semibold text-amber-400 mb-4">
            <Terminal className="w-3.5 h-3.5" />
            <span>Developer & Autonomous Terminal Mode</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-space-text tracking-tight mb-3">
            Terminal CLI Documentation & Hub
          </h1>
          <p className="text-xs sm:text-sm text-space-muted">
            Run autonomous purges on macOS, Linux, or Windows via high-speed Playwright automation.
          </p>
        </div>

        {/* Step-by-Step Setup Guide */}
        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div key={step.id} className="clean-card p-6 border-space-border">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-space-text">{step.title}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-darkest text-coral border border-space-border font-bold">
                  0{idx + 1}
                </span>
              </div>
              <p className="text-xs text-space-muted mb-4">{step.desc}</p>

              <div className="space-y-3">
                {step.commands.map((c, cIdx) => {
                  const cmdKey = `${step.id}-${cIdx}`;
                  const isCopied = copiedId === cmdKey;
                  return (
                    <div key={cIdx} className="bg-space-darkest p-3 rounded-lg border border-space-border font-mono text-xs">
                      <div className="flex items-center justify-between text-[11px] text-space-muted mb-1">
                        <span>{c.label}</span>
                        <button
                          onClick={() => copyToClipboard(c.cmd, cmdKey)}
                          className="flex items-center space-x-1 text-coral hover:text-coral-light transition-colors"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-brand-emerald" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="text-space-text whitespace-pre-wrap select-all overflow-x-auto">
                        {c.cmd}
                      </pre>
                    </div>
                  );
                })}
              </div>

              {step.note && (
                <div className="mt-3 p-2.5 rounded bg-space-card/60 border border-space-border text-[11px] text-space-muted">
                  💡 <span className="font-semibold text-space-text">Tip:</span> {step.note}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Interactive CLI Flag Generator */}
        <div className="clean-card p-6 border-coral/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-space-text flex items-center space-x-2">
                <span>Interactive Command Flag Generator</span>
                <span className="coral-badge text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  CUSTOM RUN
                </span>
              </h2>
              <p className="text-xs text-space-muted">
                Configure your options and copy the exact command line string
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs mb-4">
            <label className="flex items-center space-x-2 text-space-subtext cursor-pointer bg-space-darkest p-2.5 rounded-lg border border-space-border">
              <input
                type="checkbox"
                checked={flags.posts}
                onChange={(e) => setFlags({ ...flags, posts: e.target.checked })}
                className="rounded border-space-border text-coral focus:ring-coral"
              />
              <span>--posts (Target Posts)</span>
            </label>

            <label className="flex items-center space-x-2 text-space-subtext cursor-pointer bg-space-darkest p-2.5 rounded-lg border border-space-border">
              <input
                type="checkbox"
                checked={flags.replies}
                onChange={(e) => setFlags({ ...flags, replies: e.target.checked })}
                className="rounded border-space-border text-coral focus:ring-coral"
              />
              <span>--replies (Target Replies)</span>
            </label>

            <label className="flex items-center space-x-2 text-space-subtext cursor-pointer bg-space-darkest p-2.5 rounded-lg border border-space-border">
              <input
                type="checkbox"
                checked={flags.reposts}
                onChange={(e) => setFlags({ ...flags, reposts: e.target.checked })}
                className="rounded border-space-border text-coral focus:ring-coral"
              />
              <span>--reposts (/reposts tab)</span>
            </label>

            <label className="flex items-center space-x-2 text-space-subtext cursor-pointer bg-space-darkest p-2.5 rounded-lg border border-space-border">
              <input
                type="checkbox"
                checked={flags.unfollow}
                onChange={(e) => setFlags({ ...flags, unfollow: e.target.checked })}
                className="rounded border-space-border text-coral focus:ring-coral"
              />
              <span>--unfollow (Clean Following)</span>
            </label>

            <label className="flex items-center space-x-2 text-space-subtext cursor-pointer bg-space-darkest p-2.5 rounded-lg border border-space-border">
              <input
                type="checkbox"
                checked={flags.turbo}
                onChange={(e) => setFlags({ ...flags, turbo: e.target.checked })}
                className="rounded border-space-border text-coral focus:ring-coral"
              />
              <span>--turbo (Fast 0.7s Pacing)</span>
            </label>

            <div className="bg-space-darkest p-2.5 rounded-lg border border-space-border flex items-center space-x-2">
              <input
                type="checkbox"
                checked={flags.hasDate}
                onChange={(e) => setFlags({ ...flags, hasDate: e.target.checked })}
                className="rounded border-space-border text-coral focus:ring-coral"
              />
              <span className="text-[11px] text-space-subtext">--until</span>
              <input
                type="date"
                value={flags.untilDate}
                onChange={(e) => setFlags({ ...flags, untilDate: e.target.value })}
                disabled={!flags.hasDate}
                className="bg-space-card text-space-text border border-space-border rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
              />
            </div>
          </div>

          {/* Generated Command Box */}
          <div className="bg-space-darkest p-4 rounded-lg border border-coral font-mono text-xs flex items-center justify-between">
            <code className="text-coral font-bold select-all overflow-x-auto mr-4">
              {generateCommand()}
            </code>
            <button
              onClick={() => copyToClipboard(generateCommand(), 'gen-cmd')}
              className="coral-button px-4 py-2 text-xs flex items-center space-x-1.5 whitespace-nowrap"
            >
              {copiedId === 'gen-cmd' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'gen-cmd' ? 'Copied!' : 'Copy Command'}</span>
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

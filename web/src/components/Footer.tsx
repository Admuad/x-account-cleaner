'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Terminal, Heart, Github, Puzzle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-space-border bg-space-darkest py-10 mt-auto text-xs text-space-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-coral flex items-center justify-center text-white font-black text-xs">
              𝕏
            </div>
            <div>
              <span className="font-bold text-space-text">VanishX</span>
              <span className="mx-2">•</span>
              <span>Client-Side Autonomous 𝕏 Cleaner</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-space-muted">
            <Link href="/" className="hover:text-coral transition-colors">Overview</Link>
            <Link href="/app" className="hover:text-coral transition-colors">Web App</Link>
            <Link href="/extension" className="hover:text-coral transition-colors">Extension Hub</Link>
            <Link href="/cli" className="hover:text-coral transition-colors">Terminal CLI</Link>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/Admuad/x-account-cleaner"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 text-[11px] text-space-muted hover:text-space-text transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
            <span className="flex items-center space-x-1 text-[11px] text-brand-emerald">
              <Shield className="w-3.5 h-3.5" />
              <span>Zero Cloud Logs</span>
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-space-border/50 text-center text-[11px] text-space-muted/70 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} VanishX Labs. Open-source under MIT License.</p>
          <p>Operates strictly via local browser session & automation protocols.</p>
        </div>
      </div>
    </footer>
  );
};

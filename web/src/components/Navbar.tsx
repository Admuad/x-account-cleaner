'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Shield, Cpu, Terminal, Puzzle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Overview', href: '/' },
    { name: 'Web App', href: '/app' },
    { name: 'Extension Hub', href: '/extension' },
    { name: 'Terminal CLI', href: '/cli' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-space-black/90 backdrop-blur-md border-b border-space-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center shadow-coral-sm group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-base tracking-tighter">𝕏</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg text-space-text tracking-tight">VanishX</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-card border border-space-border text-coral font-mono font-bold">
              v2.0
            </span>
          </div>
        </Link>

        {/* Navigation Routes */}
        <nav className="hidden md:flex items-center space-x-1 bg-space-card/60 p-1 rounded-lg border border-space-border text-xs font-semibold">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-md transition-all ${
                  isActive
                    ? 'bg-space-border-light text-space-text font-bold shadow-sm'
                    : 'text-space-muted hover:text-space-text hover:bg-space-darkest/40'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Action Button */}
        <div className="flex items-center space-x-3">
          <Link
            href="/extension"
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-space-card border border-space-border text-xs font-semibold text-space-muted hover:text-space-text transition-all"
          >
            <Puzzle className="w-3.5 h-3.5 text-coral" />
            <span>Extension</span>
          </Link>

          <a
            href="https://github.com/Admuad/x-account-cleaner"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub Repository"
            className="p-2 rounded-lg bg-space-card hover:bg-space-card-hover border border-space-border text-space-muted hover:text-space-text transition-all"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>

          <Link
            href="/app"
            className="coral-button px-4 py-2 text-xs flex items-center space-x-1.5"
          >
            <span>Launch App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
};

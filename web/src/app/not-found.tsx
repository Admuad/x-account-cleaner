'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Ghost, Home, Play, Terminal, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-space-black text-space-text flex flex-col selection:bg-coral selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="max-w-md w-full clean-card p-8 border-space-border relative">
          <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-space-darkest border border-coral flex items-center justify-center text-coral">
            <Ghost className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-space-darkest border border-space-border text-xs font-mono font-bold text-coral mb-4">
            <span>ERROR 404 • POST NOT FOUND</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-space-text tracking-tight mb-3">
            Timeline Coordinate Purged
          </h1>

          <p className="text-xs sm:text-sm text-space-muted leading-relaxed mb-8">
            The page or timeline node you are looking for has vanished into thin air or was wiped during an autonomous clean sweep.
          </p>

          <div className="space-y-3">
            <Link
              href="/"
              className="coral-button w-full py-3 text-xs font-bold flex items-center justify-center space-x-2 shadow-coral-sm"
            >
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/app"
                className="py-2.5 rounded-lg bg-space-darkest hover:bg-space-card border border-space-border text-xs font-semibold text-space-text flex items-center justify-center space-x-1.5 transition-all"
              >
                <Play className="w-3.5 h-3.5 text-coral" />
                <span>Web App</span>
              </Link>

              <Link
                href="/cli"
                className="py-2.5 rounded-lg bg-space-darkest hover:bg-space-card border border-space-border text-xs font-semibold text-space-text flex items-center justify-center space-x-1.5 transition-all"
              >
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>CLI Guide</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

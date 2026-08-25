'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Puzzle, Download, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Zap, Globe, Smartphone, Chrome } from 'lucide-react';

export default function ExtensionPage() {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    // 1. Listen for window message from bridge.js
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VANISHX_EXTENSION_READY') {
        setIsInstalled(true);
        setChecking(false);
      }
    };
    window.addEventListener('message', handleMessage);
    // Ping bridge on load
    window.postMessage({ type: 'VANISHX_PING' }, '*');

    // 2. Check if Chrome extension runtime is directly available
    if (typeof window !== 'undefined' && (window as any).chrome?.runtime?.sendMessage) {
      try {
        (window as any).chrome.runtime.sendMessage(
          { type: 'CHECK_EXTENSION_INSTALLED' },
          (response: any) => {
            if (response?.installed) {
              setIsInstalled(true);
            }
            setChecking(false);
          }
        );
      } catch (e) {
        setChecking(false);
      }
    } else {
      setTimeout(() => setChecking(false), 600);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="min-h-screen bg-space-black text-space-text flex flex-col selection:bg-coral selection:text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-space-card border border-space-border text-xs font-semibold text-coral mb-4">
            <Puzzle className="w-3.5 h-3.5" />
            <span>Zero-Server Companion Extension</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-space-text tracking-tight mb-3">
            VanishX Browser Extension
          </h1>
          <p className="text-xs sm:text-sm text-space-muted">
            Execute high-speed deletions directly from your active 𝕏 browser tab. No password or session token uploads required.
          </p>
        </div>

        {/* Live Status Probe Card */}
        <div className="clean-card p-6 border-space-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-space-darkest border border-space-border flex items-center justify-center text-coral">
              <Puzzle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-space-text">Extension Status:</h2>
                {checking ? (
                  <span className="text-xs text-space-muted font-mono">Probing browser...</span>
                ) : isInstalled ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-bold text-brand-emerald">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>INSTALLED & CONNECTED (v2.0)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs font-semibold text-space-muted font-mono">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Not Detected (Load unpacked below)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-space-muted mt-0.5">
                Communicates securely with the Web App dashboard to execute scheduled purges
              </p>
            </div>
          </div>

          {/* Dynamic Action Button: Get Extension (if not detected) OR Open Web Dashboard (if detected) */}
          {isInstalled ? (
            <Link
              href="/app"
              className="coral-button px-5 py-2.5 text-xs font-bold flex items-center space-x-2"
            >
              <span>Open Web Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <a
              href="/vanishx-extension.zip"
              download="vanishx-extension.zip"
              className="coral-button px-5 py-2.5 text-xs font-bold flex items-center space-x-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Get Extension</span>
            </a>
          )}
        </div>

        {/* Installation Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="clean-card p-6 border-space-border flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm font-bold text-space-text mb-3">
                <Chrome className="w-4 h-4 text-coral" />
                <span>Desktop: Chrome, Brave, Edge</span>
              </div>
              <ol className="list-decimal list-inside space-y-2.5 text-xs text-space-muted leading-relaxed mb-4">
                <li>
                  Download the extension zip file using the <strong className="text-coral">Get Extension</strong> button.
                </li>
                <li>
                  Extract the zip file to a folder on your computer.
                </li>
                <li>
                  Open your browser's extensions page (<code className="text-space-text bg-space-darkest px-1 py-0.5 rounded border border-space-border">chrome://extensions</code>).
                </li>
                <li>
                  Enable <strong className="text-space-text">Developer mode</strong> in the top-right corner.
                </li>
                <li>
                  Click <strong className="text-space-text">Load unpacked</strong> and select the extracted folder.
                </li>
              </ol>
            </div>

            <a
              href="/vanishx-extension.zip"
              download="vanishx-extension.zip"
              className="flex items-center justify-center space-x-2 py-2 rounded-md bg-space-darkest hover:bg-space-card border border-space-border text-xs text-space-text font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-coral" />
              <span>Download Desktop Bundle (.zip)</span>
            </a>
          </div>

          <div className="clean-card p-6 border-space-border flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm font-bold text-space-text mb-3">
                <Smartphone className="w-4 h-4 text-coral" />
                <span>Mobile: Kiwi Browser (Android) or Orion (iOS)</span>
              </div>
              <ol className="list-decimal list-inside space-y-2.5 text-xs text-space-muted leading-relaxed mb-4">
                <li>
                  Install <strong className="text-space-text">Kiwi Browser</strong> (Android) or <strong className="text-space-text">Orion</strong> (iOS).
                </li>
                <li>
                  Download the <strong className="text-coral">vanishx-extension.zip</strong> file to your device.
                </li>
                <li>
                  Open <code className="text-space-text bg-space-darkest px-1 py-0.5 rounded border border-space-border">chrome://extensions</code> in Kiwi/Orion.
                </li>
                <li>
                  Enable <strong className="text-space-text">Developer mode</strong> and tap <strong className="text-space-text">+(from .zip/.crx)</strong>.
                </li>
                <li>
                  Open <code className="text-space-text bg-space-darkest px-1 py-0.5 rounded border border-space-border">x.com</code> and return to the Web Dashboard!
                </li>
              </ol>
            </div>

            <a
              href="/vanishx-extension.zip"
              download="vanishx-extension.zip"
              className="flex items-center justify-center space-x-2 py-2 rounded-md bg-space-darkest hover:bg-space-card border border-space-border text-xs text-space-text font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-coral" />
              <span>Download Mobile Package (.zip)</span>
            </a>
          </div>
        </div>

        {/* Security Architecture */}
        <div className="clean-card p-6 border-space-border">
          <div className="flex items-center space-x-2 text-sm font-bold text-space-text mb-2">
            <ShieldCheck className="w-4 h-4 text-brand-emerald" />
            <span>Zero-Trust Privacy Architecture</span>
          </div>
          <p className="text-xs text-space-muted leading-relaxed mb-4">
            The VanishX extension uses your browser's existing cookies without reading or saving them to external databases. All GraphQL mutations and DOM actions are triggered in your client tab, avoiding rate-limiting IP bans or cloud security alerts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="bg-space-darkest p-3 rounded-lg border border-space-border">
              <span className="text-brand-emerald font-bold">✔ Client-Side DOM</span>
              <p className="text-[11px] text-space-muted font-sans mt-1">Runs in your browser tab</p>
            </div>
            <div className="bg-space-darkest p-3 rounded-lg border border-space-border">
              <span className="text-brand-emerald font-bold">✔ No Server Logging</span>
              <p className="text-[11px] text-space-muted font-sans mt-1">0 telemetry stored on cloud</p>
            </div>
            <div className="bg-space-darkest p-3 rounded-lg border border-space-border">
              <span className="text-brand-emerald font-bold">✔ Header Verification</span>
              <p className="text-[11px] text-space-muted font-sans mt-1">Ground truth counter checks</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

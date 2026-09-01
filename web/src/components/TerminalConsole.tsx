'use client';

import React, { useRef, useEffect } from 'react';
import { Terminal, Play, Pause, Square, Activity, Download, CheckCircle, Shield, Zap } from 'lucide-react';
import { TelemetryState, PurgeConfig } from '@/types';
import { Sliders } from 'lucide-react';

interface TerminalConsoleProps {
  telemetry: TelemetryState;
  config: PurgeConfig;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onAbort: () => void;
  onExportReport: () => void;
  onEditModules?: () => void;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  telemetry,
  config,
  onStart,
  onPause,
  onResume,
  onAbort,
  onExportReport,
  onEditModules,
}) => {
  const terminalViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalViewportRef.current) {
      terminalViewportRef.current.scrollTop = terminalViewportRef.current.scrollHeight;
    }
  }, [telemetry.logs]);

  const progressPercent = telemetry.totalTargeted > 0
    ? Math.min(100, Math.round((telemetry.totalPurged / telemetry.totalTargeted) * 100))
    : 0;

  const activeModulesList = [];
  if (config.modules.following) activeModulesList.push('👋 Unfollow Bots & Non-Mutuals');
  if (config.modules.followers) activeModulesList.push('🚫 Remove Followers');
  if (config.modules.posts) activeModulesList.push('🗑️ Delete Posts');
  if (config.modules.replies) activeModulesList.push('💬 Delete Replies');
  if (config.modules.reposts) activeModulesList.push('🔄 Undo Reposts');

  return (
    <div id="telemetry" className="clean-card p-6 border-space-border space-y-4">
      {/* Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-space-darkest border border-space-border flex items-center justify-center text-coral">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-space-text">Live Telemetry & Execution Stream</h2>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                  telemetry.status === 'running'
                    ? 'bg-coral-900/60 text-coral border border-coral animate-pulse'
                    : telemetry.status === 'completed'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : telemetry.status === 'paused'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-space-darkest text-space-muted border border-space-border'
                }`}
              >
                {telemetry.status}
              </span>
            </div>
            <p className="text-xs text-space-muted">
              Real-time audit log with velocity pacing and zero-state confirmation sweeps
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {telemetry.status === 'idle' || telemetry.status === 'completed' || telemetry.status === 'aborted' ? (
            <>
              {onEditModules && (
                <button
                  type="button"
                  onClick={onEditModules}
                  className="px-3.5 py-2 rounded-md bg-space-card hover:bg-space-card-hover border border-space-border text-space-subtext hover:text-space-text text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-coral" />
                  <span>Edit Targets</span>
                </button>
              )}
              <button
                onClick={onStart}
                disabled={activeModulesList.length === 0}
                className="coral-button px-5 py-2 text-xs flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Execute Clean Sweep</span>
              </button>
            </>
          ) : telemetry.status === 'running' ? (
            <>
              <button
                onClick={onPause}
                className="px-4 py-2 rounded-lg bg-space-card hover:bg-space-card-hover border border-space-border text-amber-400 text-xs font-semibold flex items-center space-x-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
              <button
                onClick={onAbort}
                className="px-4 py-2 rounded-lg bg-space-card hover:bg-space-card-hover border border-crimson/50 text-crimson text-xs font-semibold flex items-center space-x-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Abort</span>
              </button>
            </>
          ) : telemetry.status === 'paused' ? (
            <>
              <button
                onClick={onResume}
                className="coral-button px-4 py-2 text-xs flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Resume</span>
              </button>
              <button
                onClick={onAbort}
                className="px-4 py-2 rounded-lg bg-space-card border border-crimson/50 text-crimson text-xs font-semibold flex items-center space-x-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Abort</span>
              </button>
            </>
          ) : null}

          <button
            onClick={onExportReport}
            className="p-2 rounded-lg bg-space-darkest hover:bg-space-card border border-space-border text-space-muted hover:text-space-text"
            title="Download Audit Log (JSON)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Armed Target Confirmation Bar */}
      <div className="p-2.5 rounded-md bg-space-darkest border border-space-border flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-space-muted font-mono font-semibold">Active Targets:</span>
          {activeModulesList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {activeModulesList.map((mod, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-space-card border border-space-border-light text-space-text text-[11px] font-mono font-medium"
                >
                  {mod}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-crimson font-mono font-semibold">⚠️ None Selected! Click 'Edit Targets' to arm modules.</span>
          )}
        </div>
        {onEditModules && (
          <button
            onClick={onEditModules}
            className="text-[11px] text-coral hover:underline font-mono font-semibold"
          >
            Change Selection →
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mb-4">
        <div className="bg-space-darkest p-2.5 rounded-lg border border-space-border">
          <div className="text-[10px] text-space-muted font-mono uppercase">Purged / Target</div>
          <div className="text-sm font-bold text-space-text font-mono">
            {telemetry.totalPurged} / {telemetry.totalTargeted}
          </div>
        </div>

        <div className="bg-space-darkest p-2.5 rounded-lg border border-space-border">
          <div className="text-[10px] text-space-muted font-mono uppercase">Velocity</div>
          <div className="text-sm font-bold text-coral font-mono flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5" />
            <span>{telemetry.velocity.toFixed(1)}/sec</span>
          </div>
        </div>

        <div className="bg-space-darkest p-2.5 rounded-lg border border-space-border">
          <div className="text-[10px] text-space-muted font-mono uppercase">Posts Deleted</div>
          <div className="text-sm font-bold text-space-text font-mono">
            {telemetry.postsDeleted}
          </div>
        </div>

        <div className="bg-space-darkest p-2.5 rounded-lg border border-space-border">
          <div className="text-[10px] text-space-muted font-mono uppercase">Replies Wiped</div>
          <div className="text-sm font-bold text-space-text font-mono">
            {telemetry.repliesDeleted}
          </div>
        </div>

        <div className="bg-space-darkest p-2.5 rounded-lg border border-space-border">
          <div className="text-[10px] text-space-muted font-mono uppercase">Unfollowed</div>
          <div className="text-sm font-bold text-space-text font-mono">
            {telemetry.followingRemoved}
          </div>
        </div>

        <div className="bg-space-darkest p-2.5 rounded-lg border border-space-border">
          <div className="text-[10px] text-space-muted font-mono uppercase">Whitelist Immune</div>
          <div className="text-sm font-bold text-brand-emerald font-mono">
            {telemetry.whitelistSkipped}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-mono mb-1">
          <span className="text-space-muted">Execution Progress</span>
          <span className="text-coral font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full bg-space-darkest h-2 rounded-full overflow-hidden border border-space-border">
          <div
            className="h-full bg-gradient-to-r from-coral to-amber-400 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={terminalViewportRef}
        className="bg-space-darkest rounded-lg border border-space-border p-3 font-mono text-xs h-64 overflow-y-auto space-y-1.5 shadow-inner-dark"
      >
        {telemetry.logs.length === 0 ? (
          <div className="text-space-muted italic text-center py-20">
            Engine standby. Click "Execute Clean Sweep" to start telemetry stream...
          </div>
        ) : (
          telemetry.logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
              <span className="text-space-muted text-[10px] select-none">[{log.timestamp}]</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded font-bold uppercase select-none ${
                  log.type === 'delete'
                    ? 'bg-coral-950 text-coral border border-coral-800'
                    : log.type === 'unfollow'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : log.type === 'success'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : log.type === 'warn'
                    ? 'bg-yellow-950 text-yellow-400'
                    : 'bg-space-card text-space-subtext'
                }`}
              >
                {log.type}
              </span>
              <span
                className={`text-xs break-all ${
                  log.type === 'delete'
                    ? 'text-space-text'
                    : log.type === 'unfollow'
                    ? 'text-amber-200'
                    : log.type === 'success'
                    ? 'text-emerald-300 font-bold'
                    : log.type === 'warn'
                    ? 'text-yellow-300'
                    : 'text-space-muted'
                }`}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

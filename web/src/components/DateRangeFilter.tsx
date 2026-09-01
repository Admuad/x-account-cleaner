import React, { useEffect } from 'react';
import { Calendar, Clock, Filter, Search, Lock } from 'lucide-react';
import { DateFilterConfig, DatePreset } from '@/types';
import { getPresetDateBoundaries, generateXSearchQuery } from '@/utils/dateHelper';

interface DateRangeFilterProps {
  config: DateFilterConfig;
  onChange: (config: DateFilterConfig) => void;
  userHandle: string;
  disabled?: boolean;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  config,
  onChange,
  userHandle,
  disabled = false,
}) => {
  // Auto-disable if timeline modules are unselected
  useEffect(() => {
    if (disabled && config.enabled) {
      onChange({ ...config, enabled: false });
    }
  }, [disabled, config.enabled, onChange, config]);

  const presets: { id: DatePreset; title: string; subtitle: string }[] = [
    {
      id: 'before_2026',
      title: 'Before Dec 31, 2025',
      subtitle: 'Wipe all historical legacy posts prior to 2026',
    },
    {
      id: 'older_1y',
      title: 'Older than 1 Year',
      subtitle: 'Keep only your active 12-month trailing timeline',
    },
    {
      id: 'older_30d',
      title: 'Keep Last 30 Days Only',
      subtitle: 'Archive or delete all posts older than a month',
    },
    {
      id: 'all',
      title: 'All-Time Clean Slate',
      subtitle: 'Purge everything from account creation to today',
    },
    {
      id: 'custom',
      title: 'Custom Date Window',
      subtitle: 'Specify exact start and end date boundary',
    },
  ];

  const handlePresetSelect = (preset: DatePreset) => {
    if (disabled) return;
    const boundaries = getPresetDateBoundaries(preset);
    onChange({
      ...config,
      preset,
      startDate: boundaries.startDate || config.startDate,
      endDate: boundaries.endDate || config.endDate,
    });
  };

  const searchQuery = generateXSearchQuery(userHandle, config);

  return (
    <div id="date-filter" className={`clean-card p-5 border-space-border transition-opacity ${disabled ? 'opacity-70' : 'opacity-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-space-darkest border border-space-border flex items-center justify-center text-coral">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-space-text flex items-center space-x-2">
              <span>Date-Range Filtering Engine</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${disabled ? 'bg-space-card text-space-muted border border-space-border' : 'coral-badge'}`}>
                {disabled ? 'TIMELINE ONLY' : 'PRECISION JUMP'}
              </span>
            </h2>
            <p className="text-xs text-space-muted">
              Select which timeframe of posts, replies, and reposts to target
            </p>
          </div>
        </div>

        {/* Enable / Disable Toggle */}
        <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={!disabled && config.enabled}
            onChange={(e) => !disabled && onChange({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-space-border-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-coral"></div>
        </label>
      </div>

      {disabled ? (
        <div className="p-3.5 rounded-md bg-space-darkest border border-amber-900/40 flex items-start space-x-2.5 text-xs text-amber-200/90">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-300">Date Window Inactive (Timeline Only)</div>
            <div className="text-[11px] text-space-muted mt-0.5">
              Date filtering applies exclusively to <strong>Posts, Replies & Reposts</strong>. Following and follower lists do not have date timestamps on 𝕏 — configure account criteria using <strong>Step 2 (Bot & Non-Mutuals)</strong>.
            </div>
          </div>
        </div>
      ) : config.enabled ? (
        <div className="space-y-3.5 pt-1">
          {/* Preset Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {presets.map((p) => {
              const isSelected = config.preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className={`p-3 rounded-md text-left transition-colors border ${
                    isSelected
                      ? 'bg-space-card-hover border-coral'
                      : 'bg-space-darkest border-space-border hover:border-space-border-light'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-space-text">
                      {p.title}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-coral"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-space-muted leading-snug">
                    {p.subtitle}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Custom Date Picker (if selected) */}
          {config.preset === 'custom' && (
            <div className="p-3.5 rounded-md bg-space-darkest border border-space-border grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-xs font-semibold text-space-subtext mb-1">
                  Start Date (From)
                </label>
                <input
                  type="date"
                  value={config.startDate || '2020-01-01'}
                  onChange={(e) => onChange({ ...config, startDate: e.target.value })}
                  className="w-full bg-space-card border border-space-border rounded-md px-3 py-2 text-xs text-space-text focus:outline-none focus:border-coral"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-space-subtext mb-1">
                  End Date (Until / Before)
                </label>
                <input
                  type="date"
                  value={config.endDate || '2025-12-31'}
                  onChange={(e) => onChange({ ...config, endDate: e.target.value })}
                  className="w-full bg-space-card border border-space-border rounded-md px-3 py-2 text-xs text-space-text focus:outline-none focus:border-coral"
                />
              </div>
            </div>
          )}

          {/* Generated X Search Operator Preview */}
          <div className="p-2.5 rounded-md bg-space-darkest border border-space-border flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-space-muted font-mono">
              <Search className="w-3.5 h-3.5 text-coral" />
              <span>Query Jump:</span>
              <span className="text-coral font-bold">{searchQuery}</span>
            </div>
            <span className="text-[10px] text-space-muted font-mono hidden sm:inline">
              Fast-forwards timeline immediately
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-md bg-space-darkest/60 border border-dashed border-space-border text-center text-xs text-space-muted">
          Date filtering is disabled. Deletion will operate on the full chronological timeline.
        </div>
      )}
    </div>
  );
};

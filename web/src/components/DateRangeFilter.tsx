'use client';

import React from 'react';
import { Calendar, Clock, Sparkles, Filter, Search } from 'lucide-react';
import { DateFilterConfig, DatePreset } from '@/types';
import { getPresetDateBoundaries, generateXSearchQuery } from '@/utils/dateHelper';

interface DateRangeFilterProps {
  config: DateFilterConfig;
  onChange: (config: DateFilterConfig) => void;
  userHandle: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  config,
  onChange,
  userHandle,
}) => {
  const presets: { id: DatePreset; title: string; subtitle: string; icon: string }[] = [
    {
      id: 'before_2026',
      title: 'Before Dec 31, 2025',
      subtitle: 'Wipe all historical legacy posts prior to 2026',
      icon: '🎯',
    },
    {
      id: 'older_1y',
      title: 'Older than 1 Year',
      subtitle: 'Keep only your active 12-month trailing timeline',
      icon: '⏳',
    },
    {
      id: 'older_30d',
      title: 'Keep Last 30 Days Only',
      subtitle: 'Fresh start: archive/delete all posts older than a month',
      icon: '⚡',
    },
    {
      id: 'all',
      title: 'All-Time Clean Slate',
      subtitle: 'Purge everything from account creation to today',
      icon: '🔥',
    },
    {
      id: 'custom',
      title: 'Custom Date Window',
      subtitle: 'Pick custom start and end date boundary',
      icon: '🗓️',
    },
  ];

  const handlePresetSelect = (preset: DatePreset) => {
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
    <div id="date-filter" className="clean-card p-6 border-space-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-space-darkest border border-space-border flex items-center justify-center text-coral">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-space-text flex items-center space-x-2">
              <span>Date-Range Filtering Engine</span>
              <span className="coral-badge text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                PRECISION JUMP
              </span>
            </h2>
            <p className="text-xs text-space-muted">
              Select which timeframe of posts, replies, and reposts to target
            </p>
          </div>
        </div>

        {/* Enable / Disable Toggle */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-space-border-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-coral"></div>
        </label>
      </div>

      {config.enabled ? (
        <div className="space-y-4 pt-2">
          {/* Preset Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {presets.map((p) => {
              const isSelected = config.preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className={`p-3 rounded-lg text-left transition-all border ${
                    isSelected
                      ? 'bg-space-card-hover border-coral'
                      : 'bg-space-darkest border-space-border hover:border-space-border-light'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-space-text flex items-center space-x-1.5">
                      <span>{p.icon}</span>
                      <span>{p.title}</span>
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-coral"></span>
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
            <div className="p-4 rounded-lg bg-space-darkest border border-space-border grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-semibold text-space-subtext mb-1">
                  Start Date (From)
                </label>
                <input
                  type="date"
                  value={config.startDate || '2020-01-01'}
                  onChange={(e) => onChange({ ...config, startDate: e.target.value })}
                  className="w-full bg-space-card border border-space-border rounded-lg px-3 py-2 text-xs text-space-text focus:outline-none focus:border-coral"
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
                  className="w-full bg-space-card border border-space-border rounded-lg px-3 py-2 text-xs text-space-text focus:outline-none focus:border-coral"
                />
              </div>
            </div>
          )}

          {/* Generated X Search Operator Preview */}
          <div className="p-3 rounded-lg bg-space-darkest border border-space-border flex items-center justify-between text-xs">
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
        <div className="p-4 rounded-lg bg-space-darkest/60 border border-dashed border-space-border text-center text-xs text-space-muted">
          Date filtering is disabled. Deletion will operate on the full chronological timeline.
        </div>
      )}
    </div>
  );
};

'use client';

import React, { useState, useRef } from 'react';
import { ShieldCheck, Plus, Trash2, Download, Upload, Lock, RotateCcw } from 'lucide-react';
import { WhitelistConfig } from '@/types';

interface WhitelistManagerProps {
  whitelist: WhitelistConfig;
  onChange: (whitelist: WhitelistConfig) => void;
  onToast?: (toast: { type: 'success' | 'warning' | 'error' | 'info'; message: string; title?: string }) => void;
}

export const WhitelistManager: React.FC<WhitelistManagerProps> = ({
  whitelist,
  onChange,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'tweets' | 'keywords'>('users');
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const clean = inputValue.trim().replace(/^@/, '');

    if (activeTab === 'users' && !whitelist.users.includes(clean)) {
      onChange({ ...whitelist, users: [...whitelist.users, clean] });
      onToast?.({ type: 'success', message: `Added @${clean} to Whitelist` });
    } else if (activeTab === 'tweets' && !whitelist.tweets.includes(clean)) {
      onChange({ ...whitelist, tweets: [...whitelist.tweets, clean] });
      onToast?.({ type: 'success', message: `Protected tweet ID ${clean}` });
    } else if (activeTab === 'keywords' && !whitelist.keywords.includes(clean)) {
      onChange({ ...whitelist, keywords: [...whitelist.keywords, clean] });
      onToast?.({ type: 'success', message: `Protected keyword "${clean}"` });
    }
    setInputValue('');
  };

  const handleRemoveItem = (type: 'users' | 'tweets' | 'keywords', item: string) => {
    onChange({
      ...whitelist,
      [type]: whitelist[type].filter((i) => i !== item),
    });
    onToast?.({ type: 'info', message: `Removed "${item}" from Whitelist` });
  };

  const handleClearCategory = () => {
    if (confirm(`Clear all whitelisted ${activeTab}?`)) {
      onChange({
        ...whitelist,
        [activeTab]: [],
      });
      onToast?.({ type: 'warning', message: `Cleared all ${activeTab} from Whitelist` });
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(whitelist, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'vanishx-whitelist.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onToast?.({ type: 'success', message: 'Whitelist exported to JSON' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const users = Array.isArray(parsed.users || parsed.usernames) ? (parsed.users || parsed.usernames).map((u: string) => u.replace(/^@/, '')) : whitelist.users;
        const tweets = Array.isArray(parsed.tweets || parsed.tweetIds) ? (parsed.tweets || parsed.tweetIds) : whitelist.tweets;
        const keywords = Array.isArray(parsed.keywords || parsed.keywordsToKeep) ? (parsed.keywords || parsed.keywordsToKeep) : whitelist.keywords;

        onChange({
          users,
          tweets,
          keywords,
        });
        onToast?.({
          type: 'success',
          title: 'Whitelist Imported',
          message: `Loaded ${users.length} users, ${tweets.length} tweets, and ${keywords.length} keywords.`,
        });
      } catch (err) {
        onToast?.({
          type: 'error',
          title: 'Import Failed',
          message: 'Invalid JSON file format. Please upload a valid whitelist.json.',
        });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const currentList = whitelist[activeTab] || [];

  return (
    <div id="whitelist" className="clean-card p-5 border-space-border">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-space-darkest border border-space-border flex items-center justify-center text-brand-emerald">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-space-text flex items-center space-x-2">
              <span>Whitelist Vault & Immune Handles</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20">
                100% IMMUNITY
              </span>
            </h2>
            <p className="text-xs text-space-muted">
              Entities added here will NEVER be deleted, unfollowed, or modified during execution sweeps
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 text-xs">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-md bg-space-darkest hover:bg-space-card border border-space-border text-space-subtext hover:text-space-text flex items-center space-x-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-md bg-space-darkest hover:bg-space-card border border-space-border text-space-subtext hover:text-space-text flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center space-x-1.5 mb-4 border-b border-space-border pb-2 text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'users'
              ? 'bg-space-card text-coral font-bold border border-space-border'
              : 'text-space-muted hover:text-space-text'
          }`}
        >
          Protected Accounts ({whitelist.users.length})
        </button>
        <button
          onClick={() => setActiveTab('tweets')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'tweets'
              ? 'bg-space-card text-coral font-bold border border-space-border'
              : 'text-space-muted hover:text-space-text'
          }`}
        >
          Pinned / Preserved Tweets ({whitelist.tweets.length})
        </button>
        <button
          onClick={() => setActiveTab('keywords')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'keywords'
              ? 'bg-space-card text-coral font-bold border border-space-border'
              : 'text-space-muted hover:text-space-text'
          }`}
        >
          Immune Keywords ({whitelist.keywords.length})
        </button>
      </div>

      {/* Add Item Input Form */}
      <form onSubmit={handleAddItem} className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              activeTab === 'users'
                ? 'Enter @handle to immune (e.g. sama, jack)'
                : activeTab === 'tweets'
                ? 'Enter Tweet ID or URL'
                : 'Enter keyword or hashtag (e.g. #keep, giveaway)'
            }
            className="w-full bg-space-darkest border border-space-border rounded-md px-3 py-2 text-xs text-space-text focus:outline-none focus:border-coral font-mono"
          />
        </div>
        <button
          type="submit"
          className="coral-button px-4 py-2 text-xs flex items-center space-x-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add to Vault</span>
        </button>
      </form>

      {/* Vault List Container */}
      <div className="bg-space-darkest rounded-md border border-space-border p-3 min-h-[140px] max-h-56 overflow-y-auto">
        {currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-space-muted text-xs">
            <Lock className="w-6 h-6 mb-2 opacity-40 text-brand-emerald" />
            <p>No immune {activeTab} defined yet in your vault.</p>
            <p className="text-[11px] text-space-subtext mt-0.5">
              Items added here are permanently protected from any wipe actions.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {currentList.map((item) => (
              <div
                key={item}
                className="flex items-center space-x-2 bg-space-card px-2.5 py-1 rounded-md border border-space-border text-xs font-mono text-space-text group hover:border-coral/50 transition-colors"
              >
                <span className="text-brand-emerald text-[11px]">🛡️</span>
                <span>{activeTab === 'users' ? `@${item}` : item}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(activeTab, item)}
                  className="text-space-muted hover:text-crimson transition-colors ml-1"
                  title="Remove from Whitelist"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      {currentList.length > 0 && (
        <div className="flex items-center justify-between mt-3 text-[11px] text-space-muted">
          <span>{currentList.length} items immune in this category</span>
          <button
            type="button"
            onClick={handleClearCategory}
            className="text-crimson hover:underline flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Category</span>
          </button>
        </div>
      )}
    </div>
  );
};

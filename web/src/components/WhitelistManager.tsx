'use client';

import React, { useState, useRef } from 'react';
import { ShieldCheck, Plus, Trash2, Download, Upload, Lock, RotateCcw } from 'lucide-react';
import { WhitelistConfig } from '@/types';

interface WhitelistManagerProps {
  whitelist: WhitelistConfig;
  onChange: (whitelist: WhitelistConfig) => void;
}

export const WhitelistManager: React.FC<WhitelistManagerProps> = ({
  whitelist,
  onChange,
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
    } else if (activeTab === 'tweets' && !whitelist.tweets.includes(clean)) {
      onChange({ ...whitelist, tweets: [...whitelist.tweets, clean] });
    } else if (activeTab === 'keywords' && !whitelist.keywords.includes(clean)) {
      onChange({ ...whitelist, keywords: [...whitelist.keywords, clean] });
    }
    setInputValue('');
  };

  const handleRemoveItem = (type: 'users' | 'tweets' | 'keywords', item: string) => {
    onChange({
      ...whitelist,
      [type]: whitelist[type].filter((i) => i !== item),
    });
  };

  const handleClearCategory = () => {
    if (confirm(`Clear all ${activeTab}?`)) {
      onChange({
        ...whitelist,
        [activeTab]: [],
      });
    }
  };

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(whitelist, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'whitelist.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
        alert(`Successfully imported whitelist: ${users.length} users, ${tweets.length} tweets, ${keywords.length} keywords.`);
      } catch (err) {
        alert('Invalid JSON file format. Please upload a valid whitelist.json.');
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
              <span>Whitelist & Preservation Vault</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                100% IMMUNE
              </span>
            </h2>
            <p className="text-xs text-space-muted">
              Protected accounts, viral tweet IDs, and preservation keywords are excluded from deletions
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md bg-space-darkest hover:bg-space-card border border-space-border text-xs text-space-text transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-space-muted" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={exportJSON}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md bg-space-darkest hover:bg-space-card border border-space-border text-xs text-space-text transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-coral" />
            <span>Export whitelist.json</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-space-border pb-2 mb-4 text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'users' ? 'bg-space-card text-coral border border-space-border' : 'text-space-muted hover:text-space-text'
            }`}
          >
            Protected Accounts ({whitelist.users.length})
          </button>
          <button
            onClick={() => setActiveTab('tweets')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'tweets' ? 'bg-space-card text-coral border border-space-border' : 'text-space-muted hover:text-space-text'
            }`}
          >
            Protected Tweet IDs ({whitelist.tweets.length})
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'keywords' ? 'bg-space-card text-coral border border-space-border' : 'text-space-muted hover:text-space-text'
            }`}
          >
            Keywords ({whitelist.keywords.length})
          </button>
        </div>

        {currentList.length > 0 && (
          <button
            onClick={handleClearCategory}
            className="text-[11px] text-space-muted hover:text-crimson transition-colors flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Input Field */}
      <form onSubmit={handleAddItem} className="flex items-center space-x-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            activeTab === 'users'
              ? 'Enter username to protect (e.g. elonmusk)'
              : activeTab === 'tweets'
              ? 'Enter tweet ID to protect (e.g. 1759281928391)'
              : 'Enter keyword to protect (e.g. #keep or giveaway)'
          }
          className="flex-1 bg-space-darkest border border-space-border rounded-md px-3 py-2 text-xs text-space-text focus:outline-none focus:border-coral"
        />
        <button
          type="submit"
          className="coral-button px-4 py-2 text-xs flex items-center space-x-1.5 font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Items List */}
      <div className="flex flex-wrap gap-2 min-h-12 bg-space-darkest p-3 rounded-md border border-space-border">
        {currentList.length === 0 ? (
          <span className="text-xs text-space-muted italic my-auto">
            No items in this category yet. Add items above or import a whitelist.json file.
          </span>
        ) : (
          currentList.map((item) => (
            <span
              key={item}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-space-card border border-space-border text-xs text-space-text font-mono"
            >
              <Lock className="w-3 h-3 text-brand-emerald" />
              <span>{activeTab === 'users' ? `@${item}` : item}</span>
              <button
                onClick={() => handleRemoveItem(activeTab, item)}
                className="text-space-muted hover:text-coral transition-colors ml-1"
                title="Remove item"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
};

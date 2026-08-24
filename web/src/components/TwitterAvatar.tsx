'use client';

import React, { useState, useEffect } from 'react';

interface TwitterAvatarProps {
  handle: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// In-memory cache to prevent redundant network fetches
const memoryAvatarCache = new Map<string, string | null>();

export const TwitterAvatar: React.FC<TwitterAvatarProps> = ({
  handle,
  size = 'md',
  className = '',
}) => {
  const cleanHandle = handle.replace(/^@/, '').trim().toLowerCase();
  const [src, setSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!cleanHandle) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // 1. Check in-memory cache
    if (memoryAvatarCache.has(cleanHandle)) {
      const cached = memoryAvatarCache.get(cleanHandle);
      if (cached) {
        setSrc(cached);
        setHasError(false);
      } else {
        setHasError(true);
      }
      setIsLoading(false);
      return;
    }

    // 2. Check sessionStorage
    try {
      const sessionCached = sessionStorage.getItem(`avatar_${cleanHandle}`);
      if (sessionCached) {
        memoryAvatarCache.set(cleanHandle, sessionCached);
        setSrc(sessionCached);
        setHasError(false);
        setIsLoading(false);
        return;
      }
    } catch (e) {}

    // 3. Debounced load with unavatar
    const unavatarUrl = `https://unavatar.io/twitter/${cleanHandle}?fallback=false`;
    const img = new Image();
    img.src = unavatarUrl;

    img.onload = () => {
      memoryAvatarCache.set(cleanHandle, unavatarUrl);
      try {
        sessionStorage.setItem(`avatar_${cleanHandle}`, unavatarUrl);
      } catch (e) {}
      setSrc(unavatarUrl);
      setHasError(false);
      setIsLoading(false);
    };

    img.onerror = () => {
      memoryAvatarCache.set(cleanHandle, null);
      setHasError(true);
      setIsLoading(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [cleanHandle]);

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg font-bold',
  };

  const initial = cleanHandle ? cleanHandle[0].toUpperCase() : '𝕏';

  if (hasError || !src) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-space-card border border-space-border flex items-center justify-center font-bold text-coral select-none ${className}`}
      >
        <span>{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`@${cleanHandle}`}
      className={`${sizeClasses[size]} rounded-full object-cover border border-space-border ${className} ${
        isLoading ? 'opacity-50 blur-[1px]' : 'opacity-100'
      } transition-opacity duration-200`}
    />
  );
};

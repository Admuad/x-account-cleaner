'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[100] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    error: <XCircle className="w-4 h-4 text-crimson shrink-0" />,
    info: <Info className="w-4 h-4 text-coral shrink-0" />,
  };

  const borderStyles = {
    success: 'border-emerald-800/80 bg-space-darkest/95 shadow-emerald-950/40',
    warning: 'border-amber-800/80 bg-space-darkest/95 shadow-amber-950/40',
    error: 'border-crimson/80 bg-space-darkest/95 shadow-coral-950/40',
    info: 'border-coral/60 bg-space-darkest/95 shadow-coral-950/30',
  };

  return (
    <div
      className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
        borderStyles[toast.type]
      }`}
    >
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 text-xs">
        {toast.title && <div className="font-bold text-space-text mb-0.5">{toast.title}</div>}
        <div className="text-space-subtext leading-relaxed">{toast.message}</div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-space-muted hover:text-space-text p-0.5 rounded transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

'use client';

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
  }>;
}

// Simple close icon SVG
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Simple download icon SVG
const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);

      // Show prompt after a short delay if not dismissed before
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[InstallPrompt] App installed');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('[InstallPrompt] User accepted install');
        setIsInstalled(true);
      } else {
        console.log('[InstallPrompt] User dismissed install');
      }

      setShowPrompt(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.error('[InstallPrompt] Error during install:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't clear deferredPrompt in case user wants to install later
  };

  // Don't show if already installed or prompt not available
  if (isInstalled || !deferredPrompt || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0">
                <DownloadIcon />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                홈 화면에 추가
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
              aria-label="Close"
            >
              <div className="w-5 h-5">
                <CloseIcon />
              </div>
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            AI Inbox를 홈 화면에 추가하여 더 빠르게 접근하세요.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              추가
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              나중에
            </button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            iOS: 공유 → 홈 화면에 추가 | Android: 설치
          </p>
        </div>
      </div>
    </div>
  );
}

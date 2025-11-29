'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isStandaloneMode,
  getNetworkStatus,
  onNetworkStatusChange,
  getStorageEstimate,
} from './index';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export interface UsePWAResult {
  isInstalled: boolean;
  isOnline: boolean;
  canInstall: boolean;
  storageUsage: number;
  storageQuota: number;
  installApp: () => Promise<boolean>;
}

/**
 * React hook for PWA features
 */
export function usePWA(): UsePWAResult {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [canInstall, setCanInstall] = useState(false);
  const [storageUsage, setStorageUsage] = useState(0);
  const [storageQuota, setStorageQuota] = useState(0);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if running as standalone PWA
    setIsInstalled(isStandaloneMode());

    // Get initial network status
    setIsOnline(getNetworkStatus() === 'online');

    // Listen for network status changes
    const unsubscribe = onNetworkStatusChange((status) => {
      setIsOnline(status === 'online');
    });

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Get storage estimate
    getStorageEstimate().then(({ usage, quota }) => {
      setStorageUsage(usage);
      setStorageQuota(quota);
    });

    return () => {
      unsubscribe();
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setCanInstall(false);

      if (outcome === 'accepted') {
        setIsInstalled(true);
        return true;
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
    }

    return false;
  }, [deferredPrompt]);

  return {
    isInstalled,
    isOnline,
    canInstall,
    storageUsage,
    storageQuota,
    installApp,
  };
}

/**
 * Hook for desktop-specific features when running as PWA
 */
export function useDesktopFeatures() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [hasWindowControlsOverlay, setHasWindowControlsOverlay] =
    useState(false);

  useEffect(() => {
    setIsDesktop(isStandaloneMode());

    // Check for window controls overlay support
    if (typeof navigator !== 'undefined') {
      setHasWindowControlsOverlay(
        'windowControlsOverlay' in navigator
      );
    }
  }, []);

  return {
    isDesktop,
    hasWindowControlsOverlay,
  };
}


import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect platform
    const isAndroidDevice = /Android/.test(navigator.userAgent);
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsAndroid(isAndroidDevice);
    setIsIOS(isIOSDevice);

    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true ||
                       localStorage.getItem('pwa-installed') === 'true';
    
    const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed');
    const hasBeenAccepted = localStorage.getItem('pwa-install-accepted');

    if (!isInstalled && !hasBeenDismissed && !hasBeenAccepted) {
      if (isAndroidDevice) {
        // Listen for custom PWA installable event
        const handlePWAInstallable = () => {
          setShowBanner(true);
        };
        
        window.addEventListener('pwa-installable', handlePWAInstallable);
        
        // Listen for beforeinstallprompt event
        const handleInstallPrompt = (e: Event) => {
          e.preventDefault();
          setInstallPrompt(e as BeforeInstallPromptEvent);
          setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handleInstallPrompt);
        
        // Show banner after delay if no prompt event
        const fallbackTimer = setTimeout(() => {
          if (!installPrompt) {
            setShowBanner(true);
          }
        }, 8000);
        
        return () => {
          window.removeEventListener('pwa-installable', handlePWAInstallable);
          window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
          clearTimeout(fallbackTimer);
        };
      } else if (isIOSDevice) {
        // Show iOS instructions after a delay
        setTimeout(() => setShowBanner(true), 6000);
      }
    }
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setShowBanner(false);
          localStorage.setItem('pwa-install-accepted', 'true');
        } else {
          localStorage.setItem('pwa-install-dismissed', 'true');
        }
        
        setInstallPrompt(null);
      } catch (error) {
        console.error('[PWA] Install failed:', error);
      }
    } else if ((window as any).promptPWAInstall) {
      // Use global function if available
      const success = await (window as any).promptPWAInstall();
      if (success) {
        setShowBanner(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom">
      <div className="max-w-md mx-auto bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 shadow-2xl text-white animate-slide-up border border-emerald-400/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Install easyMO</h3>
              <p className="text-xs text-emerald-100">
                {isAndroid ? 'Add to home screen for quick access' : 'Quick access from your home screen'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="text-xs text-emerald-100 mb-3 space-y-1">
            <div>1. Tap <span className="font-mono bg-white/20 px-1 rounded">⎙</span> in Safari</div>
            <div>2. Select "Add to Home Screen"</div>
            <div>3. Tap "Add" to install easyMO</div>
          </div>
        ) : isAndroid ? (
          <>
            {installPrompt ? (
              <button
                onClick={handleInstall}
                className="w-full bg-white/20 hover:bg-white/30 rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-colors font-semibold text-sm"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            ) : (
              <div className="text-xs text-emerald-100 space-y-1">
                <div>1. Tap the menu (⋮) in your browser</div>
                <div>2. Select "Add to Home screen" or "Install app"</div>
                <div>3. Tap "Add" or "Install"</div>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full bg-white/20 hover:bg-white/30 rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-colors font-semibold text-sm"
          >
            <Download className="w-4 h-4" />
            Install App
          </button>
        )}
      </div>
    </div>
  );
};

export default PWAInstallBanner;

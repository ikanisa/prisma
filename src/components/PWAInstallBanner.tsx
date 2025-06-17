
import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed');

    if (!isInstalled && !hasBeenDismissed) {
      if (isIOSDevice) {
        // Show iOS instructions after a delay
        setTimeout(() => setShowBanner(true), 3000);
      } else {
        // Listen for beforeinstallprompt event
        const handleInstallPrompt = (e: Event) => {
          e.preventDefault();
          setInstallPrompt(e as BeforeInstallPromptEvent);
          setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handleInstallPrompt);
        
        return () => {
          window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
        };
      }
    }
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowBanner(false);
        localStorage.setItem('pwa-install-accepted', 'true');
      }
      
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom">
      <div className="max-w-md mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 shadow-2xl text-white animate-slide-up">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Install easyMO</h3>
              <p className="text-xs text-blue-100">Quick access from your home screen</p>
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
          <div className="text-xs text-blue-100 mb-3">
            Tap <span className="font-mono bg-white/20 px-1 rounded">⎙</span> in Safari, then "Add to Home Screen"
          </div>
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

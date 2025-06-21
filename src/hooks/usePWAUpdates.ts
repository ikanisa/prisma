
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface PWAUpdateState {
  hasUpdate: boolean;
  isUpdating: boolean;
  updateAvailable: boolean;
  showUpdateBanner: boolean;
}

export const usePWAUpdates = () => {
  const [updateState, setUpdateState] = useState<PWAUpdateState>({
    hasUpdate: false,
    isUpdating: false,
    updateAvailable: false,
    showUpdateBanner: false
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
      return;
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });
        
        setRegistration(reg);
        console.log('[PWA] Service worker registered:', reg);

        // Check for updates immediately
        reg.update();

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            setWaitingWorker(newWorker);
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available');
                setUpdateState(prev => ({
                  ...prev,
                  hasUpdate: true,
                  updateAvailable: true,
                  showUpdateBanner: true
                }));
                
                // Show immediate notification
                showUpdateNotification();
              }
            });
          }
        });

        // Check for waiting worker (already installed update)
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setUpdateState(prev => ({
            ...prev,
            hasUpdate: true,
            updateAvailable: true,
            showUpdateBanner: true
          }));
          showUpdateNotification();
        }

        // Listen for controlling worker changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] Controller changed - reloading');
          window.location.reload();
        });

        // Periodic update checks (every 30 minutes)
        setInterval(() => {
          if (document.visibilityState === 'visible') {
            reg.update();
          }
        }, 30 * 60 * 1000);

        // Check for updates when app becomes visible
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update();
          }
        });

      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    registerSW();
  }, []);

  const showUpdateNotification = () => {
    // Browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('App Update Available', {
        body: 'A new version of easyMO is ready. Tap to update.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'app-update',
        requireInteraction: true
      });

      // Handle notification click
      notification.onclick = () => {
        applyUpdate();
        notification.close();
      };
    }

    // Toast notification as fallback
    toast({
      title: "🚀 Update Available",
      description: "A new version of easyMO is ready with improvements and bug fixes. Click to update now.",
      duration: 10000
    });
  };

  const applyUpdate = () => {
    if (waitingWorker) {
      setUpdateState(prev => ({ ...prev, isUpdating: true }));
      
      // Tell the waiting worker to skip waiting and become active
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      
      toast({
        title: "Updating...",
        description: "Please wait while we apply the update.",
        duration: 3000
      });
    }
  };

  const dismissUpdate = () => {
    setUpdateState(prev => ({
      ...prev,
      showUpdateBanner: false
    }));
    
    // Store dismissal with timestamp
    localStorage.setItem('pwa-update-dismissed', Date.now().toString());
  };

  const checkForUpdates = async () => {
    if (registration) {
      try {
        await registration.update();
        console.log('[PWA] Manual update check completed');
      } catch (error) {
        console.error('[PWA] Manual update check failed:', error);
      }
    }
  };

  return {
    ...updateState,
    applyUpdate,
    dismissUpdate,
    checkForUpdates
  };
};

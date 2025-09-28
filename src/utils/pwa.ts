// PWA utilities for Aurora Advisors

import { registerSW } from 'virtual:pwa-register';

let updateSw: ReturnType<typeof registerSW> | undefined;

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    updateSw = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (confirm('New version available! Refresh to update?')) {
          window.location.reload();
        }
      },
      onOfflineReady() {
        console.log('App ready to work offline');
      },
    });
  }
}

export function showInstallPrompt() {
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    console.log('PWA install prompt available');
  });

  return {
    showPrompt: () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
          } else {
            console.log('User dismissed the A2HS prompt');
          }
          deferredPrompt = null;
        });
      }
    }
  };
}

// Enhanced background sync for offline actions
export function queueAction(action: string, data: any) {
  if ('serviceWorker' in navigator) {
    // Store action in indexedDB or localStorage
    const queuedActions = JSON.parse(localStorage.getItem('queuedActions') || '[]');
    queuedActions.push({ 
      id: crypto.randomUUID(),
      action, 
      data, 
      timestamp: Date.now(),
      retries: 0 
    });
    localStorage.setItem('queuedActions', JSON.stringify(queuedActions));
    
    // Register for background sync (if supported)
    navigator.serviceWorker.ready.then((registration) => {
      if ('sync' in registration) {
        return (registration as any).sync.register('background-sync');
      }
    }).catch(err => console.log('Background sync not supported', err));
  }
}

export function processQueuedActions() {
  const queuedActions = JSON.parse(localStorage.getItem('queuedActions') || '[]');
  const processed: string[] = [];
  
  // Process each queued action
  queuedActions.forEach((item: any) => {
    try {
      console.log(`Processing queued action: ${item.action}`, item.data);
      
      // TODO: Implement actual processing logic here
      // This would integrate with your API calls when Supabase is connected
      
      // For now, just simulate success
      processed.push(item.id);
    } catch (error) {
      console.error('Failed to process queued action:', error);
      
      // Retry logic
      if (item.retries < 3) {
        item.retries++;
      } else {
        processed.push(item.id); // Give up after 3 retries
      }
    }
  });
  
  // Remove processed actions
  const remaining = queuedActions.filter((item: any) => !processed.includes(item.id));
  localStorage.setItem('queuedActions', JSON.stringify(remaining));
  
  return processed.length;
}

// Network status monitoring
export function setupNetworkMonitoring() {
  const updateOnlineStatus = () => {
    const status = navigator.onLine ? 'online' : 'offline';
    document.body.setAttribute('data-network-status', status);
    
    if (status === 'online') {
      // Process queued actions when back online
      processQueuedActions();
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial status
  updateOnlineStatus();
}

// Cache management
export function clearAppCache() {
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
}

export function getCacheSize() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    return navigator.storage.estimate();
  }
  return Promise.resolve({ usage: 0, quota: 0 });
}

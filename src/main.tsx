
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Enhanced service worker registration with scanner optimizations
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service worker registered with scanner optimizations:', registration);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content available, reload to update');
              // Show update notification for scanner improvements
              if (window.location.pathname === '/pay') {
                console.log('[PWA] Scanner page update available');
              }
            }
          });
        }
      });

      // Register background sync for offline scanner data with proper type checking
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          // Use type assertion for sync registration since TypeScript doesn't include it by default
          (registration as any).sync?.register('qr-scan-sync').catch(console.error);
        } catch (error) {
          console.log('[PWA] Background sync not supported:', error);
        }
      }
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  });
}

// DEV: Simulate offline mode toggle
if (typeof window !== 'undefined') {
  (window as any).simulateOffline = (enable: boolean) => {
    localStorage.setItem("mmpwa_simulateOffline", !!enable ? "true" : "false");
    window.location.reload();
  }
}


import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Enhanced service worker registration for production deployment
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('[PWA] Service worker registered successfully:', registration);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content available, reload to update');
              // Show update notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('App Updated', {
                  body: 'A new version is available. Refresh to update.',
                  icon: '/icons/icon-192.png'
                });
              }
            }
          });
        }
      });

      // Register background sync for offline functionality
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          await (registration as any).sync?.register('qr-scan-sync');
          console.log('[PWA] Background sync registered');
        } catch (error) {
          console.log('[PWA] Background sync not supported:', error);
        }
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_OFFLINE_DATA') {
          // Trigger offline data sync in your app
          console.log('[PWA] Received sync request from service worker');
        }
      });

    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  });
}

// Request notification permission for update notifications
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

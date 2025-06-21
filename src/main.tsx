
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Request notification permission for update notifications
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().then(permission => {
    console.log('[PWA] Notification permission:', permission);
  });
}

// Handle notification actions (for update notifications)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
      if (event.data.action === 'update') {
        // Trigger update through the custom event
        window.dispatchEvent(new CustomEvent('pwa-update-requested'));
      }
    }
  });
}

// Enhanced service worker registration is now handled by usePWAUpdates hook
console.log('[PWA] PWA update management initialized');

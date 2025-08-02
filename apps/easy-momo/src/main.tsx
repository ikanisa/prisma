
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add error handling for the main app
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log('[App] Successfully mounted');
} catch (error) {
  console.error('[App] Failed to mount:', error);
  // Show a basic error message if React fails to mount
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; color: white; background: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
        <h1>easyMO</h1>
        <p>Loading...</p>
        <p style="font-size: 12px; opacity: 0.7;">If this persists, please refresh the page</p>
      </div>
    `;
  }
}

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

console.log('[PWA] PWA update management initialized');

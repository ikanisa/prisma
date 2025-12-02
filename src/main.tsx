import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker, setupNetworkMonitoring } from './utils/pwa'
import { initAnalytics } from './lib/analytics'
import { I18nProvider } from './i18n/I18nProvider'
import { isDesktop } from './lib/platform'

// Register service worker for PWA functionality (not in Tauri)
if (!isDesktop()) {
  registerServiceWorker();
  setupNetworkMonitoring();
}

// Initialise analytics (no-op until a provider is wired)
initAnalytics();

// Initialize Tauri features if running in desktop app
if (isDesktop()) {
  // Disable context menu in production
  if (import.meta.env.PROD) {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  // Log desktop app initialization
  console.log('✅ Prisma Glow Desktop App initialized');
}

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <App />
  </I18nProvider>
);

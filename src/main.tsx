import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker, setupNetworkMonitoring } from './utils/pwa'
import { initAnalytics } from './lib/analytics'
import { I18nProvider } from './i18n/I18nProvider'

// Register service worker for PWA functionality
registerServiceWorker();

// Setup network monitoring for offline/online detection
setupNetworkMonitoring();

// Initialise analytics (no-op until a provider is wired)
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <App />
  </I18nProvider>
);

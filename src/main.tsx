import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker, setupNetworkMonitoring } from './utils/pwa'

// Register service worker for PWA functionality
registerServiceWorker();

// Setup network monitoring for offline/online detection
setupNetworkMonitoring();

createRoot(document.getElementById("root")!).render(<App />);

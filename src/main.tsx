import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(console.error);
  });
}

// DEV: Simulate offline mode toggle
window.simulateOffline = (enable) => {
  localStorage.setItem("mmpwa_simulateOffline", !!enable ? "true" : "false");
  window.location.reload();
}

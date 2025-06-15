
/// <reference types="vite/client" />

// Add custom property to Window for the offline simulator
interface Window {
  simulateOffline: (enable: boolean) => void;
}

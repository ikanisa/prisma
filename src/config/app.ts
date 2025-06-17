export const APP_CONFIG = {
  // App metadata
  name: 'easyMO',
  version: '1.0.0',
  description: 'Seamless QR and USSD money transfers. Trusted, fast, and beautifully simple.',
  
  // Payment limits
  payment: {
    minAmount: 100,
    maxAmount: 1000000,
    currency: 'RWF'
  },
  
  // Network settings
  network: {
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  },
  
  // Cache settings
  cache: {
    maxQRCodes: 10,
    maxDuration: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Feature flags
  features: {
    aiScanning: true,
    offlineMode: true,
    analytics: true,
    shareLinks: true
  },
  
  // API endpoints
  api: {
    functions: import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL || 'https://us-central1-ikanisa-ac07c.cloudfunctions.net',
    storage: 'https://storage.googleapis.com/ikanisa-ac07c.appspot.com'
  }
};

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

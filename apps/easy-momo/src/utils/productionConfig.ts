
export const productionConfig = {
  // Feature flags
  features: {
    analytics: true,
    errorMonitoring: true,
    rateLimit: true,
    performanceTracking: true,
    debugMode: import.meta.env.DEV || false
  },

  // Performance thresholds
  performance: {
    maxComponentLoadTime: 3000, // 3 seconds
    maxAPIResponseTime: 10000, // 10 seconds
    maxQRGenerationTime: 15000 // 15 seconds
  },

  // Rate limiting configuration
  rateLimits: {
    qrGeneration: { requests: 10, windowMs: 60000 },
    paymentCreation: { requests: 5, windowMs: 60000 },
    shareActions: { requests: 20, windowMs: 60000 }
  },

  // Error reporting
  errorReporting: {
    maxErrorsPerSession: 50,
    includeUserAgent: true,
    includeUrl: true,
    includeTimestamp: true
  },

  // App metadata
  app: {
    version: '1.0.0',
    name: 'Easy MOMO',
    description: 'Mobile Money Payment Platform',
    author: 'Easy MOMO Team'
  }
};

export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;

// Environment-specific configurations
export const getConfig = () => {
  if (isProduction) {
    return {
      ...productionConfig,
      features: {
        ...productionConfig.features,
        debugMode: false
      }
    };
  }
  
  return productionConfig;
};

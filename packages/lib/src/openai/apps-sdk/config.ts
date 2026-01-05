/**
 * OpenAI Apps SDK Configuration
 * 
 * Provides configuration and utilities for OpenAI ChatGPT App Store deployment
 */

export interface OpenAIImageConfig {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface OpenAIMetadataConfig {
  title?: string;
  description?: string;
  image?: OpenAIImageConfig;
  url?: string;
}

export interface OpenAIAppsSDKConfig {
  name: string;
  description: string;
  version: string;
  author: string;
  homepageUrl: string;
  supportUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  iconUrl: string;
  categories: string[];
  tags: string[];
  features: string[];
  capabilities: {
    fileSearch?: boolean;
    webSearch?: boolean;
    functionCalling?: boolean;
    streaming?: boolean;
    realtime?: boolean;
    chatkitWidgets?: boolean;
    multiAgent?: boolean;
  };
  oauth?: {
    clientId: string;
    scopes: string[];
  };
  apiEndpoints: {
    baseUrl: string;
    auth?: string;
    chat?: string;
    stream?: string;
    realtime?: string;
    files?: string;
    knowledge?: string;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  metadata: {
    minApiVersion: string;
    supportedModels: string[];
    requiresAuth: boolean;
    supportsTeamWorkspaces?: boolean;
    supportsWebhooks?: boolean;
  };
}

export const DEFAULT_APPS_SDK_CONFIG: OpenAIAppsSDKConfig = {
  name: 'Prisma Glow',
  description: 'AI-powered audit, tax, and accounting operations platform',
  version: '3.0.0',
  author: 'Prisma Glow',
  homepageUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.pages.dev',
  supportUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.pages.dev'}/support`,
  privacyUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.pages.dev'}/privacy`,
  termsUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.pages.dev'}/terms`,
  iconUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.pages.dev'}/icons/icon-512.png`,
  categories: ['business', 'productivity', 'finance', 'accounting'],
  tags: ['accounting', 'audit', 'tax', 'ai', 'automation', 'compliance'],
  features: [
    'AI-powered audit workflows',
    'Tax calculation and compliance',
    'Knowledge base management',
    'Document processing',
    'Multi-agent orchestration',
  ],
  capabilities: {
    fileSearch: true,
    webSearch: true,
    functionCalling: true,
    streaming: true,
    realtime: true,
    chatkitWidgets: true,
    multiAgent: true,
  },
  apiEndpoints: {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.pages.dev',
    auth: '/auth/openai/callback',
    chat: '/api/agent/chat',
    stream: '/api/agent/stream',
    realtime: '/api/agent/realtime/session',
    files: '/api/files',
    knowledge: '/api/knowledge',
  },
  ui: {
    theme: 'light',
    primaryColor: '#4A90E2',
    backgroundColor: '#ffffff',
    textColor: '#1a1a1a',
  },
  metadata: {
    minApiVersion: '1.0.0',
    supportedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'],
    requiresAuth: true,
    supportsTeamWorkspaces: true,
    supportsWebhooks: true,
  },
};

/**
 * Get OpenAI Apps SDK configuration
 */
export function getAppsSDKConfig(): OpenAIAppsSDKConfig {
  // In production, this could load from environment variables or a config file
  return DEFAULT_APPS_SDK_CONFIG;
}

/**
 * Generate metadata for OpenAI Apps SDK
 */
export function generateAppsSDKMetadata(overrides?: Partial<OpenAIMetadataConfig>): OpenAIMetadataConfig {
  const config = getAppsSDKConfig();
  return {
    title: config.name,
    description: config.description,
    image: {
      url: config.iconUrl,
      width: 512,
      height: 512,
      alt: `${config.name} icon`,
    },
    url: config.homepageUrl,
    ...overrides,
  };
}

/**
 * Validate Apps SDK configuration
 */
export function validateAppsSDKConfig(config: OpenAIAppsSDKConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!config.description || config.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (config.description.length > 200) {
    errors.push('Description must be 200 characters or less');
  }

  if (!config.version || !/^\d+\.\d+\.\d+$/.test(config.version)) {
    errors.push('Version must be in semantic versioning format (e.g., 1.0.0)');
  }

  if (!config.homepageUrl || !config.homepageUrl.startsWith('https://')) {
    errors.push('Homepage URL must be a valid HTTPS URL');
  }

  if (!config.iconUrl || !config.iconUrl.startsWith('https://')) {
    errors.push('Icon URL must be a valid HTTPS URL');
  }

  if (!config.categories || config.categories.length === 0) {
    errors.push('At least one category is required');
  }

  if (!config.apiEndpoints.baseUrl || !config.apiEndpoints.baseUrl.startsWith('https://')) {
    errors.push('API base URL must be a valid HTTPS URL');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

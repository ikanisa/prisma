// Application constants for EasyMO Admin Panel

// API Configuration
export const API_CONFIG = {
  SUPABASE_URL: 'https://ijblirphkrrsnxazohwt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs',
  FUNCTIONS_URL: 'https://ijblirphkrrsnxazohwt.supabase.co/functions/v1',
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  INFINITE_SCROLL_THRESHOLD: 0.8,
} as const

// Quality thresholds
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 80,
  FAIR: 70,
  POOR: 60,
  CRITICAL: 0,
} as const

// Response time thresholds (in milliseconds)
export const RESPONSE_TIME_THRESHOLDS = {
  EXCELLENT: 2000,
  GOOD: 5000,
  FAIR: 10000,
  POOR: 30000,
} as const

// Status types
export const STATUS_TYPES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
} as const

// Agent execution status
export const AGENT_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  MAINTENANCE: 'maintenance',
} as const

// Conversation channels
export const CHANNELS = {
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  WEB: 'web',
  PHONE: 'phone',
} as const

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
} as const

// Business categories
export const BUSINESS_CATEGORIES = {
  RESTAURANT: 'restaurant',
  RETAIL: 'retail',
  PHARMACY: 'pharmacy',
  GROCERY: 'grocery',
  ELECTRONICS: 'electronics',
  FASHION: 'fashion',
  SERVICES: 'services',
  OTHER: 'other',
} as const

// Order status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
} as const

// Delivery modes
export const DELIVERY_MODES = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
  DINE_IN: 'dine_in',
} as const

// Event types for logging
export const EVENT_TYPES = {
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  PAYMENT_PROCESSED: 'payment_processed',
  DELIVERY_ASSIGNED: 'delivery_assigned',
  AGENT_EXECUTED: 'agent_executed',
  ERROR_OCCURRED: 'error_occurred',
} as const

// Alert severity levels
export const ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const

// Campaign types
export const CAMPAIGN_TYPES = {
  MARKETING: 'marketing',
  NOTIFICATION: 'notification',
  REMINDER: 'reminder',
  PROMOTIONAL: 'promotional',
  TRANSACTIONAL: 'transactional',
} as const

// Experiment types
export const EXPERIMENT_TYPES = {
  AB_TEST: 'A/B',
  MULTIVARIATE: 'multivariate',
  FEATURE_FLAG: 'feature_flag',
} as const

// File types and limits
export const FILE_CONFIG = {
  MAX_SIZE_MB: 10,
  ALLOWED_IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  ALLOWED_DOCUMENTS: ['pdf', 'doc', 'docx', 'txt', 'yaml', 'yml', 'json'],
  ALLOWED_VIDEOS: ['mp4', 'mov', 'avi', 'mkv'],
} as const

// Time intervals for auto-refresh
export const REFRESH_INTERVALS = {
  REAL_TIME: 5000,      // 5 seconds
  FREQUENT: 30000,      // 30 seconds
  NORMAL: 60000,        // 1 minute
  SLOW: 300000,         // 5 minutes
} as const

// Chart colors for consistent theming
export const CHART_COLORS = {
  PRIMARY: '#3B82F6',
  SECONDARY: '#10B981',
  WARNING: '#F59E0B',
  DANGER: '#EF4444',
  SUCCESS: '#10B981',
  INFO: '#6366F1',
  MUTED: '#6B7280',
} as const

// WhatsApp message limits
export const WHATSAPP_LIMITS = {
  MESSAGE_LENGTH: 4096,
  MEDIA_SIZE_MB: 16,
  DAILY_MESSAGES: 1000,
  HOURLY_MESSAGES: 250,
} as const

// Rwanda-specific constants
export const RWANDA_CONFIG = {
  COUNTRY_CODE: '+250',
  CURRENCY: 'RWF',
  TIMEZONE: 'Africa/Kigali',
  PHONE_REGEX: /^\+250[0-9]{9}$/,
  DISTRICTS: [
    'Gasabo', 'Kicukiro', 'Nyarugenge', 'Bugesera', 'Gatsibo',
    'Kayonza', 'Kirehe', 'Ngoma', 'Rwamagana', 'Burera',
    'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo', 'Gisagara',
    'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza',
    'Nyaruguru', 'Ruhango', 'Karongi', 'Ngororero', 'Nyabihu',
    'Rubavu', 'Rusizi', 'Rutsiro', 'Nyamasheke', 'Gicumbi'
  ],
} as const

// Date and time formats
export const DATE_FORMATS = {
  SHORT: 'MMM dd',
  LONG: 'MMMM dd, yyyy',
  ISO: 'yyyy-MM-dd',
  DATETIME: 'MMM dd, yyyy HH:mm',
  TIME_ONLY: 'HH:mm',
} as const

// Database table names (for type safety)
export const TABLES = {
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  CONVERSATION_MESSAGES: 'conversation_messages',
  ORDERS: 'orders',
  PRODUCTS: 'products',
  BUSINESSES: 'businesses',
  DELIVERIES: 'deliveries',
  DRIVERS: 'drivers',
  AGENT_LOGS: 'agent_logs',
  AGENT_EXECUTION_LOG: 'agent_execution_log',
  CONVERSATIONS_ANALYTICS: 'conversation_analytics',
  CUSTOMER_SATISFACTION: 'customer_satisfaction',
  CRON_JOBS: 'cron_jobs',
  CAMPAIGN_MESSAGES: 'campaign_messages',
  CONTACTS: 'contacts',
} as const

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const

// Feature flags
export const FEATURE_FLAGS = {
  ADVANCED_ANALYTICS: 'advanced_analytics',
  REAL_TIME_CHAT: 'real_time_chat',
  AI_SUGGESTIONS: 'ai_suggestions',
  BULK_OPERATIONS: 'bulk_operations',
  EXPORT_DATA: 'export_data',
  CUSTOM_REPORTS: 'custom_reports',
} as const

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const

// Local storage keys
export const LOCAL_STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  DASHBOARD_FILTERS: 'dashboard_filters',
  THEME: 'theme',
  SIDEBAR_STATE: 'sidebar_state',
  RECENT_SEARCHES: 'recent_searches',
} as const

// Environment detection
export const ENVIRONMENT = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const
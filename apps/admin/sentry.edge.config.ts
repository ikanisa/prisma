/**
 * Sentry Edge Configuration
 * 
 * P1 FIX: Edge runtime error tracking
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
    enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DEBUG,
});

/**
 * Sentry Configuration for Frontend Apps
 * 
 * P1 FIX: Configure Sentry DSN in all frontend apps
 * 
 * To enable Sentry:
 * 1. Set NEXT_PUBLIC_SENTRY_DSN in environment
 * 2. Set SENTRY_AUTH_TOKEN for source maps
 * 3. Configure SENTRY_PROJECT and SENTRY_ORG
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
    dsn: SENTRY_DSN,

    // Environment and release tracking
    environment: process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',

    // Sample rates
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture unhandled promise rejections
    integrations: [
        Sentry.captureConsoleIntegration({
            levels: ['error'],
        }),
    ],

    // Filter out non-critical errors
    ignoreErrors: [
        // Ignore common network errors
        'Network Error',
        'Failed to fetch',
        'Load failed',
        // Ignore hydration errors (common in Next.js)
        'Hydration failed',
        'Text content does not match',
        // Ignore user cancellations
        'AbortError',
        'The operation was aborted',
    ],

    // Disable in development unless explicitly enabled
    enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DEBUG,

    // Sanitize sensitive data
    beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
            delete event.request.headers['Authorization'];
            delete event.request.headers['Cookie'];
        }

        // Remove sensitive cookies
        if (event.request?.cookies) {
            delete event.request.cookies['supabase-auth-token'];
        }

        return event;
    },
});

/**
 * Sentry Server Configuration
 * 
 * P1 FIX: Server-side error tracking
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',

    // Lower sample rate for server-side
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

    // Disable in development unless explicitly enabled
    enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DEBUG,

    // Sanitize sensitive data before sending
    beforeSend(event) {
        // Remove auth tokens from headers
        if (event.request?.headers) {
            delete event.request.headers['Authorization'];
            delete event.request.headers['Cookie'];
            delete event.request.headers['x-api-key'];
        }
        return event;
    },
});

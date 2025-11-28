// Security Headers Middleware for Next.js Apps
// Location: packages/security/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Content Security Policy Configuration
 * Prevents XSS, injection attacks, and unauthorized resource loading
 */
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // TODO: Remove after moving inline scripts to files
    "'unsafe-eval'", // Required for development, remove in production
    'https://cdn.jsdelivr.net',
    'https://www.googletagmanager.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS
    'https://fonts.googleapis.com',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'data:',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'https://*.supabase.co',
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.openai.com',
    'https://vitals.vercel-insights.com',
  ],
  'frame-src': [
    "'self'",
    'https://*.supabase.co',
  ],
  'frame-ancestors': ["'none'"], // Prevent clickjacking
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'upgrade-insecure-requests': [],
};

/**
 * Build CSP header string from directives
 */
function buildCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Security headers to apply to all responses
 */
const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': buildCSP(),
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Enable XSS filter (legacy browsers)
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', '),
  
  // HTTP Strict Transport Security (HSTS)
  // Force HTTPS for 1 year, including subdomains
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Prevent DNS prefetching
  'X-DNS-Prefetch-Control': 'off',
  
  // Disable download in iframes
  'X-Download-Options': 'noopen',
  
  // Prevent MIME-based attacks
  'X-Permitted-Cross-Domain-Policies': 'none',
};

/**
 * Security Middleware for Next.js
 * Apply security headers to all responses
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Apply all security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add security event logging (optional)
  if (process.env.NODE_ENV === 'production') {
    // Log security-relevant requests
    const securityEvents = [
      '/api/auth/',
      '/api/admin/',
      '/api/webhook/',
    ];
    
    const isSecurityEvent = securityEvents.some(path => 
      request.nextUrl.pathname.startsWith(path)
    );
    
    if (isSecurityEvent) {
      console.log('[SECURITY]', {
        timestamp: new Date().toISOString(),
        method: request.method,
        path: request.nextUrl.pathname,
        ip: request.ip || request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
      });
    }
  }
  
  return response;
}

/**
 * Configure which routes use the middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

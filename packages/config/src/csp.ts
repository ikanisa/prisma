/**
 * Content Security Policy (CSP) Builder
 * 
 * Provides a centralized, secure CSP directive builder without 'unsafe-inline' by default.
 * Use nonces or hashes for inline scripts/styles to maintain security.
 * 
 * Usage in next.config.ts:
 * ```typescript
 * import { buildCSPHeader } from '@/packages/config/src/csp';
 * 
 * const nextConfig = {
 *   async headers() {
 *     return [
 *       {
 *         source: '/:path*',
 *         headers: [
 *           {
 *             key: 'Content-Security-Policy',
 *             value: buildCSPHeader({
 *               scriptSrc: ["'self'", 'https://cdn.example.com'],
 *               styleSrc: ["'self'", 'https://fonts.googleapis.com'],
 *             }),
 *           },
 *         ],
 *       },
 *     ];
 *   },
 * };
 * ```
 */

export interface CSPDirectives {
  defaultSrc?: string[];
  scriptSrc?: string[];
  scriptSrcElem?: string[];
  scriptSrcAttr?: string[];
  styleSrc?: string[];
  styleSrcElem?: string[];
  styleSrcAttr?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
  connectSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  frameSrc?: string[];
  frameAncestors?: string[];
  formAction?: string[];
  baseUri?: string[];
  manifestSrc?: string[];
  workerSrc?: string[];
  childSrc?: string[];
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
}

/**
 * Default secure CSP directives.
 * Does NOT include 'unsafe-inline' or 'unsafe-eval'.
 */
const DEFAULT_DIRECTIVES: CSPDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: true,
  blockAllMixedContent: true,
};

/**
 * Build a CSP header value from directives.
 * 
 * @param customDirectives - Custom CSP directives to merge with defaults
 * @param options - Configuration options
 * @returns CSP header value string
 */
export function buildCSPHeader(
  customDirectives: CSPDirectives = {},
  options: { reportOnly?: boolean; reportUri?: string } = {}
): string {
  // Merge custom directives with defaults
  const directives: CSPDirectives = {
    ...DEFAULT_DIRECTIVES,
    ...customDirectives,
  };

  // Build directive strings
  const parts: string[] = [];

  // Helper to add directive
  const addDirective = (name: string, values?: string[]) => {
    if (values && values.length > 0) {
      parts.push(`${name} ${values.join(' ')}`);
    }
  };

  addDirective('default-src', directives.defaultSrc);
  addDirective('script-src', directives.scriptSrc);
  addDirective('script-src-elem', directives.scriptSrcElem);
  addDirective('script-src-attr', directives.scriptSrcAttr);
  addDirective('style-src', directives.styleSrc);
  addDirective('style-src-elem', directives.styleSrcElem);
  addDirective('style-src-attr', directives.styleSrcAttr);
  addDirective('img-src', directives.imgSrc);
  addDirective('font-src', directives.fontSrc);
  addDirective('connect-src', directives.connectSrc);
  addDirective('media-src', directives.mediaSrc);
  addDirective('object-src', directives.objectSrc);
  addDirective('frame-src', directives.frameSrc);
  addDirective('frame-ancestors', directives.frameAncestors);
  addDirective('form-action', directives.formAction);
  addDirective('base-uri', directives.baseUri);
  addDirective('manifest-src', directives.manifestSrc);
  addDirective('worker-src', directives.workerSrc);
  addDirective('child-src', directives.childSrc);

  if (directives.upgradeInsecureRequests) {
    parts.push('upgrade-insecure-requests');
  }

  if (directives.blockAllMixedContent) {
    parts.push('block-all-mixed-content');
  }

  if (options.reportUri) {
    parts.push(`report-uri ${options.reportUri}`);
  }

  return parts.join('; ');
}

/**
 * Generate a cryptographic nonce for inline scripts/styles.
 * Use this with Next.js middleware to add nonces to CSP headers dynamically.
 * 
 * @returns Base64-encoded nonce
 */
export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Modern browsers and Node 19+
    return Buffer.from(crypto.randomUUID()).toString('base64');
  }
  // Fallback for older Node versions
  const { randomBytes } = require('crypto');
  return randomBytes(16).toString('base64');
}

/**
 * Build CSP header with nonce support for inline scripts.
 * 
 * @param nonce - Nonce value to include in script-src
 * @param customDirectives - Additional CSP directives
 * @returns CSP header value with nonce
 */
export function buildCSPWithNonce(
  nonce: string,
  customDirectives: CSPDirectives = {}
): string {
  const directives: CSPDirectives = {
    ...customDirectives,
    scriptSrc: [
      ...(customDirectives.scriptSrc || ["'self'"]),
      `'nonce-${nonce}'`,
    ],
    styleSrc: [
      ...(customDirectives.styleSrc || ["'self'"]),
      `'nonce-${nonce}'`,
    ],
  };

  return buildCSPHeader(directives);
}

/**
 * Example CSP configuration for a typical Next.js app with Supabase.
 */
export const EXAMPLE_NEXT_CSP: CSPDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    // Add nonce or hash here: "'nonce-{NONCE}'" or "'sha256-{HASH}'"
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // ⚠️ Remove after adopting nonces/hashes
    'https://fonts.googleapis.com',
  ],
  imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
  fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
  connectSrc: [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.openai.com',
  ],
  frameSrc: ["'self'"],
  frameAncestors: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: true,
  blockAllMixedContent: true,
};

/**
 * Guidance for adopting nonces/hashes:
 * 
 * 1. **Using Nonces (Recommended for Next.js):**
 *    - Generate a unique nonce per request in middleware
 *    - Add nonce to CSP header: script-src 'nonce-{NONCE}'
 *    - Add nonce attribute to inline scripts: <script nonce="{NONCE}">...</script>
 * 
 * 2. **Using Hashes (For static inline scripts):**
 *    - Calculate SHA-256 hash of inline script content
 *    - Add hash to CSP: script-src 'sha256-{BASE64_HASH}'
 *    - Hash must match exact script content including whitespace
 * 
 * 3. **Example Next.js Middleware with Nonce:**
 * ```typescript
 * import { NextResponse } from 'next/server';
 * import { generateNonce, buildCSPWithNonce } from '@/lib/csp';
 * 
 * export function middleware(request: NextRequest) {
 *   const nonce = generateNonce();
 *   const response = NextResponse.next();
 *   
 *   response.headers.set(
 *     'Content-Security-Policy',
 *     buildCSPWithNonce(nonce, EXAMPLE_NEXT_CSP)
 *   );
 *   
 *   // Pass nonce to pages via header or cookie
 *   response.headers.set('x-nonce', nonce);
 *   
 *   return response;
 * }
 * ```
 * 
 * 4. **Remove 'unsafe-inline' progressively:**
 *    - Start by adding nonces to critical inline scripts
 *    - Monitor CSP violation reports
 *    - Remove 'unsafe-inline' once all inline scripts have nonces
 */

export type CspDirectives = Partial<{
  defaultSrc: string[];
  scriptSrc: string[]; // allow nonces/hashes here
  styleSrc: string[];
  imgSrc: string[];
  connectSrc: string[];
  frameSrc: string[];
  fontSrc: string[];
  objectSrc: string[];
  baseUri: string[];
  formAction: string[];
  frameAncestors: string[];
}>;

export function buildCspHeader(directives: CspDirectives) {
  const defaultDirectives: CspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"], // intentionally avoid 'unsafe-inline' by default
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'data:'],
  };

  const merged = { ...defaultDirectives, ...(directives || {}) };

  const parts: string[] = [];

  for (const [k, v] of Object.entries(merged)) {
    if (!v || !Array.isArray(v)) continue;
    parts.push(`${k.replace(/([A-Z])/g, '-$1').toLowerCase()} ${v.join(' ')}`);
  }

  return parts.join('; ');
}

/*
Example usage in Next.js (apps/admin/next.config.ts):

import { buildCspHeader } from '@prisma/config/src/csp';

const csp = buildCspHeader({
  connectSrc: ["'self'", 'https://api.example.com', 'https://*.supabase.co'],
  scriptSrc: ["'self'", "'nonce-<GENERATED_NONCE>'"], // prefer nonces or hashes
});

headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
      ],
    },
  ];
}

Notes:
- Do NOT add 'unsafe-inline' unless you have a migration plan to replace inline scripts with nonce/hash-based approaches.
- To gradually adopt nonces: generate a nonce server-side per response and inject it into script tags and the CSP script-src 'nonce-<value>'.
*/

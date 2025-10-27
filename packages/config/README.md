# @prisma-glow/config

Shared configuration utilities for Prisma Glow, focusing on security and environment management.

## Modules

### `env.ts` - Environment Configuration

Provides utilities to safely manage environment variables and prevent server secrets from leaking into client bundles.

**Key Features:**
- Client/server environment separation
- Server-only key validation
- Runtime browser context checks
- Type-safe environment access

**Example Usage:**

```typescript
import { getClientEnv, getServerEnv, validateEnv } from '@prisma-glow/config/env';

// Bootstrap validation (run at app startup)
validateEnv();

// Get client-safe environment variables (only NEXT_PUBLIC_* / VITE_*)
const clientEnv = getClientEnv();

// Get server environment (throws if called in browser)
const serverEnv = getServerEnv();
```

### `csp.ts` - Content Security Policy Builder

Centralized CSP directive builder without `unsafe-inline` by default. Supports nonces and hashes for inline scripts.

**Key Features:**
- Secure defaults (no unsafe-inline/unsafe-eval)
- Nonce generation and integration
- Type-safe directive building
- Next.js integration examples

**Example Usage:**

```typescript
import { buildCSPHeader, generateNonce, EXAMPLE_NEXT_CSP } from '@prisma-glow/config/csp';

// Basic usage
const csp = buildCSPHeader({
  scriptSrc: ["'self'", 'https://cdn.example.com'],
  styleSrc: ["'self'", 'https://fonts.googleapis.com'],
});

// With nonce (for inline scripts)
const nonce = generateNonce();
const cspWithNonce = buildCSPWithNonce(nonce, {
  connectSrc: ["'self'", 'https://*.supabase.co'],
});
```

**Next.js Integration:**

```typescript
// next.config.ts
import { buildCSPHeader, EXAMPLE_NEXT_CSP } from '@prisma-glow/config/csp';

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: buildCSPHeader(EXAMPLE_NEXT_CSP),
          },
        ],
      },
    ];
  },
};
```

## Security Best Practices

### Server-Only Secrets

**NEVER expose these to client:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `*_SECRET`, `*_PRIVATE_KEY`

### Client-Safe Variables

**OK to expose (must have NEXT_PUBLIC_ or VITE_ prefix):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE`

### Validation Tools

Run the secret scanner to detect violations:

```bash
node tools/scripts/check-client-secrets.mjs
```

## Development

```bash
# Type check
pnpm typecheck

# Use in other packages
# Add to package.json dependencies:
# "@prisma-glow/config": "workspace:*"
```

## Related Documentation

- [Environment Audit](../../docs/env-audit.md) - Complete environment variable inventory
- [Local Hosting Guide](../../docs/local-hosting.md) - Setup instructions with security notes
- [Secret Scanner Tool](../../tools/scripts/check-client-secrets.mjs) - Automated secret detection

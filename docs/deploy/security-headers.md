# Security Headers Configuration

> **Last Updated**: 2025-01-03  
> **Location**: `apps/web/public/_headers`

---

## Overview

Security headers are configured via the `_headers` file in the static output directory. These headers apply to **static files only**. Headers for Pages Functions (API routes, SSR pages) must be set in the function code itself.

---

## Current Headers

### Default Headers (All Routes)

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-XSS-Protection: 1; mode=block
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://*.supabase.co https://*.sentry.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

### Header Explanations

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents page from being embedded in iframes (clickjacking protection) |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing (XSS protection) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information sent to external sites |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables camera, microphone, geolocation (not needed for this app) |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection (modern browsers use CSP) |
| `X-Robots-Tag` | `noindex, nofollow` | Prevents search engine indexing (internal app) |
| `Content-Security-Policy` | (see below) | Restricts resource loading (XSS protection) |

---

## Content Security Policy (CSP)

### Current CSP

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://*.supabase.co https://*.sentry.io;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://api.openai.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

### CSP Directives Explained

| Directive | Current Value | Purpose |
|-----------|---------------|---------|
| `default-src` | `'self'` | Default source for all resource types |
| `script-src` | `'self' 'unsafe-inline' https://*.supabase.co https://*.sentry.io` | Allows scripts from self, inline scripts, Supabase, Sentry |
| `style-src` | `'self' 'unsafe-inline'` | Allows styles from self and inline styles |
| `img-src` | `'self' data: blob: https:` | Allows images from self, data URIs, blobs, any HTTPS |
| `font-src` | `'self' data:` | Allows fonts from self and data URIs |
| `connect-src` | `'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://api.openai.com` | Allows fetch/WebSocket to self, Supabase, Sentry, OpenAI |
| `frame-ancestors` | `'none'` | Prevents embedding in iframes |
| `base-uri` | `'self'` | Restricts `<base>` tag URLs |
| `form-action` | `'self'` | Restricts form submission URLs |

### CSP Security Notes

⚠️ **Current Weaknesses:**
- `'unsafe-inline'` in `script-src` allows inline scripts (XSS risk)
- `'unsafe-inline'` in `style-src` allows inline styles (less risky)

✅ **Strengths:**
- No `'unsafe-eval'` (prevents `eval()` and similar)
- Restricted `connect-src` (limits API calls)
- `frame-ancestors 'none'` (prevents clickjacking)

---

## Tuning CSP Safely

### Step 1: Identify Required Sources

Before tightening CSP, identify what your app needs:

1. **Scripts**: Next.js, Supabase, Sentry
2. **Styles**: Next.js, Tailwind (inline styles)
3. **Images**: Self-hosted, Supabase storage, external (if any)
4. **Connections**: Supabase API, Sentry, OpenAI API

### Step 2: Remove `'unsafe-inline'` (Advanced)

To remove `'unsafe-inline'` from `script-src`:

1. **Use nonces** for inline scripts:
   ```html
   <script nonce="{random-nonce}">...</script>
   ```
   CSP: `script-src 'self' 'nonce-{random-nonce}'`

2. **Or use hashes** for specific inline scripts:
   ```html
   <script>console.log('hello');</script>
   ```
   Calculate SHA256 hash, add to CSP:
   ```
   script-src 'self' 'sha256-{hash}'
   ```

**Note**: Next.js generates inline scripts, so this requires Next.js configuration changes.

### Step 3: Test in Development

1. Set CSP in `_headers`
2. Test all app features:
   - Login flow
   - API calls
   - Image loading
   - External resources
3. Check browser console for CSP violations
4. Adjust CSP as needed

### Step 4: Deploy to Preview

1. Deploy to preview branch
2. Test thoroughly
3. Monitor Sentry for CSP violations
4. Adjust if needed

### Step 5: Deploy to Production

1. Deploy to production
2. Monitor for 24-48 hours
3. Check Cloudflare Analytics for CSP violations
4. Adjust if needed

---

## Caching Headers

### Current Caching Strategy

```text
# Index page - no cache to ensure fresh deployments
/index.html
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache
  Expires: 0

# Hashed assets - long cache (immutable)
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

# Service worker - always revalidate
/sw.js
  Cache-Control: public, max-age=0, must-revalidate
```

### Caching Rationale

- **`index.html`**: No cache (ensures users get latest version)
- **Hashed assets** (`/_next/static/*`): Long cache (file hash changes on update)
- **Service worker**: No cache (must check for updates)

---

## Headers for Pages Functions

⚠️ **Important**: `_headers` does **NOT** apply to Pages Functions (API routes, SSR pages).

To set headers in Pages Functions:

```typescript
// app/api/example/route.ts
export async function GET(request: Request) {
  return new Response(JSON.stringify({ data: 'example' }), {
    headers: {
      'Content-Type': 'application/json',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      // ... other security headers
    },
  });
}
```

Or use Next.js middleware:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
```

---

## Environment-Specific CSP

### Development
- More permissive CSP (easier debugging)
- Allow `localhost` sources

### Preview
- Production-like CSP
- Test new CSP changes here first

### Production
- Strictest CSP
- Monitor for violations

---

## Monitoring & Debugging

### Check Headers

```bash
# Check headers for a specific URL
curl -I https://prisma.pages.dev/

# Check CSP specifically
curl -I https://prisma.pages.dev/ | grep -i "content-security-policy"
```

### Browser Console

CSP violations appear in browser console:
```
Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self'".
```

### Cloudflare Analytics

1. Go to **Cloudflare Dashboard** > **Pages** > **prisma** > **Analytics**
2. Check for CSP violation reports (if configured)

### Sentry

Sentry can track CSP violations if configured:
```typescript
// sentry.client.config.ts
Sentry.init({
  // ... other config
  beforeSend(event) {
    if (event.tags?.csp) {
      // Log CSP violations
    }
    return event;
  },
});
```

---

## Recommended CSP Tuning Roadmap

### Phase 1: Current (Baseline)
- ✅ Basic CSP with `'unsafe-inline'`
- ✅ Restricted `connect-src`
- ✅ No `'unsafe-eval'`

### Phase 2: Tighten (Next Quarter)
- ⚠️ Remove `'unsafe-inline'` from `script-src` (requires Next.js changes)
- ⚠️ Use nonces or hashes for inline scripts
- ✅ Keep `'unsafe-inline'` for styles (acceptable risk)

### Phase 3: Strict (Future)
- ⚠️ Remove all `'unsafe-inline'`
- ⚠️ Use strict `img-src` (remove `https:` wildcard)
- ⚠️ Add `report-uri` for CSP violation reporting

---

## Related Documentation

- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/platform/headers/)
- [Content Security Policy (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Security Headers (securityheaders.com)](https://securityheaders.com/)

---

**Last Updated**: 2025-01-03


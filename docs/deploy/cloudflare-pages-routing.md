# Cloudflare Pages Routing for Next.js SSR

> **Last Updated**: 2025-01-03  
> **Framework**: Next.js 15.5.9 with `@cloudflare/next-on-pages`

---

## How Routing Works

### Next.js SSR on Cloudflare Pages

When you deploy a Next.js app to Cloudflare Pages using `@cloudflare/next-on-pages`:

1. **Static Pages**: Pre-rendered pages are served as static files
2. **Dynamic Routes**: Server-side rendered pages run as **Pages Functions** (Cloudflare Workers)
3. **API Routes**: API routes (`app/api/**/route.ts`) run as **Pages Functions**
4. **Middleware**: Next.js middleware runs as a **Pages Function** before routing

### Automatic Routing

Next.js handles routing automatically via Pages Functions. You **do not need** SPA-style redirects in `_redirects`.

**How it works:**
- User requests `/dashboard`
- Cloudflare Pages checks for a static file at `/dashboard`
- If not found, Pages Functions (Next.js) handle the route
- Next.js renders the page server-side and returns HTML

---

## `_redirects` File

### What It's For

The `_redirects` file in `apps/web/public/` is used for:
- **Legacy URL redirects** (e.g., `/old-path` → `/new-path`)
- **Trailing slash handling** (if needed)
- **NOT for SPA routing** (Next.js handles that)

### Current Configuration

```text
# Cloudflare Pages Redirects
# Note: Next.js SSR handles routing via Pages Functions, so SPA fallback is not needed.

# Auth callback (keep as-is)
/auth/callback    /auth/callback/   200

# Legacy redirects (if still needed)
/app/*    /:splat   301
/old-dashboard    /dashboard   301
```

### Why No SPA Fallback?

**SPA fallback** (`/* /index.html 200`) is for:
- Static SPAs (React Router, Vue Router)
- Client-side only routing

**Next.js SSR** uses:
- Server-side routing
- Pages Functions for dynamic content
- Automatic route handling

Adding SPA fallback would:
- ❌ Interfere with Next.js routing
- ❌ Break server-side rendering
- ❌ Cause 404s to return `index.html` instead of proper 404 pages

---

## 404 Handling

### Static 404.html

Cloudflare Pages automatically serves `404.html` when:
- A static file is requested but doesn't exist
- The file is not handled by Next.js routing

**Location**: `apps/web/public/404.html`

### Next.js not-found.tsx

For routes handled by Next.js:
- Next.js `app/not-found.tsx` is used
- This runs as a Pages Function
- Provides a styled 404 page with app navigation

**Location**: `apps/web/app/not-found.tsx`

### How They Work Together

1. **Static asset 404**: `404.html` is served
2. **Next.js route 404**: `app/not-found.tsx` is rendered
3. **API route 404**: Returns JSON error response

---

## Testing Deep Links

### What Are Deep Links?

Deep links are URLs that users might bookmark or share, like:
- `https://prisma.pages.dev/dashboard`
- `https://prisma.pages.dev/clients/123`
- `https://prisma.pages.dev/documents?filter=recent`

### How to Test

1. **Open in incognito/private window** (to avoid cache)
2. **Navigate directly** to the deep link URL
3. **Verify**:
   - Page loads correctly (not 404)
   - Server-side data is rendered
   - Client-side navigation works

### Example Test Cases

```bash
# Test homepage
curl https://prisma.pages.dev/

# Test authenticated route (should redirect to login)
curl https://prisma.pages.dev/dashboard

# Test API route
curl https://prisma.pages.dev/api/health

# Test 404 (should return 404.html or not-found.tsx)
curl https://prisma.pages.dev/nonexistent-page
```

### Local Testing

```bash
# Build the app
pnpm --filter @prisma/web pages:build

# Preview locally with Wrangler
wrangler pages dev apps/web/.vercel/output/static --compatibility-flags=nodejs_compat

# Test deep links
curl http://localhost:8788/dashboard
```

---

## Common Routing Issues

### Issue: 404 on Refresh

**Symptom**: Page works when navigating, but 404s on refresh

**Cause**: SPA fallback redirect interfering with Next.js routing

**Fix**: Remove SPA fallback from `_redirects` (already done)

### Issue: API Routes Return 404

**Symptom**: `/api/*` routes return 404

**Cause**: API routes not being recognized as Pages Functions

**Fix**: Ensure `pages:build` step runs after `next build`

### Issue: Middleware Not Running

**Symptom**: Middleware logic not executing

**Cause**: Middleware not compatible with Cloudflare Workers runtime

**Fix**: Check middleware uses only Cloudflare-compatible APIs

---

## Routing Best Practices

1. **Use Next.js routing** for all app routes
2. **Use `_redirects`** only for legacy URLs
3. **Test deep links** before deploying
4. **Monitor 404s** in Cloudflare Analytics
5. **Use `not-found.tsx`** for custom 404 pages

---

## Related Documentation

- [Cloudflare Pages Routing](https://developers.cloudflare.com/pages/platform/routing/)
- [Next.js Routing](https://nextjs.org/docs/app/building-your-application/routing)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)

---

**Last Updated**: 2025-01-03


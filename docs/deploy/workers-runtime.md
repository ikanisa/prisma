# Workers Runtime Configuration

> **Last Updated**: 2025-01-03  
> **Configuration**: `wrangler.toml`

---

## Overview

Prisma Glow uses **Cloudflare Pages Functions** (built on Workers runtime) to run Next.js SSR pages and API routes. The `wrangler.toml` file configures the Workers runtime compatibility settings.

---

## Current Configuration

```toml
name = "prisma"
compatibility_date = "2025-01-03"
compatibility_flags = ["nodejs_compat"]

pages_build_output_dir = "apps/web/.vercel/output/static"
```

---

## Compatibility Date

### What It Is

The `compatibility_date` determines which Workers runtime features and APIs are available. Each date represents a snapshot of the Workers runtime.

### Current Date

- **Date**: `2025-01-03`
- **Next Review**: `2025-04-01` (quarterly)

### Why It Matters

- **New Features**: Newer dates unlock new runtime features
- **Breaking Changes**: Some dates introduce breaking changes
- **Performance**: Newer dates may include performance improvements

### Update Policy

1. **Review quarterly** (every 3 months)
2. **Test in preview** before updating production
3. **Check changelog** for breaking changes:
   - [Workers Runtime Changelog](https://developers.cloudflare.com/workers/platform/changelog/)

### How to Update

1. Update `compatibility_date` in `wrangler.toml`:
   ```toml
   compatibility_date = "2025-04-01"
   ```

2. Test locally:
   ```bash
   wrangler pages dev apps/web/.vercel/output/static --compatibility-flags=nodejs_compat
   ```

3. Deploy to preview branch
4. Test thoroughly
5. Deploy to production

---

## Node.js Compatibility (`nodejs_compat`)

### Why It's Needed

Next.js uses Node.js APIs that aren't available in the Workers runtime by default:

- `node:url` (fileURLToPath, URL parsing)
- `node:path` (dirname, join, path resolution)
- Used in `next.config.mjs` for path resolution

### What It Does

The `nodejs_compat` flag enables Node.js polyfills in the Workers runtime, allowing Next.js to run.

### Bundle Size Impact

- **Without**: ~0KB (but Next.js won't work)
- **With**: ~200KB (acceptable for Next.js apps)

### Performance Impact

- Minimal (polyfills are optimized)
- Acceptable trade-off for Next.js compatibility

### When to Remove

**Never** - Next.js requires Node.js APIs, so `nodejs_compat` is required for this app.

---

## Compatibility Flags

### Available Flags

| Flag | Purpose | Used? |
|------|---------|-------|
| `nodejs_compat` | Enables Node.js polyfills | ✅ Yes (required) |
| `streams_enable_constructors` | Enables Stream constructors | ❌ No |
| `html_rewriter_treats_entities_as_code_points` | HTML entity handling | ❌ No |

### Adding New Flags

Only add flags if:
1. A dependency requires it
2. You've tested it thoroughly
3. You understand the impact

---

## Runtime Limitations

### What Works

✅ **Supported:**
- Next.js SSR pages
- Next.js API routes
- Next.js middleware
- Supabase client (browser APIs)
- Fetch API
- Web Crypto API
- WebSockets (via Supabase)

### What Doesn't Work

❌ **Not Supported:**
- File system access (`fs` module)
- Native Node.js modules (without polyfills)
- Long-running processes (10ms CPU limit per request)
- TCP sockets (use fetch/WebSockets instead)

### Workarounds

| Need | Workaround |
|------|-----------|
| File system | Use Cloudflare R2 or external storage |
| Long-running tasks | Use Cloudflare Queues or external service |
| Native modules | Use Web APIs or polyfills |

---

## Testing Runtime Compatibility

### Local Testing

```bash
# Build the app
pnpm --filter @prisma/web pages:build

# Test with Wrangler
wrangler pages dev apps/web/.vercel/output/static \
  --compatibility-flags=nodejs_compat \
  --compatibility-date=2025-01-03
```

### Check for Errors

1. **Build errors**: Check for Node.js API usage
2. **Runtime errors**: Check Cloudflare Pages function logs
3. **CSP violations**: Check browser console

### Common Errors

#### "Module not found: node:url"

**Cause**: Missing `nodejs_compat` flag

**Fix**: Add `compatibility_flags = ["nodejs_compat"]` to `wrangler.toml`

#### "Function exceeded CPU time limit"

**Cause**: Long-running operation

**Fix**: Optimize code or move to external service

#### "WebSocket not supported"

**Cause**: Workers runtime doesn't support WebSocket clients

**Fix**: Use Supabase's WebSocket implementation (already done)

---

## Monitoring Runtime Performance

### Cloudflare Analytics

1. Go to **Cloudflare Dashboard** > **Pages** > **prisma** > **Analytics**
2. Check:
   - **Request duration** (should be < 100ms for most requests)
   - **Error rate** (should be < 1%)
   - **CPU time** (should be < 10ms per request)

### Sentry

Monitor for runtime errors:
- Uncaught exceptions
- Promise rejections
- Timeout errors

---

## Best Practices

1. **Keep compatibility date current** (update quarterly)
2. **Test thoroughly** before updating
3. **Monitor performance** after updates
4. **Document changes** in commit messages
5. **Use preview deployments** to test compatibility changes

---

## Related Documentation

- [Workers Compatibility Dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/)
- [Node.js Compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Workers Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)

---

## Troubleshooting

### Issue: "Compatibility date too old"

**Symptom**: Build fails with compatibility date error

**Fix**: Update `compatibility_date` in `wrangler.toml`

### Issue: "Node.js API not available"

**Symptom**: Runtime error about missing Node.js module

**Fix**: Ensure `nodejs_compat` flag is set

### Issue: "Function timeout"

**Symptom**: Requests timeout after 30 seconds

**Fix**: Optimize code or move long-running tasks to external service

---

**Last Updated**: 2025-01-03


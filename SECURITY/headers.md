# Security Headers Configuration

**Version:** 1.0.0  
**Last Updated:** 2025-11-02  
**Purpose:** Document security headers implemented in Prisma Glow for CSP, CORS, HSTS, and other security controls

---

## Overview

Security headers are HTTP response headers that instruct browsers to enable or configure security features. This document describes the security headers configured across the Prisma Glow stack.

---

## Content Security Policy (CSP)

### Purpose
Prevents Cross-Site Scripting (XSS), clickjacking, and other code injection attacks by restricting resource loading.

### Implementation

**Location:** `server/main.py` (FastAPI backend)

```python
CSP_HEADER = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", "${SUPABASE_URL}", "${OPENAI_API_URL}"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"]
}
```

### Current Configuration

| Directive | Value | Rationale |
|-----------|-------|-----------|
| `default-src` | `'self'` | Only load resources from same origin by default |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | Allow inline scripts for React (⚠️ consider using nonce) |
| `style-src` | `'self' 'unsafe-inline'` | Allow inline styles for Tailwind/CSS-in-JS |
| `img-src` | `'self' data: https:` | Allow images from any HTTPS source and data URIs |
| `font-src` | `'self' data:` | Allow fonts from same origin and data URIs |
| `connect-src` | `'self' ${SUPABASE_URL} ${OPENAI_API_URL}` | Allow API calls to Supabase and OpenAI |
| `frame-ancestors` | `'none'` | Prevent clickjacking (no embedding in iframes) |
| `base-uri` | `'self'` | Restrict base tag to same origin |
| `form-action` | `'self'` | Only submit forms to same origin |

### Additional Origins

Additional origins can be configured via environment variables:

```env
# Additional connect-src origins (space-separated)
CSP_ADDITIONAL_CONNECT_SRC="https://api.third-party.com https://analytics.example.com"

# Additional img-src origins (space-separated)
CSP_ADDITIONAL_IMG_SRC="https://cdn.example.com"
```

### Security Improvements

**Recommended Enhancements:**

1. **Remove `'unsafe-inline'` and `'unsafe-eval'`:**
   - Use CSP nonces for inline scripts
   - Avoid eval() in JavaScript
   - Extract inline event handlers

2. **Restrict `img-src`:**
   - Replace `https:` with explicit CDN domains
   - Use `'self'` and specific trusted domains

3. **Add `object-src` and `media-src`:**
   ```
   object-src 'none'
   media-src 'self'
   ```

4. **Enable CSP Reporting:**
   ```
   report-uri /api/csp-report
   report-to csp-endpoint
   ```

### Testing CSP

1. **Browser DevTools:**
   - Check Console for CSP violations
   - Look for `[Report Only]` or `[Violation]` messages

2. **CSP Evaluator:**
   - https://csp-evaluator.withgoogle.com/
   - Paste CSP header for analysis

3. **Report-Only Mode:**
   ```python
   # For testing without breaking functionality
   response.headers["Content-Security-Policy-Report-Only"] = csp_header
   ```

---

## HTTP Strict Transport Security (HSTS)

### Purpose
Enforces HTTPS connections and prevents protocol downgrade attacks.

### Implementation

**Location:** `server/main.py`

```python
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
```

### Configuration

| Directive | Value | Description |
|-----------|-------|-------------|
| `max-age` | `31536000` (1 year) | Browsers remember to use HTTPS for 1 year |
| `includeSubDomains` | ✅ | Apply HSTS to all subdomains |
| `preload` | ✅ | Eligible for HSTS preload list |

### HSTS Preload

To submit for HSTS preload list:
1. Visit: https://hstspreload.org/
2. Verify requirements:
   - Valid certificate
   - Redirect from HTTP to HTTPS
   - HTTPS served on default port
   - HSTS header with `max-age >= 31536000`, `includeSubDomains`, and `preload`
3. Submit domain

**Status:** ⚠️ Not yet submitted (requires production domain)

### Testing HSTS

```bash
# Check HSTS header
curl -I https://app.prismaglow.com | grep -i strict-transport-security

# Expected output:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## Cross-Origin Resource Sharing (CORS)

### Purpose
Controls which origins can access API resources, preventing unauthorized cross-origin requests.

### Implementation

**Location:** `server/main.py` (FastAPI) and `apps/gateway/src/server.js` (Express)

**FastAPI:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # From API_ALLOWED_ORIGINS env var
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)
```

**Express Gateway:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));
```

### Configuration

**Allowed Origins:**

```env
# Development
API_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:8080"

# Staging
API_ALLOWED_ORIGINS="https://staging.prismaglow.com,https://admin.staging.prismaglow.com"

# Production
API_ALLOWED_ORIGINS="https://app.prismaglow.com,https://admin.prismaglow.com"
```

### CORS Best Practices

✅ **DO:**
- Use specific origins (not `*`)
- Enable credentials only when necessary
- Limit allowed methods
- Validate origin header server-side

❌ **DON'T:**
- Use `allow_origins=["*"]` with `allow_credentials=True` (invalid)
- Allow all origins in production
- Ignore preflight OPTIONS requests

### Testing CORS

```bash
# Test preflight request
curl -X OPTIONS https://api.prismaglow.com/v1/health \
  -H "Origin: https://app.prismaglow.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Check response headers:
# Access-Control-Allow-Origin: https://app.prismaglow.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
# Access-Control-Allow-Credentials: true
```

---

## Other Security Headers

### X-Content-Type-Options

**Purpose:** Prevent MIME type sniffing

```python
response.headers["X-Content-Type-Options"] = "nosniff"
```

### X-Frame-Options

**Purpose:** Prevent clickjacking (redundant with CSP `frame-ancestors` but provides defense-in-depth)

```python
response.headers["X-Frame-Options"] = "DENY"
```

### X-XSS-Protection

**Purpose:** Enable browser XSS filter (legacy, CSP is preferred)

```python
response.headers["X-XSS-Protection"] = "1; mode=block"
```

**Note:** This header is deprecated. Modern browsers rely on CSP instead.

### Referrer-Policy

**Purpose:** Control referrer information sent to other sites

```python
response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
```

**Options:**
- `no-referrer` - Never send referrer
- `no-referrer-when-downgrade` - Send referrer unless HTTPS → HTTP
- `origin` - Send origin only
- `origin-when-cross-origin` - Send full URL for same-origin, origin for cross-origin
- `same-origin` - Send referrer for same-origin only
- `strict-origin` - Send origin, but not on HTTPS → HTTP
- `strict-origin-when-cross-origin` - Full URL same-origin, origin cross-origin, nothing on downgrade
- `unsafe-url` - Always send full URL (not recommended)

**Current:** `strict-origin-when-cross-origin` (balanced privacy and functionality)

### Permissions-Policy

**Purpose:** Control browser feature access (formerly Feature-Policy)

```python
response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
```

**Common Features:**
- `geolocation` - GPS location
- `camera` - Camera access
- `microphone` - Microphone access
- `payment` - Payment Request API
- `usb` - USB device access
- `midi` - MIDI device access
- `encrypted-media` - EME (DRM)
- `autoplay` - Media autoplay

**Example:**
```python
# Allow camera for self, deny for iframes
response.headers["Permissions-Policy"] = "camera=(self)"
```

---

## Secure Cookies

### Purpose
Protect session cookies from theft and unauthorized access.

### Configuration

**Session Cookies:**

```env
SESSION_COOKIE_NAME="__Secure-prisma-glow"
SESSION_COOKIE_SECURE="true"
SESSION_COOKIE_HTTP_ONLY="true"
SESSION_COOKIE_SAME_SITE="lax"
SESSION_COOKIE_PATH="/"
SESSION_COOKIE_DOMAIN=""  # Blank = host-only
```

### Cookie Attributes

| Attribute | Value | Description |
|-----------|-------|-------------|
| `Secure` | ✅ `true` | Only send over HTTPS |
| `HttpOnly` | ✅ `true` | Not accessible via JavaScript (prevents XSS theft) |
| `SameSite` | `Lax` | CSRF protection (send on same-site and top-level navigation) |
| `Path` | `/` | Cookie valid for entire site |
| `Domain` | (blank) | Host-only (not shared with subdomains) |

### SameSite Options

| Value | CSRF Protection | Use Case |
|-------|----------------|----------|
| `Strict` | ⭐⭐⭐ Strongest | High-security apps (breaks some legitimate cross-site flows) |
| `Lax` | ⭐⭐ Good | Most web apps (default, balances security and usability) |
| `None` | ❌ None | Cross-site cookies (requires `Secure`) |

**Current:** `Lax` (provides CSRF protection while maintaining usability)

### Cookie Naming Convention

**Recommended prefixes:**

- `__Secure-` - Requires `Secure` attribute and HTTPS
- `__Host-` - Requires `Secure`, HTTPS, and `Path=/` (no `Domain` attribute)

**Current:** `__Secure-prisma-glow` (enforces HTTPS)

### Testing Cookies

```bash
# Check Set-Cookie header
curl -I https://app.prismaglow.com/api/auth/login -c cookies.txt

# Expected:
# Set-Cookie: __Secure-prisma-glow=...; Secure; HttpOnly; SameSite=Lax; Path=/
```

---

## SSL/TLS Configuration

### Certificate Requirements

- **Minimum TLS Version:** TLS 1.2 (TLS 1.3 preferred)
- **Certificate Authority:** Let's Encrypt (or commercial CA)
- **Key Size:** 2048-bit RSA minimum (4096-bit or ECDSA P-256 preferred)
- **Certificate Validity:** ≤ 90 days (automated renewal)

### Cipher Suites

**Recommended (Strong):**
```
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
```

**Avoid (Weak):**
- RC4 ciphers
- 3DES ciphers
- Export ciphers
- Anonymous ciphers
- MD5-based ciphers

### Testing TLS

```bash
# Use SSL Labs
https://www.ssllabs.com/ssltest/analyze.html?d=app.prismaglow.com

# Expected grade: A or A+

# Use testssl.sh
testssl.sh https://app.prismaglow.com
```

---

## Security Headers Checklist

Use this checklist to verify headers are configured:

### Essential Headers

- [ ] `Content-Security-Policy` - Configured with strict directives
- [ ] `Strict-Transport-Security` - Max-age ≥ 1 year, includeSubDomains, preload
- [ ] `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- [ ] `X-Frame-Options: DENY` - Prevent clickjacking
- [ ] `Referrer-Policy` - Configured appropriately

### Cookie Security

- [ ] `Secure` attribute - All cookies
- [ ] `HttpOnly` attribute - Session cookies
- [ ] `SameSite` attribute - Set to `Lax` or `Strict`
- [ ] Cookie name prefix - `__Secure-` or `__Host-`

### CORS

- [ ] `Access-Control-Allow-Origin` - Specific origins only
- [ ] `Access-Control-Allow-Credentials` - Only if needed
- [ ] `Access-Control-Allow-Methods` - Minimal set
- [ ] Preflight requests handled - OPTIONS method

### Additional

- [ ] `Permissions-Policy` - Restrict browser features
- [ ] `X-XSS-Protection: 1; mode=block` - Legacy browsers
- [ ] TLS 1.2+ - Only secure protocols
- [ ] Certificate valid - Not expired, trusted CA

---

## Monitoring & Alerting

### Header Verification

**Automated checks:**
- Monitor header presence in production
- Alert on missing or misconfigured headers
- Track CSP violations via reporting API

**Tools:**
- Security Headers: https://securityheaders.com/
- Mozilla Observatory: https://observatory.mozilla.org/
- SSL Labs: https://www.ssllabs.com/ssltest/

### CSP Violation Reporting

**Endpoint:** `/api/csp-report`

**Configuration:**
```python
CSP_HEADER["report-uri"] = ["/api/csp-report"]
CSP_HEADER["report-to"] = ["csp-endpoint"]
```

**Report-To Header:**
```python
response.headers["Report-To"] = json.dumps({
    "group": "csp-endpoint",
    "max_age": 10886400,
    "endpoints": [{"url": "https://api.prismaglow.com/api/csp-report"}]
})
```

---

## References

- **OWASP Secure Headers Project:** https://owasp.org/www-project-secure-headers/
- **MDN Security Headers:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security
- **CSP Reference:** https://content-security-policy.com/
- **HSTS Preload:** https://hstspreload.org/
- **SSL Labs Best Practices:** https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices

---

**Last Updated:** 2025-11-02  
**Maintainer:** Security Team  
**Related:** `SECURITY.md`, `server/main.py`, `apps/gateway/src/server.js`

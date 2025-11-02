# Security Headers Configuration

## Overview
CSP, HSTS, CORS configuration, secure cookie attributes, and testing procedures.

## Content Security Policy (CSP)

**Next.js Configuration:**
```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  connect-src 'self' https://api.prismaglow.com https://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`;
```

## HTTP Strict Transport Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## CORS Configuration

**Gateway:**
```typescript
app.use(cors({
  origin: process.env.API_ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

## Secure Cookie Attributes

```
Set-Cookie: __Secure-session=abc123; 
  Secure; 
  HttpOnly; 
  SameSite=Lax; 
  Path=/; 
  Max-Age=604800
```

## Testing Procedures

```bash
# Check security headers
curl -I https://app.prismaglow.com | grep -E "Content-Security-Policy|Strict-Transport|X-Frame"

# Validate CSP
curl https://app.prismaglow.com | grep -o "script-src[^;]*"
```

**Version:** 1.0.0 (2025-11-02)

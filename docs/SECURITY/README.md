# Security Documentation

This directory contains security-related documentation and procedures.

## Contents

| Document | Description |
|----------|-------------|
| [Secret Rotation](./secret-rotation.md) | Secret management and rotation procedures |

## Security Policies

### Environment Variable Security
- Never commit secrets to version control
- Use `.env.local` for local development (gitignored)
- Store production secrets in Cloudflare Pages environment variables

### API Security
- All endpoints require authentication (except public routes)
- Rate limiting enforced on all API routes
- OWASP Top 10 compliance tracked in `lib/security/api-audit.ts`

### Data Security
- RLS enabled on all Supabase tables
- Cross-tenant data isolation enforced
- Audit logging for sensitive operations

## Reporting Security Issues

If you discover a security vulnerability:
1. Do NOT create a public issue
2. Email security details to the team
3. Allow 48 hours for initial response

# Configuration Audit – Vercel + Supabase (2025-10-18)

This checklist inventories the environment variables and service integrations the platform expects in Phase 3. Use it to verify that Vercel, GitHub Actions, and Supabase secrets are populated _before_ the next deploy.

## 1. Authentication & CAPTCHA
- [ ] `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_ISSUER`
- [ ] `TURNSTILE_SECRET_KEY`
- [ ] `VITE_TURNSTILE_SITE_KEY` (client)
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client)
- [ ] `VITE_ENABLE_CAPTCHA` set to `true`
- [ ] `VITE_ENABLE_PWNED_PASSWORD_CHECK` set according to policy

## 2. Supabase & Database Connectivity
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_JWT_SECRET`
- [ ] `DATABASE_URL` (primary connection string – pooled or direct)
- [ ] `DIRECT_URL` (transactional pooler, optional but recommended)
- [ ] `INVITE_ACCEPT_BASE_URL` (`https://app.prismaglow.com/auth/accept-invite`)

## 3. SMTP / Email Delivery
- [ ] `SMTP_HOST`
- [ ] `SMTP_PORT`
- [ ] `SMTP_USERNAME`
- [ ] `SMTP_PASSWORD`
- [ ] `SMTP_FROM_EMAIL`
- [ ] `SMTP_FROM_NAME`
- [ ] `SMTP_USE_SSL` / `SMTP_USE_STARTTLS`
- [ ] `SMTP_TIMEOUT_SECONDS`

## 4. Edge Function Guards
- [ ] `DEMO_BOOTSTRAP_AUTH_TOKEN`
- [ ] `SEED_DATA_AUTH_TOKEN`
- [ ] `ALLOW_DEMO_BOOTSTRAP` set explicitly (`false` in production)

## 5. Observability & Alerts
- [ ] `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` (if tracing to OTLP collector)
- [ ] `ERROR_NOTIFY_WEBHOOK`, `RATE_LIMIT_ALERT_WEBHOOK`
- [ ] `API_RATE_LIMIT`, `API_RATE_WINDOW_SECONDS`

## 6. Third-Party Integrations
- [ ] `SAMPLING_C1_BASE_URL`, `SAMPLING_C1_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] Google service account keys (Drive/Sheets)
- [ ] WhatsApp OTP credentials (`whatsapp_otp_*` functions)

## Verification Steps
1. **Vercel:** `vercel env ls` per environment → confirm entries above. Add new keys via `vercel env add`.
2. **Supabase:** `supabase secrets list` (requires appropriate privileges) → ensure server-side functions have access to SMTP and Turnstile secrets.
3. **GitHub Actions:** Repository settings → Secrets & Variables → Actions → confirm `DATABASE_URL`, `DIRECT_URL`, Supabase tokens, and new SMTP/CAPTCHA keys for CI.

Use this document as an auditable record—check items off and attach the output of each command to the deployment ticket.

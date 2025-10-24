# Edge Function Security Review Checklist

Use this checklist during Phase 4 to confirm Supabase Edge Functions remain hardened.

## 1. Access Controls
- [ ] Verify seed/demo functions (`seed-data`, `create-demo-users`) require the bearer tokens (`SEED_DATA_AUTH_TOKEN`, `DEMO_BOOTSTRAP_AUTH_TOKEN`) and that the tokens reside only in secure secret stores.
- [ ] Confirm all functions import `getServiceSupabaseClient` to source credentials from Vault or Supabase secrets (no inline keys).
- [ ] Review `supabase/functions/**/_shared` helpers for least-privilege usage of the service-role key.

## 2. Network & Origin Restrictions
- [ ] Ensure CORS headers restrict `Access-Control-Allow-Origin` to the trusted domain list where feasible.
- [ ] Validate the Turnstile verification endpoint (`/v1/security/verify-captcha`) enforces rate limits and uses HTTPS to reach Cloudflare.

## 3. Logging & Monitoring
- [ ] Confirm structured logs are emitted for security-sensitive events (`iam.invite_*`, demo creation attempts) and forwarded to log drains.
- [ ] Review warning/error logs for repeated unauthorised attempts; create an incident if thresholds are exceeded.

## 4. Secret Rotation
- [ ] Rotate bearer tokens following `docs/SECURITY/KEY_ROTATION.md`; redeploy functions with `supabase functions deploy --all`.
- [ ] Check that rotation is recorded in the security change log.

## 5. Static Analysis
- [ ] Run `supabase functions lint` (or ESLint) locally; ensure no TODO/FIXME markers remain for sensitive branches.
- [ ] Scan for accidental console logs that might reveal secrets or PII.

Document outcomes and remediation actions in the release ticket.

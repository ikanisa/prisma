# Release Checklist

## 1. Environment Readiness
- [ ] Verify `WA_APP_SECRET` is set in production and staging; ensure `WA_ALLOW_MISSING_SECRET` is **not** set outside local.
- [ ] Confirm Supabase service role credentials are current and the Edge function has access to storage buckets (`insurance`).
- [ ] Ensure log aggregation targets (Logflare/Sentry) are receiving structured JSON logs from previous deployments.

## 2. Schema & Migrations
- [ ] Migration `20251001000000_security_perf_indexes.sql` applied (indexes on `referral_attributions`, `marketplace_categories`).
- [ ] Run `supabase db diff` to confirm no pending migrations; reconcile before tag.

## 3. Test & Verification
- [ ] Manual webhook smoke test (referral credit, wallet redemption, insurance OCR) in staging; confirm logs show masked PII and request IDs.
- [ ] Regression pass on idempotency by replaying a message; expect `IDEMPOTENT_DUPLICATE` log and 200 response.
- [ ] Signature verification check: send invalid signature in staging, expect 401 + alert.

## 4. Logging & Observability
- [ ] Structured logger in use across core flows (webhook entry, insurance, referrals, wallet, routing); ensure dashboard charts updated.
- [ ] Implement/verify alerting for signature and idempotency failures (see GAP-03 in `gaps_and_plan.md`).

## 5. Deployment Steps
1. `git status` clean, tag release branch.
2. `supabase db push` (if new migrations added post-checklist).
3. Deploy Edge function via `supabase functions deploy wa-webhook`.
4. Rotate staging first, validate smoke tests, then promote to production.

## 6. Tooling & Artifacts
- Optional: Maintain Postman collection for webhook payloads (`/tests/wa/runbook.md` references sample JSON) and attach to release ticket.
- Capture final observability snapshots (Grafana/Logflare) showing masked logs and new health checks.

## 7. Sign-off
- [ ] Webhook Platform lead
- [ ] SRE on-call
- [ ] Product owner

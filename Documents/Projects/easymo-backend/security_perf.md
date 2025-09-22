# Security & Performance Review

## Security Observations

### Signature Verification
- HMAC validation is implemented in `wa/verify.ts` and compares the incoming `x-hub-signature-256` header against an SHA-256 digest of the raw body.
- When `WA_APP_SECRET` is unset the function logs a warning and skips verification, which keeps local development simple but leaves production deployments vulnerable to spoofed requests. **Recommendation:** require the secret in non-local environments (feature flag or explicit environment check) and fail closed when absent.

### Idempotency Controls
- `state/idempotency.ts` records every WhatsApp message id into `wa_events` (PK on `wa_message_id`). Duplicate inserts short-circuit processing, preventing replay/duplicate delivery.
- Error paths currently return `false`, which blocks processing if the insert fails (good), but consider alerting/metrics so the team knows idempotency writes are failing.
- Table growth is unbounded; if spam is a concern, plan a retention job that prunes rows older than the WhatsApp retry horizon (e.g., 30 days) while keeping the primary key intact.

### Data Exposure in Logs
- Structured logging is pervasive, but several events still emit full E.164 numbers (`WEBHOOK_MESSAGE_CONTEXT`, `INSURANCE_LEAD`, `RPC_NEARBY_*`). Store-side logs are long-lived, so these should be masked or hashed to minimize PII exposure. **Recommendation:** introduce a helper that returns masked digits (e.g., `+2507****123`) and apply it to all logging contexts that accept phone numbers.
- Referral-related logs include raw referral codes (`REFERRAL_CODE_MATCH`, `REFERRAL_WALLET_CREDITED`). If codes are considered sensitive, swap to hashes or the first/last few characters.

### Referral Code Opacity
- Codes are generated from a 62-character alphabet with `crypto.getRandomValues`, producing 9-character strings. Collisions are retried up to 10 times before a timestamp-suffixed fallback. This provides ~53 bits of entropy and is sufficient against guessing/brute force, assuming rate limiting on code entry.
- Codes are stored only in `referral_links` with a unique constraint and are not exposed elsewhere besides user-facing share links. No security changes required.

## Performance & Index Review

### Confirmed Coverage
- `profiles(whatsapp_e164)` unique index supports login/profile lookup.
- `chat_state(user_id)` and `wallets(user_id)` use their primary keys for single-row get/upsert.
- `wallet_ledger(user_id, created_at desc)` covers the paginated ledger reads.
- Basket tables (`basket_members(user_id)`, `contributions(basket_id)`) already have supporting indexes for membership and contribution lookups.

### Gaps / Recommendations
- `referral_attributions` is queried by sharer and day (`countTodayCredits` filters `sharer_user_id`, `credited`, `created_at >= …`). Only indexes present are on `joiner_user_id` and `code`; add a composite index, e.g. `create index if not exists referral_attributions_sharer_daily_idx on public.referral_attributions (sharer_user_id, credited, created_at desc);`
- `marketplace_categories` listings filter `is_active` then order by `sort_order`. There is no supporting index; add `(is_active, sort_order)` to avoid sequential scans when the table grows.
- `served_drivers` / `served_passengers` inserts currently lack pruning or indexes. If read paths ever query by `viewer_*` or `expires_at`, plan indexes and periodic cleanup to keep contention low.

## Next Steps
1. Ship masking utilities for E.164 logging and swap in affected modules.
2. Enforce the WhatsApp signature secret in production environments.
3. Create the recommended indexes (especially on `referral_attributions`) and schedule pruning jobs for idempotency/served tables as needed.
4. Add monitoring/alerts for idempotency insert failures to catch service-role permission or quota issues early.

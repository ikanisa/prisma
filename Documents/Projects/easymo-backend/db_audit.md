# Database & RPC Audit – easyMO WhatsApp / Supabase

Date: $(date -u '+%Y-%m-%d %H:%M:%SZ')
Project Ref: `ezrriefbmhiiqfoxgjgz`

This audit documents the expected schema for the WhatsApp back-end (profiles, trips, marketplace, baskets, wallet/referrals, insurance) and records completeness/gaps based on code usage. Direct database introspection was not possible from this environment (no Supabase access token / network), so findings combine code references, migration review, and TODOs for manual verification via Supabase Studio or SQL Runner.

> **Action**: run the SQL snippets marked “Verify” in the Supabase dashboard to confirm the actual schema matches expectations.

---

## Core Messaging Tables

### `profiles`
- **Usage**: `state/store.ts` (`ensureProfileWithFlag`) queries by `whatsapp_e164`, inserts if absent.
- **Expected columns** (derived from upserts):
  - `user_id uuid primary key` (or `id`),
  - `whatsapp_e164 text unique not null`,
  - `display_name text` (wallet settings),
  - `show_on_leaderboards boolean default true`,
  - Additional fields: `wa_user_id`, `country`, etc. (to confirm).
- **Verify**: confirm unique index on `whatsapp_e164`, default `show_on_leaderboards true`.

### `contacts`
- **Usage**: opt-in/opt-out tracks in `router/guards.ts` (fields `opted_out`, `opted_in`, timestamps).
- **Verify**: ensure upsert by `msisdn_e164` succeeds and “STOP/START” logic sees the latest status.

### `chat_state`
- **Usage**: conversation finite-state storage (JSON).
- **Requirement**: `user_id uuid primary key`, `state jsonb`, `updated_at timestamptz`.
- **Verify**: ensure RLS allows service role to upsert.

### `wa_events`
- **Usage**: idempotency (records processed message IDs).
- **Verify**: table exists with unique constraint on message ID; service role can insert.

### `app_config`
- **Usage**: central config fetched from `utils/share.ts` (fields: `wa_bot_number_e164`, tokens config, redeem catalog, `insurance_admin_numbers`, `referral_short_domain`, `openai_api_key`, etc.).
- **Verify**: row with `id = 1` exists and includes the new columns from migrations (momo QR config, insurance admin numbers, wallet catalog, openai key).

---

## Trips & Matching

### `trips`
- **Code dependencies**: `flows/schedule.ts` inserts using fields `creator_user_id`, `role`, `vehicle_type`, `pickup geography`, `dropoff`, `status = 'open'`, `created_at`.
- **Matching RPCs** reference:
  - `match_drivers_for_trip` / `_v2` (new migration).
  - Expect `pickup` and `dropoff` stored as `geography(Point,4326)` to avoid geometry mismatch.
  - Additional columns used: `pickup_text`, `dropoff_text` (optional), `pickup_at`.
- **Indexes required** (per code & migrations):
  - `trips_status_idx`, `trips_role_idx`, `trips_vehicle_idx`, `trips_created_idx`.
  - `trips_pickup_gix`, `trips_dropoff_gix` (GiST).
  - Optional partial index for `status='open'`.
- **Verify**: run `SELECT st_geometrytype(pickup)::text FROM trips LIMIT 1;` to ensure geography.
- **RPC expectations**:
  - `match_drivers_for_trip_v2` and `_passengers_..._v2` exist with default radius 20 km, 30-day window, drop-off optional ordering.
  - Legacy fallback `match_drivers_for_trip` etc. still present (the code calls base functions unless updated).

### RPC Health Checks (run via SQL Runner)
```sql
select * from match_drivers_for_trip_v2('<trip_uuid>', 10, true);
select * from match_passengers_for_trip_v2('<trip_uuid>', 10, true);
```
Should return rows when data exists; verify `distance_km` computed and columns match code expectations.

---

## Marketplace

### `businesses`
- **Usage**: `flows/marketplace.ts` requires columns `id uuid`, `owner_whatsapp`, `category_id bigint`, `name`, `description`, `catalog_url`, `geo geography(Point,4326)`, `is_active boolean`.
- **Verify**: ensure `insertBusiness` and `rpcNearbyBusinesses` succeed (requires RLS or security definer functions enabled).
- **Indexes**: recommended spatial index (`gist` on geo) and standard `owner_whatsapp` index, though not explicitly in migrations.

### RPC `rpcNearbyBusinesses`
- Should exist (code references `rpc/marketplace.ts`). Check signature `_lat`, `_lon`, `_viewer`, `_limit` and returns fields `id`, `name`, `description`, `distance_km`.

---

## Baskets

Tables expected:
- `baskets` (fields used: `id`, `creator_id`, `join_token`, `join_token_revoked`, `name`, `description`, `type`, `momo_target`, `momo_is_code`, `status`, `created_at`).
- `basket_members` (fields: `basket_id`, `user_id`, membership status, totals).
- `basket_contributions`
- `basket_joins` (join-token audits)
- `basket_invites` (if implemented; check code lines 600+). 

Requirements:
- Unique index on `join_token`.
- The share link expects tokens `JB:<token>` to map back to `baskets`.
- Verify: run `SELECT join_token, join_token_revoked FROM baskets LIMIT 5;`.

---

## Wallet & Referrals

### Tables
- `referral_links(user_id primary key, code unique, short_url, active, last_shared_at)`
- `referral_attributions(id uuid, code, sharer_user_id, joiner_user_id, credited boolean, credited_tokens, reason, created_at)` Unique constraint on `joiner_user_id`.
- `referral_clicks` (optional; check if present).
- `wallets(user_id primary key, balance_tokens, updated_at)`
- `wallet_ledger(id bigserial, user_id, delta_tokens, type, meta jsonb, created_at)`
- `wallet_redemptions(id uuid, user_id, reward_id, reward_name, cost_tokens, status, meta, created_at)` (from `services/wallet.ts`).
- `promo_rules` (if used) or configuration fields in `app_config`.

### RPC `wallet_apply_delta`
- Defined in `20250918000100_referrals_wallet.sql`.
- Verify signature: `wallet_apply_delta(p_user_id uuid, p_delta integer, p_type text, p_meta jsonb)` returns `(balance integer, ledger_id bigint)`.
- Ensure it’s `security definer` and accessible to service role.

---

## Insurance OCR

### Table `insurance_leads`
- Fields used: `id`, `whatsapp`, `file_path`, `raw_ocr`, `extracted`, `extracted_json`, `created_at` (and optionally `status`).
- Migrations ensure `extracted_json` column exists (`20250918000500_insurance_extracted_json.sql`).
- Additional table `insurance_media` referenced in code for storing the original media metadata.

### Storage bucket `insurance`
- Must exist (with folder structure `<lead_id>/<timestamp>_<mediaId>.<ext>`).
- Verify via dashboard or CLI (requires `SUPABASE_ACCESS_TOKEN`).

---

## Matching / Wallet RPC Modules

### `rpc/match.ts`
- Contains wrappers `rpcMatchDriversForTrip(tripId, limit)` etc. – currently call legacy RPC (`match_drivers_for_trip`). Update to call `_v2` functions or confirm both exist.
- **Gap**: wrapper not yet updated to new `_v2` signature; plan to adjust in Phase 6.

### `rpc/nearby.ts`
- Defines queries `rpcNearbyDriversByVehicle`, `rpcNearbyPassengersByVehicle`, and status markers (`markServedDriver`, etc.).
- Verify functions exist with appropriate definitions.

---

## Index & Constraint Checklist

| Table | Recommended Index / Constraint | Status |
|-------|--------------------------------|--------|
| `trips` | `status`, `role`, `vehicle_type`, `created_at`, `pickup` GiST, `dropoff` GiST | Expect present via migrations `_match_trip_fix.sql` (confirm). |
| `baskets` | `join_token` unique | Check; add if missing. |
| `basket_members` | `(basket_id, user_id)` unique | Check. |
| `referral_links` | `code` unique, `user_id` primary key | Check. |
| `referral_attributions` | `joiner_user_id` unique | Should exist; confirm. |
| `wallet_ledger` | `(user_id, created_at)` index | Recommended for pagination; confirm presence/plan addition. |
| `insurance_leads` | `(whatsapp, created_at)` optional index | Useful for analytics; confirm later. |

---

## RLS & Security

- Service role (edge function) bypasses RLS; client apps must respect RLS policies on tables like `trips`, `baskets`, `wallets` if accessed client-side.
- Confirm RLS policies exist for `profiles`, `chat_state`, `trips`, etc. (not inspectable here—check via dashboard or SQL).

---

## Outstanding Actions

1. **Direct DB snapshot** (via Supabase dashboard or `supabase db remote commit`) to confirm the table definitions above.
2. **Update match RPC wrappers** to use `_v2` functions or ensure fallbacks.
3. **Indexes/Constraints**: add missing ones (especially `wallet_ledger (user_id, created_at)`).
4. **Storage bucket**: confirm existence and permissions for `insurance`.
5. **Document RLS and functions**: for Phase 5 security review.

---

## SQL Verification Snippets (for dashboard)

```sql
-- Quick check of trips schema
display select column_name, data_type from information_schema.columns where table_name='trips';

-- Ensure match RPC returns rows for a known trip
select * from match_drivers_for_trip_v2('<trip_uuid>', 9, true);
select * from match_passengers_for_trip_v2('<trip_uuid>', 9, true);

-- Wallet ledger count & last entries
select user_id, delta_tokens, type, created_at from wallet_ledger order by created_at desc limit 20;

-- Insurance leads sanity
select id, whatsapp, file_path, jsonb_pretty(extracted_json) from insurance_leads order by created_at desc limit 5;
```

---

**Conclusion:** The schema inferred from code and migrations supports all major flows (matching, marketplace, baskets, wallet/referrals, insurance). Direct verification on the Supabase backend is required to confirm exact column types, indexes, and RLS policies, and to ensure new `_v2` RPCs are deployed. Use this document as a checklist when performing the live audit in Supabase Studio.


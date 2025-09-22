# WA Workflow Test Runbook

This runbook explains how to replay WhatsApp webhook payloads against the local Supabase Edge function or staging endpoint to validate each workflow. The JSON fixtures live in `tests/wa/payloads/`.

## Prerequisites
- Supabase CLI 2.40.7+
- Deno 2.4+
- Environment variables configured (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WA_*`, `OPENAI_API_KEY`).
- Optional: ngrok tunnel if testing against a remote staging webhook.

## Local Serve Instructions
1. From repo root, run: `supabase functions serve wa-webhook` (ensure env vars loaded or `.env`).
2. The serve command prints a local URL (default `http://localhost:54321/functions/v1/wa-webhook`).
3. For each payload:
   ```bash
   curl -sS \
     -X POST \
     -H "Content-Type: application/json" \
     --data @tests/wa/payloads/<file>.json \
     http://localhost:54321/functions/v1/wa-webhook
   ```
4. Observe console logs for match counts / OCR responses and capture DB changes via Supabase Studio or `supabase db remote commit`.

## Scenarios & Expected Outcomes

| # | Payload | Flow | Expected State & Side Effects |
|---|---------|------|--------------------------------|
| 1 | `01_nearby_list_select.json` | Nearby → Drivers | State updates to `near_vehicle_choice_drivers`; next list prompts vehicle options. |
| 2 | `02_schedule_passenger_pickup.json` | Schedule (passenger) | Inserts `trips` row (`role='passenger'`); immediately shows driver matches (list with `mtch_`). |
| 3 | `03_schedule_driver_pickup.json` | Schedule (driver) | Inserts driver trip; shows passenger matches. |
| 4 | `04_schedule_skip_dropoff.json` | Skip drop-off | Re-runs match display without drop-off; logs fallback radius if needed. |
| 5 | `05_marketplace_add_flow.json` + `05b_marketplace_name_text.json` | Marketplace add | Sets `await_business_name`; storing business record after location (follow with location payload). |
| 6 | `06_baskets_entry.json` + `06b_basket_join_token_text.json` | Baskets create/join | Presents create/view options; text `JB:token` joins member. DB: new row in `basket_members`. |
| 7 | `07_momo_qr_enter_number.json` + `07b_momo_qr_number_text.json` | MoMo QR | Validates number, prompts amount, logs request in `momo_qr_requests`, sends QR image/USSD/tel link. |
| 8 | `08_insurance_image.json` | Insurance OCR | Uploads media, runs OCR, stores `raw_ocr` & `extracted_json`, replies with summary, notifies `insurance_admin_numbers`. |
| 9 | `09_referral_inbound.json` | Referrals | If phone is new, creates profile, records attribution, credits sharer +10 tokens, updates wallet, notifies sharer. |
|10 | `10_wallet_redeem_confirm.json` | Wallet redeem | Deducts tokens via `wallet_apply_delta`, writes redemption row, sends delivery text. |
|11 | `11_wallet_top_promoters_week.json` | Top promoters | Renders leaderboard for selected window; includes “You” rank. |
|12 | `12_stop_command.json` + `12b_start_command.json` | STOP/START | Updates `contacts` opt-in/out flags; responses confirm status. |

## Post-run Verification
- **Database snapshots**: check relevant tables (`trips`, `referral_attributions`, `wallet_ledger`, `insurance_leads`, `basket_members`, `momo_qr_requests`).
- **Logs**: confirm `MATCHES`, `INSURANCE_OCR_RAW`, `REFERRAL_ATTRIBUTION`, `WALLET_APPLY_DELTA`, `REDEEM_SUCCESS` entries.
- **Outbound messages**: inspect console output (local serve) or WhatsApp sandbox to ensure copy matches expectations and list row titles ≤ 24 chars.

## Notes
- Some flows require chained payloads (list selection → text → location). Replay fixtures in chronological order, adjusting timestamps if the function enforces ordering.
- For insurance OCR, replace `INSURANCE_MEDIA_ID` with a valid media ID when hitting production/staging.
- Engage staging or production cautiously—referral/ledger flows modify real balances; consider test accounts.


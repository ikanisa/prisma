# Workflow Verification Results

> Status: **pending manual execution**. Payload fixtures and runbook prepared under `tests/wa/`. Results table to be completed once scenarios are replayed against local/staging environments.

| # | Scenario | Fixture(s) | Status | Evidence |
|---|----------|------------|--------|----------|
| 1 | Nearby drivers list | `01_nearby_list_select.json` | ☐ Pending | Attach console log + DB snapshot |
| 2 | Schedule (passenger) pickup → matches | `02_schedule_passenger_pickup.json` (+ follow-up vehicle selection) | ☐ Pending |  |
| 3 | Schedule (driver) pickup → matches | `03_schedule_driver_pickup.json` | ☐ Pending |  |
| 4 | Skip drop-off still shows matches | `04_schedule_skip_dropoff.json` | ☐ Pending |  |
| 5 | Marketplace add flow | `05_marketplace_add_flow.json`, `05b_marketplace_name_text.json`, location payload | ☐ Pending |  |
| 6 | Baskets create/join | `06_baskets_entry.json`, `06b_basket_join_token_text.json` | ☐ Pending |  |
| 7 | MoMo QR | `07_momo_qr_enter_number.json`, `07b_momo_qr_number_text.json` | ☐ Pending |  |
| 8 | Insurance OCR (image/document) | `08_insurance_image.json` | ☐ Pending |  |
| 9 | Wallet referral credit | `09_referral_inbound.json` | ☐ Pending |  |
|10 | Wallet redeem Engen voucher | `10_wallet_redeem_confirm.json` | ☐ Pending |  |
|11 | Top promoters filters | `11_wallet_top_promoters_week.json` | ☐ Pending |  |
|12 | STOP / START opt-outs | `12_stop_command.json`, `12b_start_command.json` | ☐ Pending |  |

Update this table with **PASS/FAIL**, timestamps, console excerpts, and database snapshots once the tests are executed.


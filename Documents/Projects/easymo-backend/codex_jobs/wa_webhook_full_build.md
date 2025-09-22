here's a single, copy-pastable "OpenAI Codex CLI job description" you can feed to your automation to write the entire wa-webhook Edge Function (modular), generate all files, wire every flow, run locally, and deploy.

How to use this spec

save it as easymo-backend/codex_jobs/wa_webhook_full_build.md

run your Codex CLI with this file as input (whatever your wrapper command is).
Example:

cd ~/easymo-backend
mkdir -p codex_jobs
$EDITOR codex_jobs/wa_webhook_full_build.md
# paste everything below into that file, save
codex run codex_jobs/wa_webhook_full_build.md


Codex should generate files under supabase/functions/wa-webhook/**, then run the serve command, then deploy.

OpenAI Codex CLI Job: Build & Deploy wa-webhook (modular, all flows)
Project & Paths (absolute, no placeholders)

Repo root: ~/easymo-backend

Edge Function: ~/easymo-backend/supabase/functions/wa-webhook

Job file (this spec): ~/easymo-backend/codex_jobs/wa_webhook_full_build.md

Target Runtime & Tooling

Deno (Supabase Edge Functions)

Supabase CLI available on PATH

No Node build step (pure TypeScript ESM in Deno)

Only external lib: @supabase/supabase-js@2.57.2

Environment Variables (read at runtime)

Exactly these keys:

SUPABASE_URL

SUPABASE_SERVICE_ROLE_KEY

WA_TOKEN (WhatsApp Cloud API token)

WA_PHONE_ID (e.g., 123456789012345)

WA_APP_SECRET (for webhook signature verification)

OPENAI_API_KEY (for Insurance OCR; optional but supported)

WA_VERIFY_TOKEN (GET challenge)

From DB config (row id=1 in app_config): WA_BOT_NUMBER_E164 must exist (e.g., +2507xxxxxxxx) so share deep-link works.

Database & RPCs (use AS-IS; do not rename)

Tables the code reads/writes (must exist already):

profiles( user_id uuid PK, whatsapp_e164 text unique )

wa_events( wa_message_id text PK )

chat_state( user_id uuid PK, state jsonb, updated_at timestamptz )

contacts( msisdn_e164 text PK, opted_out bool, opted_in bool, attributes jsonb, opt_in_ts, opt_out_ts )

Trips & Served

trips( id uuid PK, creator_user_id uuid, role text, vehicle_type text, pickup geometry(Point,4326), dropoff geometry(Point,4326) null, status text, created_at timestamptz )

served_drivers( viewer_passenger_msisdn text, driver_contact_id uuid, expires_at timestamptz, created_at )

served_passengers( viewer_driver_msisdn text, passenger_trip_id uuid, expires_at timestamptz, created_at )

Marketplace

marketplace_categories( id bigint PK, name text, sort_order int, is_active bool )

businesses( id uuid PK, owner_whatsapp text, category_id bigint, name text, description text, catalog_url text, geo geometry(Point,4326), is_active bool )

Baskets (full feature back in)

baskets( id uuid PK, name text, description text, type text, status text, creator_id uuid, public_slug text, momo_target text null, momo_is_code bool null, created_at )

basket_members( basket_id uuid, user_id uuid, joined_at timestamptz, total_contributed numeric )

Insurance OCR

insurance_leads( id uuid PK, whatsapp text, file_path text, raw_ocr jsonb, extracted jsonb )

insurance_media( id uuid PK, lead_id uuid, wa_media_id text, storage_path text, mime_type text )

storage bucket insurance exists

MoMo QR logs

momo_qr_requests( id uuid PK, user_id uuid, whatsapp_e164 text, kind text, momo_value text, amount_rwf numeric, ussd_text text, tel_uri text, qr_url text, share_url text, created_at )

App config

app_config( id int PK, insurance_admin_numbers text[], momo_qr_logo_url text, WA_BOT_NUMBER_E164 text )

RPCs (must exist and be called exactly):

nearby_drivers_by_vehicle(_lat float8, _lon float8, _viewer text, _vehicle text, _limit int)

nearby_passengers_by_vehicle(_lat float8, _lon float8, _viewer text, _vehicle text, _limit int)

nearby_businesses(_lat float8, _lon float8, _viewer text, _limit int)

match_drivers_for_trip(_trip_id uuid, _limit int)

match_passengers_for_trip(_trip_id uuid, _limit int)

Do not change any schema/RPC names. If optional tables are missing at runtime (like momo_qr_requests), fail gracefully: log to console and continue user flow.

Functional Scope (must be implemented end-to-end)

Home menu (list) + a second interactive "Love easyMO??? Share it!" button message that returns a deep-link and QR opening a chat with our bot and prefilled home.

Nearby Drivers / Passengers (vehicle-first): vehicle choice -> ask for location -> call vehicle-aware RPC -> list results -> tap -> open wa.me contact.

Schedule Trip: role -> vehicle -> pickup save -> prompt "Add Drop-off / Skip" -> if add: save dropoff -> fetch matches via RPC -> list -> tap -> wa.me contact.

Marketplace: create business (name -> desc -> optional catalog -> share location) + discover businesses (category -> share location -> list) + actions fixed:

View Catalog -> send URL

Contact -> send wa.me link for owner

Baskets: full flow (view, create, join, leave, close, contribute approval) same behaviour as original monolith. Use stable IDs you already used (e.g., b_, bk_*).

Insurance OCR: receive image/pdf, upload to storage, OpenAI OCR (JSON only), save, summarize to user and admins.

MoMo QR: choose number/code -> accept input -> optional amount -> send QR image (QuickChart) FIRST, then USSD/tel/share lines, then "Generate another" buttons. Log request row.

Non-negotiable UX Rules

Share CTA: Immediately after Home menu list, send button interactive:

Body: Love easyMO??? Share it!

Buttons: share_open -> on click send:

https://wa.me/<BOT_DIGITS>?text=home (BOT_DIGITS from app_config.WA_BOT_NUMBER_E164 stripped of +)

QR for the same link via QuickChart

MoMo QR image ordering: Always send the image first, in a separate sendImageUrl call; then send the USSD lines in a sendText call; then "Generate another" via sendButtons.

Marketplace actions: No fallback. biz_contact_<id> must send https://wa.me/<digits>. biz_catalog_<id> must send the URL.

Schedule trip save: Insert trip before prompting for drop-off. Use pickup = SRID=4326;POINT(lon lat) and status='open'.

Vehicle-first nearby: States and ids as below; filter by vehicle param through RPCs.

Graceful errors: if any table/RPC missing -> catch, log, and send a helpful message; do not crash function.

State Machine (keys & payloads)

Do not rename any existing keys you detect in the monolith; only extend with these:

near_vehicle_choice_drivers

near_vehicle_choice_pax

near_await_loc_drivers { vehicle_type }

near_await_loc_passengers { vehicle_type }

await_schedule_role

await_schedule_vehicle { role }

await_schedule_pickup { role, vehicle_type }

sched_prompt_drop_cta { trip_id, role }

sched_await_drop { trip_id, role }

await_market_option

await_market_category { category_id }

await_business_name { category_id }

await_business_desc { ... }

await_business_catalog { ... }

await_business_location { ... }

await_market_see_category { category_id }

await_market_see_loc { category_id, results, lat, lon }

await_match_select { role, list }

Baskets: keep basket_ctx, await_basket_name, await_basket_desc, await_basket_type, await_basket_momo, await_basket_confirm, await_contrib_amount

ins_wait_doc

momoqr_start, momoqr_await_number, momoqr_await_code, momoqr_await_amount

Stable Button/List Reply IDs (prefixes)

Use exactly these (some already exist):

Home: see_drivers, see_passengers, schedule_trip, marketplace, baskets, motor_insurance, momoqr_start

Global: back_home

Nearby vehicle picks: near_v_drv_moto|cab|lifan|truck|others, near_v_pax_*

Schedule: role_passenger, role_driver, veh_*, sched_add_drop, sched_skip_drop

Matches: mtch_<i>_<trip_id>

Marketplace: mk_add, mk_see, cat_<id>, see_cat_<id>, biz_<i>_<uuid>, biz_catalog_<uuid>, biz_contact_<uuid>, biz_catalog_skip

Baskets (unchanged): b_<id>, bk_det_<id>, bk_cont_<id>, bk_share_<id>, bk_qr_<id>, bk_mems_<id>_<page>, bk_join_<id>, bk_leave_<id>, bk_close_<id>, approvals bk_appr_*, bk_rej_*

QR: mqr_use_wa, mqr_enter_num, mqr_enter_code, mqr_amt_skip, mqr_again

Share CTA button: share_open

File/Module Layout (must be created)

Create all these files with working code. Use imports from the versions shown.

supabase/functions/wa-webhook/
  deps.ts
  config.ts
  index.ts

  wa/
    client.ts
    verify.ts
    ids.ts

  state/
    types.ts
    store.ts
    idempotency.ts

  utils/
    text.ts
    phone.ts
    media.ts
    share.ts

  rpc/
    nearby.ts
    match.ts
    marketplace.ts

  flows/
    home.ts
    nearby.ts
    schedule.ts
    marketplace.ts
    basket.ts
    qr.ts
    insurance.ts

  router/
    guards.ts
    router.ts

What each file must contain (high-level, with required exports)

deps.ts

Re-export serve from Deno std 0.177.0 and createClient, SupabaseClient from supabase-js 2.57.2.

config.ts

Read envs listed above.

Export sb = createClient(SUPABASE_URL, SERVICE_KEY).

getAppConfig() -> select insurance_admin_numbers, momo_qr_logo_url, WA_BOT_NUMBER_E164 from app_config where id=1.

wa/client.ts

waSend(path, payload)

sendText(to, body)

sendButtons(to, body, buttons[])

sendList(to, opts) (with header/body/footer and <=10 rows)

sendImageUrl(to, link, caption?)

WA_BASE computed from WA_PHONE_ID

All functions return JSON or throw on non-OK.

wa/verify.ts

HMAC SHA256 verification against WA_APP_SECRET (constant-time compare).

verifySignature(req, raw): Promise<boolean>

wa/ids.ts

Export a struct IDS with every id/prefix listed above.

state/types.ts

ChatState, Ctx, Handler types.

state/store.ts

ensureProfile(sb, phone): Promise<{user_id,...}> (upsert by whatsapp_e164 if missing)

getState(sb, user_id): Promise<ChatState>

setState(sb, user_id, key, data?)

clearState(sb, user_id)

state/idempotency.ts

idempotent(sb, wa_message_id): Promise<boolean> inserting into wa_events.

utils/text.ts

safeRowTitle, safeRowDesc, safeButtonTitle, fmtKm, timeAgo

utils/phone.ts

e164(s), to07FromE164(e)

utils/media.ts

fetchWAMedia(metaId) via Graph API (two-step download)

extOf(mime)

utils/share.ts

buildShareLink(prefill="home"): get WA_BOT_NUMBER_E164, return https://wa.me/<digits>?text=<prefill>

buildShareQR(prefill="home"): use QuickChart on the link

rpc/nearby.ts

rpcNearbyDriversByVehicle(lat, lon, viewer, vehicle, limit?)

rpcNearbyPassengersByVehicle(lat, lon, viewer, vehicle, limit?)

rpcNearbyBusinesses(lat, lon, viewer, limit?)

markServedDriver(viewerMsisdn, driverUserId)

markServedPassenger(viewerMsisdn, tripId)

rpc/match.ts

rpcMatchDriversForTrip(tripId, limit?)

rpcMatchPassengersForTrip(tripId, limit?)

rpc/marketplace.ts

Convenience reads for categories and businesses by ids used in flows.

flows/home.ts

sendHome(ctx) -> send the Home list.

Immediately afterwards, send Share CTA buttons (share_open).

Handler set:

List: reacts to home menu ids (see_drivers, see_passengers, schedule_trip, marketplace, baskets, motor_insurance, momoqr_start)

Button: on share_open -> send deep-link + QR (from utils/share.ts)

export const listHandlers, buttonHandlers, etc., or a combined object that router will import.

flows/nearby.ts

Vehicle-first lists for drivers & passengers; on vehicle click set near_await_loc_* and ask for location.

On location, call the respective RPC with vehicle filter -> show list with stable row ids drv_<i>, pax_<i>.

On row click, resolve contact WA and send wa.me link; mark served.

flows/schedule.ts

Role -> vehicle -> pickup insert into trips (status='open') -> set sched_prompt_drop_cta {trip_id, role} and send buttons sched_add_drop / sched_skip_drop.

On sched_add_drop: set sched_await_drop and ask for location; save dropoff as POINT(lon lat).

After dropoff save or after skip, call match RPC by role and render mtch_<i>_<trip_id> rows.

On match row click, open wa.me to matched creator.

flows/marketplace.ts

Create flow: category -> name -> desc -> catalog (or biz_catalog_skip) -> location save row in businesses.

Discover flow: category -> ask location -> call rpcNearbyBusinesses -> filter by category -> list biz_<i>_<uuid>.

Actions fix:

biz_contact_<id> -> fetch owner_whatsapp -> send https://wa.me/<digits>

biz_catalog_<id> -> send raw catalog_url

All states saved exactly as in earlier monolith.

flows/basket.ts

Re-add full basket flow you had originally (view, create, join, leave, close, members paging, contribute approvals). Use the same IDs and behaviours.

Post-create copy:

Public: "Basket created and sent for review..." (and share/QR CTAs when approved)

Private: "✅ Basket created! ..." with actions.

Deeplink token: JOIN_BASKET:<slugOrId> copy + QuickChart QR.

Keep global text listener: if a user sends JOIN_BASKET:<token>, join them to the right basket.

flows/qr.ts

Entry list for QR (use WA number / enter number / enter code), number & code validators.

On amount step:

If skip: call generateAndSendMomoQR(kind, value, null)

Else: call with numeric amount.

generateAndSendMomoQR must:

Build USSD with *182*1*1*<number>(*amount)# (or *182*8*1*<code>(*amount)#)

Build tel: URI

Build QuickChart PNG URL

Send image FIRST (sendImageUrl)

Then send text (USSD, Tap to dial: tel:..., Share: tel:...)

Then send buttons (mqr_again, back_home)

Log row in momo_qr_requests (best-effort try/catch)

flows/insurance.ts

Handle ins_wait_doc + image/document:

Download via Graph API, upload to insurance bucket, record insurance_media

Create/Update insurance_leads

OCR via OpenAI (gpt-4o-mini), response JSON only

Normalize + show user summary; notify admins from app_config.insurance_admin_numbers.

router/guards.ts

STOP/START handling and contacts upsert (last inbound timestamp).

"home/menu" text -> clear state & sendHome.

"back_home" button -> clear & sendHome.

Return boolean if guard handled the message.

router/router.ts

Route order: Insurance media -> list replies -> button replies -> location -> text.

Import handler arrays from flows (home, nearby, schedule, marketplace, basket, qr, insurance) and run them in a fixed order.

If nothing handles -> generic fallback with back_home button.

index.ts

GET verify using WA_VERIFY_TOKEN.

POST:

Verify HMAC signature (wa/verify.ts).

Parse payload, fetch messages[0].

Idempotency check (wa_events).

Ensure profile (by whatsapp_e164).

Fetch state.

Run guards; if handled, return.

Run router; return.

Coding Standards

Use only the imports/versions specified.

No global variables other than env constants.

Every DB/HTTP call must be wrapped in try/catch where user-facing messaging depends on it.

All interactive IDs/titles must be safeButtonTitle/safeRowTitle limited to 20/24 chars respectively.

Do not exceed 10 rows in a WhatsApp list section.

Never block on non-critical logging (don't await where not needed).

All geometry literals are SRID=4326;POINT(lon lat).

Local Run & Deploy (Codex must execute these)

From repo root:

# 1) create folders
mkdir -p supabase/functions/wa-webhook/{router,wa,state,rpc,flows,utils}

# 2) write all files exactly as specified above (Codex: generate code now)

# 3) env for local serve
test -f supabase/.env && echo "OK" || (echo "Missing supabase/.env" && exit 1)

# 4) start function locally
supabase functions serve wa-webhook --env-file supabase/.env

# 5) after successful smoke test, deploy:
supabase functions deploy wa-webhook --project-ref $(jq -r .project_ref supabase/config.toml 2>/dev/null || echo "")


The serve step should print an endpoint like http://127.0.0.1:54321/functions/v1/wa-webhook. You can use Meta's "Test Webhook" to ping it.

Smoke Tests (Codex must run them or print how to)

Home + Share CTA: After sending any text, you should receive the menu list and a second message with the "Love easyMO??? Share it!" button. Tapping it sends a wa.me link with ?text=home and a QR image.

MoMo QR: MoMo QR Code -> "Use this number" -> "Skip amount" -> receive image first then the USSD/tel lines and buttons.

Marketplace Actions: Discover a business, tap Contact -> receive wa.me link; tap View Catalog -> receive the catalog URL.

Schedule: Role -> vehicle -> send location -> receive Add Drop-off / Skip. Choose either and verify matches list appears if RPC returns rows.

Nearby vehicle-first: Choose Moto -> send location -> list drivers/passengers filtered by Moto.

Baskets: Create public/private; test JOIN_BASKET token, approve/reject contributions.

Insurance: Send an image; verify OCR summary; verify admin notifications.

Acceptance Criteria (must pass before deploy)

QR image reliably delivered (no fallback replacing it with text).

Share CTA always shows after Home; link opens chat to our bot with prefilled "home".

Marketplace action buttons never hit generic fallback.

Trips are saved with correct geometry and matches show when data exists.

No unhandled promise rejections in logs.

No breaking changes to existing IDs/states; everything additive.

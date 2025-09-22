# Inventory Map – easyMO WhatsApp Edge Function (`wa-webhook`)

## Entry Points
- `index.ts`: handles GET verification, POST webhook (HMAC verify, idempotency, profile ensure, state load, referral intercept, global guard, router dispatch).
- `handleDemoShare`: send share buttons/QR for demo payloads.

## Global Guards
- `router/guards.ts`: STOP/START, HOME/menu/back.

## Router (`router/router.ts`)
1. Insurance media pre-check before interactive handlers.
2. List handlers in order: wallet → wallet extras → motor insurance → marketplace → MoMo → baskets → nearby drivers/passengers → schedule → marketplace category → nearby vehicle choice → schedule vehicle → marketplace actions → nearby selections → schedule matches → MoMo list → basket lists → wallet redeem item → schedule role fallback → home menu fallback.
3. Button handlers: share_home, share again/rules → wallet actions (earn/txns/redeem/pagination/top filters/settings) → marketplace (`mk_*`) → MoMo (`mqr_*`) → basket type/actions → schedule drop controls → marketplace skip/contact.
4. Location handlers: nearby drivers/passengers, schedule pickup/drop, marketplace location.
5. Text handlers: basket command/Join, MoMo prompts, insurance prompts, wallet settings; then marketplace text states.
6. Fallback sends “Back to Menu”.

## Flow Modules
- `flows/home.ts`: Home menu, share link.
- `flows/nearby.ts`: vehicle selection, location, list results, contact.
- `flows/schedule.ts`: role/vehicle/pickup/drop/match insertion, list display, selection.
- `flows/marketplace.ts`: add (category → name → desc → catalog → location) & discover.
- `flows/basket.ts`: create/view/join, QR, share tokens, contributions.
- `flows/qr.ts`: MoMo QR generation, logging.
- `flows/insurance.ts`: OCR upload, storage, OpenAI parse, admin notify.
- `flows/wallet.ts`: start, earn/share, rules, transactions, redeem, leaderboard, settings.
- `flows/referral.ts`: REF code intake, wallet credit, notifications.

## Utilities / Services
- `utils/text.ts`: trimming helpers.
- `utils/share.ts`: share links, digits.
- `rpc/*`: wrappers for matching, marketplace, etc.
- `services/*`: leaderboard, referrals, wallet (ledger/RPC), profile settings.


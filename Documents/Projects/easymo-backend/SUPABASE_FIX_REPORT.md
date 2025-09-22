# SUPABASE_FIX_REPORT

## Detected problems
- **Routing** – `supabase/functions/wa-webhook/index.ts:63-99` only handles `msg.type === "text"` and exits for every other message. Interactive list/button replies never reach marketplace, schedule, or basket handlers, and the second `sendHomeMenu2` declaration that starts at `index.ts:158` never closes, so the router from the previous build is entirely missing.
- **QR image order** – `supabase/functions/wa-webhook/index.ts:80-83` references `parts` and `amt` that are out of scope in the `qrcode` branch, throwing a `ReferenceError` before a QR image can be generated.
- **Deep-linking** – the fallback text in `supabase/functions/wa-webhook/index.ts:151-152` interpolates `WA_BOT_NUMBER_E164`, but that constant is never defined in the file, so the deep-link fallback crashes with `ReferenceError`.
- **Marketplace actions** – with only the text branch left (`index.ts:63-99`), selections such as `marketplace` or `basket_view` are ignored and the marketplace helpers from the preserved `wa-webhook.local.*` build are absent, so marketplace actions cannot run.
- **Schedule flow** – the schedule triggers rely on the interactive router that is now missing; there is no code handling `schedule_trip` selections in `index.ts:63-99`.
- **Idempotency** – the handler never inspects `msg.id` or persists processed message IDs (`index.ts:58-99`), so repeated deliveries re-run side effects; all state/idempotency helpers from the prior implementation are gone.
- **Signature checks** – while HMAC verification remains (`index.ts:20-35`), the new bypass (`index.ts:21-25`) accepts any request with `ALLOW_TEST_UNSIGNED=1` and header `X-Test-Unsigned: 1`. Without environment gating this can disable signature checks in production.
- **Basket flows** – basket list/add/checkout actions are missing because the basket-specific router branches and RPC wrappers from `wa-webhook.local.*` were not carried over (`index.ts:63-99`).
- **Compile blockers** – `sendList`/`sendButtons` are used at `index.ts:108-139` without import, and the duplicate `sendHomeMenu2` definition that begins at `index.ts:158` never closes, so `deno check` fails.

## Minimal additive-only fixes
- Restore the modular router/state/flow logic (marketplace, schedule, basket, QR, onboarding) by porting the additive-safe helpers from `supabase/functions/wa-webhook.local.1758105903/index.ts` into new files under `supabase/functions/wa-webhook/{router,wa,state,rpc,flows,utils}` while keeping existing exports intact.
- Reintroduce the idempotency layer so each WhatsApp message or status is processed once, matching the previous behaviour.
- Import the interactive helpers (`sendList`, `sendButtons`) and define `WA_BOT_NUMBER_E164` in the entrypoint so the “home” fallback can send deep links safely.
- Correct the QR command parsing by defining `parts` and `amount` locally in the `qrcode` branch to keep the QR image/text order working.
- Harden the signature bypass so the `ALLOW_TEST_UNSIGNED` override is only honoured in explicit test environments.
- Replace the duplicate `sendHomeMenu2` snippets with a single exported helper in the new module and have `index.ts` call it, keeping the entrypoint short and valid.

## Deployment commands
- `deno check supabase/functions/wa-webhook/index.ts`
- `supabase functions deploy wa-webhook --project-ref ezrriefbmhiiqfoxgjgz --no-verify-jwt`

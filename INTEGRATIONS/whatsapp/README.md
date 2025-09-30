# WhatsApp OTP Integration

These notes describe the provider-agnostic adapter used for WhatsApp-delivered one-time passwords.

## Environment Variables

Set the following values in the Supabase function environment (never commit actual secrets to the repo):

- `WA_PROVIDER` — identifier for the provider (e.g. `meta`, `twilio`); defaults to `stub`.
- `WA_API_BASE` — HTTPS base URL for the provider API endpoint.
- `WA_PHONE_NUMBER_ID` — sending phone number / business ID provisioned by the provider.
- `WA_PROVIDER_TOKEN` — access token or API key used when sending messages (configured outside the repo).
- Optional: `MFA_OTP_TTL_SECONDS` to override the OTP expiry window (default 300 seconds).

## Edge Functions

- `whatsapp_otp_send` — accepts `{ userId, orgId, whatsappE164 }`, rate-limits issuance, stores the hashed OTP in `mfa_challenges`, logs `MFA_OTP_SENT`, and sends the message via the provider adapter (stubbed with console output for development).
- `whatsapp_otp_verify` — accepts `{ userId, orgId, code }`, checks expiries and attempts, marks `user_profiles.whatsapp_verified = true`, logs `MFA_OTP_VERIFIED` and `WHATSAPP_LINKED`.

Both functions rely on the caller’s Supabase JWT; the service role key is only used server-side via the FastAPI gateway.

## Message Format

```
Your Aurora verification code is {CODE}. It expires in 5 minutes.
```

Modify this template in `supabase/functions/services/whatsapp/otp-send/index.ts` if the provider mandates a specific format.

## Operational Notes

- OTPs are hashed using SHA-256 before storage. Raw codes never leave volatile memory.
- Challenges older than 24 hours are treated as stale for step-up authentication.
- Three failed verification attempts extend the challenge expiry by 10 minutes (lockout) and return `otp_locked`.
- Logging is centralised via `activity_log` with module `IAM`.
- Passwordless login via WhatsApp remains feature-flagged (`auth.whatsapp_passwordless=false`). Implementors can reuse the existing challenge table when enabling the flow.

## Testing

During development you can keep `WA_PROVIDER=stub`. The functions will log payloads to the console instead of calling a real API.

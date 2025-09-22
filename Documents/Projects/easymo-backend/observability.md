# Observability

## Structured Log Events

### Webhook Lifecycle
| Event | Level | Description | Sample |
| --- | --- | --- | --- |
| `WEBHOOK_REQUEST_RECEIVED` | info | Incoming HTTP request metadata. | `{"timestamp":"2024-10-01T12:00:00.000Z","level":"info","event":"WEBHOOK_REQUEST_RECEIVED","requestId":"b897aa4e-0f5a-47ab-a8de-5dca6acb1f16","method":"POST","path":"/wa-webhook"}` |
| `WEBHOOK_BODY_READ` | info | Payload read from WhatsApp webhook with size in bytes. | `{"timestamp":"2024-10-01T12:00:00.010Z","level":"info","event":"WEBHOOK_BODY_READ","requestId":"b897aa4e-0f5a-47ab-a8de-5dca6acb1f16","bytes":1432}` |
| `SIG_VERIFY_FAIL` | warn | HMAC verification failed for the request. | `{"timestamp":"2024-10-01T12:00:00.015Z","level":"warn","event":"SIG_VERIFY_FAIL","requestId":"b897aa4e-0f5a-47ab-a8de-5dca6acb1f16"}` |
| `WEBHOOK_MESSAGE_CONTEXT` | info | Normalized message metadata after idempotency. | `{"timestamp":"2024-10-01T12:00:00.030Z","level":"info","event":"WEBHOOK_MESSAGE_CONTEXT","requestId":"b897aa4e-0f5a-47ab-a8de-5dca6acb1f16","messageId":"wamid.HBgL...","from":"+2507XXXXXXX","type":"text"}` |
| `WEBHOOK_RESPONSE` | info | Outbound response status and handler attribution. | `{"timestamp":"2024-10-01T12:00:00.120Z","level":"info","event":"WEBHOOK_RESPONSE","requestId":"b897aa4e-0f5a-47ab-a8de-5dca6acb1f16","status":200,"durationMs":92,"handledBy":"router","userId":"uuid-user"}` |

### Routing & Guards
| Event | Level | Description | Sample |
| --- | --- | --- | --- |
| `ROUTE` | info | Route selection with flow identifier. | `{"timestamp":"2024-10-01T12:00:00.050Z","level":"info","event":"ROUTE","userId":"uuid-user","flow":"wallet_redeem"}` |
| `ROUTE_FALLBACK` | warn | Router could not match a handler and sent fallback buttons. | `{"timestamp":"2024-10-01T12:00:00.055Z","level":"warn","event":"ROUTE_FALLBACK","requestId":"b897aa4e-0f5a-47ab-a8de-5dca6acb1f16","userId":"uuid-user"}` |
| `GUARD_OPT_OUT` | info | User issued STOP/UNSUBSCRIBE and was opted out. | `{"timestamp":"2024-10-01T12:00:00.040Z","level":"info","event":"GUARD_OPT_OUT","userId":"uuid-user","phone":"+2507XXXXXXX"}` |

### External RPC & APIs
| Event | Level | Description | Sample |
| --- | --- | --- | --- |
| `RPC_NEARBY_DRIVERS_OK` | info | Nearby drivers RPC succeeded with result count. | `{"timestamp":"2024-10-01T12:00:00.060Z","level":"info","event":"RPC_NEARBY_DRIVERS_OK","viewer":"+2507XXXXXXX","vehicle":"moto","count":4,"limit":10}` |
| `RPC_MATCH_DRIVERS_FAILED` | error | Matching RPC failed; includes trip context. | `{"timestamp":"2024-10-01T12:00:00.061Z","level":"error","event":"RPC_MATCH_DRIVERS_FAILED","tripId":"trip-123","limit":5,"error":{"message":"function match_drivers_for_trip() does not exist"}}` |
| `INSURANCE_OPENAI_HTTP_ERROR` | error | OCR call to OpenAI failed; captures HTTP status. | `{"timestamp":"2024-10-01T12:00:00.070Z","level":"error","event":"INSURANCE_OPENAI_HTTP_ERROR","status":429,"error":{"body":"{\"error\":\"rate_limit\"}"}}` |
| `INSURANCE_OCR_RESULT` | info | OCR pipeline completed with field availability flags. | `{"timestamp":"2024-10-01T12:00:00.090Z","level":"info","event":"INSURANCE_OCR_RESULT","leadId":"lead-123","hasRaw":true,"hasExtracted":true}` |
| `WHATSAPP_SEND_FAILED` | error | WhatsApp Graph API send failed. | `{"timestamp":"2024-10-01T12:00:00.095Z","level":"error","event":"WHATSAPP_SEND_FAILED","path":"messages","status":500,"error":{"body":"{\"error\":...}"}}` |

### Referral & Wallet Flows
| Event | Level | Description | Sample |
| --- | --- | --- | --- |
| `REFERRAL_WALLET_CREDITED` | info | Sharer wallet credited for a referral. | `{"timestamp":"2024-10-01T12:00:00.110Z","level":"info","event":"REFERRAL_WALLET_CREDITED","sharerUserId":"uuid-sharer","joinerUserId":"uuid-joiner","code":"abc123","tokens":10,"balance":120}` |
| `REFERRAL_WELCOME_BONUS_FAILED` | error | Welcome bonus grant to joiner failed. | `{"timestamp":"2024-10-01T12:00:00.111Z","level":"error","event":"REFERRAL_WELCOME_BONUS_FAILED","joinerUserId":"uuid-joiner","code":"abc123","error":{"message":"wallet_apply_delta failed"}}` |
| `REDEMPTION_CONFIRM_ATTEMPT` | info | User confirmed redemption; cost captured. | `{"timestamp":"2024-10-01T12:00:00.112Z","level":"info","event":"REDEMPTION_CONFIRM_ATTEMPT","userId":"uuid-user","rewardId":"reward-1","cost":50}` |
| `REDEMPTION_SUCCESS` | info | Redemption fulfilled with updated balance. | `{"timestamp":"2024-10-01T12:00:00.115Z","level":"info","event":"REDEMPTION_SUCCESS","userId":"uuid-user","rewardId":"reward-1","cost":50,"balance":100}` |
| `WALLET_REDEMPTION_RECORDED` | info | Redemption persisted to `wallet_redemptions`. | `{"timestamp":"2024-10-01T12:00:00.116Z","level":"info","event":"WALLET_REDEMPTION_RECORDED","redemptionId":"uuid-redemption","userId":"uuid-user","rewardId":"reward-1","costTokens":50}` |

### Health & Admin
| Event | Level | Description | Sample |
| --- | --- | --- | --- |
| `HEALTH_RESULT` | info | `/health` self-check summary. | `{"timestamp":"2024-10-01T12:00:00.005Z","level":"info","event":"HEALTH_RESULT","ok":true,"env":{"missing":[]},"appConfig":{"ok":true},"storage":{"ok":true},"openai":{"configured":false}}` |
| `HEALTH_STORAGE_FAIL` | error | Storage bucket probe failed. | `{"timestamp":"2024-10-01T12:00:00.006Z","level":"error","event":"HEALTH_STORAGE_FAIL","error":{"message":"bucket not found"}}` |

## Health Endpoint
- `GET /health` responds with the JSON payload above and validates:
  - Required environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WA_TOKEN`, `WA_PHONE_ID`, `WA_VERIFY_TOKEN`).
  - Presence of `app_config` row `id=1`.
  - Read access to the `insurance` storage bucket.
  - Reports whether `OPENAI_API_KEY` is currently configured.

## TODO / Gaps
- Basket contributions, QR flows, leaderboard notifications, and profile update flows still emit legacy `console.error` logs. Migrate them to `logError`/`logInfo` to align with the structured logger.
- Consider adding correlation metadata (e.g., `requestId`) to downstream context objects so nested flows can enrich logs automatically.
- Add synthetic tests that assert log emission for high-value scenarios (referral credit, redemption success) once automated log capture is available.

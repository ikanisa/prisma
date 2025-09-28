# Logging and Monitoring

This project uses [pino](https://github.com/pinojs/pino) for structured logging. The log level is controlled via the `LOG_LEVEL` environment variable.

Each request log includes the following fields:

- `reqId` – unique request identifier
- `eventId` – provided via the `x-event-id` header
- `userId` – provided via the `x-user-id` header

## Health Check

The server exposes a `/health` endpoint that validates:

- required environment variables
- ability to resolve DNS for `example.com`
- system clock drift against [worldtimeapi.org](https://worldtimeapi.org)

The endpoint returns JSON describing the results and overall status.

## Alert Webhook

An optional script at `scripts/alert_webhook.ts` posts a JSON payload to `ALERT_WEBHOOK_URL`. Use it to trigger external monitoring or paging systems.

# Gateway Service

This directory contains the Express-based gateway responsible for enforcing
multi-tenant controls before requests reach downstream services. Key features:

- **OrgGuard** – validates organisation scope and role membership from request
  headers before exposing `/v1` routes.
- **express-rate-limit** middleware with optional Redis backing to enforce
  per-org/per-user quotas with standard headers.
- **Idempotency store** that caches successful responses when callers send an
  `X-Idempotency-Key` header.
- **Trace propagation** via `X-Request-ID` and `X-Trace-ID` headers bound to an
  async request context.
- **PII scrubbing** for structured request/response logs, preventing sensitive
  data from leaking into log drains.
- **Strict CORS allow list** driven by the `API_ALLOWED_ORIGINS` environment
  variable, defaulting to local development URLs.

Use `createGatewayServer()` from `src/server.ts` to embed the service or run it
as a standalone process with `node apps/gateway/src/server.ts`.

## Environment

Set `API_ALLOWED_ORIGINS` to a comma-separated list of origins that are
permitted to call the gateway. In development the server falls back to
`http://localhost:3000,http://localhost:5173`. Requests from other origins are
rejected with HTTP 403 and no CORS headers.

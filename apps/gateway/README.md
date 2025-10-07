# Gateway Service

This directory contains the Express-based gateway responsible for enforcing
multi-tenant controls before requests reach downstream services. Key features:

- **OrgGuard** – validates organisation scope and role membership from request
  headers before exposing `/v1` routes.
- **Redis-backed token bucket** (with an in-memory fallback) to rate limit
  per-org/per-user traffic.
- **Idempotency store** that caches successful responses when callers send an
  `X-Idempotency-Key` header.
- **Trace propagation** via `X-Request-ID` and `X-Trace-ID` headers bound to an
  async request context.
- **PII scrubbing** for structured request/response logs, preventing sensitive
  data from leaking into log drains.

Use `createGatewayServer()` from `src/server.ts` to embed the service or run it
as a standalone process with `node apps/gateway/src/server.ts`.

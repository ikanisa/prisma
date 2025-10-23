# Agent Deployment Validation Checklist

Use this checklist before merging to `main` or promoting a deployment to ensure all local and edge integrations remain healthy.

## Build & Dependency Health
- [ ] Run `make deps` and confirm it completes without errors.
- [ ] Run `pnpm build && pnpm start` to verify the production build starts cleanly (stop the dev server afterward).

## Proxy & Networking Verification
- [ ] From a clean terminal, hit the local proxy on port **3000** (Next.js) and confirm API routes respond with HTTP 200/OK.
- [ ] Hit the service proxy on port **8080** (Fastify/gateway) and confirm protected routes respond when authenticated.
- [ ] Validate any configured tunnel (e.g., `cloudflared`, `ngrok`) is connected and forwarding to the correct local ports.

## Edge & Access Controls
- [ ] Review Cloudflare Access policies for the environment; ensure the service domain is listed and the required groups/users have access.
- [ ] Confirm Supabase project settings include the latest frontend origins in the **CORS** allowlist and that preflight requests succeed.

## Sign-off
- [ ] Document the above results in the release ticket, including timestamps and any incident follow-ups.

# Supabase Password Hardening

## Compromised password check
- **Status:** Enabled (production, staging, and local projects)
- **Location:** Supabase Studio → **Authentication** → **Passwords** → "Check for compromised passwords".
- **Reasoning:** Prevents leaked or weak credentials by blocking passwords reported to Have I Been Pwned (HIBP).
- **Configuration:** Managed via `supabase/config.toml` (`[auth.passwords].hibp_enabled = true`) for local development.

### Rollout steps
1. Open each Supabase project (production and staging) in Supabase Studio.
2. Navigate to **Authentication → Passwords**.
3. Toggle **Check for compromised passwords** on and press **Save**.
4. Confirm the UI reports "Enabled"; re-open the page to ensure the toggle persisted.
5. Record the change in the security change log and notify on-call if the toggle was previously off.

### Verification
- Daily on-call runbooks must confirm the toggle remains enabled (see `docs/OPERATIONS/daily-checklist.md`).
- After configuration updates, perform a sample sign-up with a known breached password (e.g. `Password1`) to ensure Supabase rejects it with an HIBP error.
- Audit Supabase logs weekly for `hibp_password_breached` events to track rejected attempts.

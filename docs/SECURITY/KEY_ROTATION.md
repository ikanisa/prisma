# Key Rotation Guide & Runbook

This guide standardizes how we rotate credentials across **Supabase**, **OpenAI**, and **Google Cloud/APIs**. Use the 10-step runbook for any provider, then follow the provider-specific playbook below.

---

## Standard 10-Step Runbook (All Providers)

1. **Inventory**  
   Enumerate apps, services, environments, CI/CD pipelines, and edge workers using the key.

2. **Prepare**  
   Generate a **new** key/token in the provider console. Keep the **old** key active for overlap.

3. **Update Secrets Manager**  
   Store the new value in your secrets source of truth (Vault/1Password/GitHub Actions/Env).  
   _Never_ commit secrets. See `.env.example` for placeholders and naming.

4. **Stage Rollout**  
   Update **staging** environment variables (e.g., `.env`, GitHub Actions secrets, Render/Netlify vars).

5. **Test**  
   Run integration tests and smoke flows. Verify auth, rate limits, and expected quotas.

6. **Schedule Cutover**  
   Pick a low-risk window; notify stakeholders (eng, support, on-call).

7. **Production Rollout**  
   Apply new secrets in **production** and restart/redeploy consuming services.

8. **Monitor**  
   Watch logs, APM, and metrics for 15–60 minutes for auth failures or anomalies.

9. **Revoke Old Key**  
   Once stable, revoke/disable the old key in the provider console.

10. **Document & Calendar**  
   Record date, actor, scope, blast radius, rollback notes. Schedule the next rotation.

---

## Provider Playbooks

### Supabase

1. **Console**: Project → **Project Settings → API**. Record existing keys for rollback plan.
2. **Create**: Rotate **Anon** and **Service Role** keys (and **JWT secret** if required).
3. **Secrets**: Update:
   - `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_PROJECT_ID`
   - Vault path `${SUPABASE_VAULT_PATH}` fields:
     - `service_role_key` → `SUPABASE_SERVICE_ROLE_KEY`
     - `jwt_secret` → `SUPABASE_JWT_SECRET`
4. **CI/CD**: Update GitHub Actions secrets for deploy/migrate jobs.
5. **Redeploy**: Web/API/Edge Functions. (Our functions read from shared client; no per-function overrides needed once Vault is updated.)
6. **Invalidate Sessions**: Clear caches/session stores; restart long-lived workers.
7. **Validate**: CLI login, app login, row-level security behavior.
8. **Revoke Old**: Disable old keys in dashboard.
9. **Monitor**: Errors, auth failures, 401/403 spikes.
10. **Document**: Log rotation and set next review.

**Env hints**
- Browser-exposed vars use `VITE_SUPABASE_*` (public anon key).  
- Server-only keys: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (never in client).

---

### OpenAI

1. **Console**: User → **API Keys**. Note current usage.
2. **Create**: New API key.
3. **Secrets**: Update `OPENAI_API_KEY` (and any rate config like `OPENAI_RPM`).
4. **Rollout**: Stage → test → prod with safe overlap.
5. **Redeploy**: Restart services, workers, jobs, and CI steps consuming the key.
6. **Purge**: Remove locally cached creds; rotate any SDK tokens if applicable.
7. **Revoke Old**: Delete old key in console.
8. **Validate**: Health checks and sample completions/embeddings.
9. **Monitor**: Rate limit errors, 401s, cost anomalies.
10. **Document**: Log details & schedule.

---

### Google (Cloud / APIs)

1. **Console**: Project → **APIs & Services → Credentials**.
2. **Assess**: Identify key/service account; audit where it’s used (origins, IPs, scopes).
3. **Create**: New API key or **Service Account key** (prefer Workload Identity over SA keys if possible).
4. **Restrict**: Lock down **API restrictions**, **HTTP referrers**, **IP allowlists**, **OAuth scopes**.
5. **Secrets**: Update `GOOGLE_API_KEY` or service account JSON path (e.g., `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`).
6. **Rollout**: Stage → test → prod redeploy.
7. **Revoke Old**: Disable/delete old key or old SA key.
8. **Validate**: Target API calls (Sheets, etc.) succeed.
9. **Monitor**: Error logs, quota usage, unusual origins.
10. **Document**: Log rotation and next review.

---

## Tips & Gotchas

- **Dual-Key Window**: Keep both keys valid during cutover to avoid downtime.
- **Client vs Server**: Only public keys go into `VITE_*`. Private keys must stay server-side.
- **Automate**: Add calendar reminders; consider CI job to prompt rotations.
- **Telemetry**: Add explicit alerts for auth-failure spikes post-rotation.
- **Rollback**: Keep rollback path documented (how to restore previous key quickly).

---

## Appendix: Variables (common)

- **Frontend (public)**:  
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)
- **Server**:  
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_PROJECT_ID`  
  `OPENAI_API_KEY`, `OPENAI_RPM`  
  `GOOGLE_API_KEY` or `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`


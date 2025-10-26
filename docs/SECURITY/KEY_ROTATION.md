# Key Rotation Guide

## Supabase
1. Log in to the Supabase dashboard.
2. Select your project and open **Project Settings > API**.
3. Record the current key for rollback.
4. Generate new anon and service role keys.
5. Update secret storage (.env, CI, Terraform) with the rotated values (see `.env.example` for placeholders) and push the new values to Vault (`${SUPABASE_VAULT_PATH}` fields `service_role_key` and `jwt_secret`).
   - **Hosting platform:** update `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or equivalents) in each environment and redeploy after rotating.
   - **GitHub:** Update repository/environment secrets (`Settings → Secrets and variables → Actions`) for `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **Supabase CLI/Functions:** `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_JWT_SECRET=...` (per project). Re-run `supabase functions deploy --all` to pick up new values.
   The Supabase Edge Functions automatically consume these secrets via `supabase/functions/_shared/supabase-client.ts`, so no per-function env overrides are needed once Vault is updated.
6. Redeploy services/edge functions consuming the keys.
7. Revoke the previous keys in the Supabase dashboard.
8. Clear caches/session stores and restart long-lived workers.
9. Validate access (CLI + application login).
10. Record the rotation (date, actor, scope) in the security change log and schedule the next review.

## OpenAI
1. Sign in to your OpenAI account.
2. Navigate to **API Keys** under user settings.
3. Note the existing key and usage.
4. Create a new API key.
5. Replace old key in environment variables and configs.
6. Redeploy applications and workflows.
7. Delete the old key in the OpenAI console.
8. Clear any stored credentials.
9. Test requests using the new key.
10. Communicate changes to the team and rotate regularly.

## Google (Cloud / APIs)
1. Access the Google Cloud Console.
2. Choose the project and open **APIs & Services > Credentials**.
3. Identify the key to rotate and audit its usage.
4. Create a new API key or service account key.
5. Update secrets storage and configuration with the new key.
6. Redeploy services and workflows dependent on the key.
7. Restrict the new key to required scopes or origins.
8. Disable or delete the old key.
9. Monitor logs for unexpected authentication failures.
10. Record the rotation and schedule the next review.

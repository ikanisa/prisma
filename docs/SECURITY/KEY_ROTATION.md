# Key Rotation Guide

## Supabase
1. Log in to the Supabase dashboard.
2. Select your project and open **Project Settings > API**.
3. Record the current key for rollback.
4. Generate a new service or anon key.
5. Update secret storage (.env, CI, etc.) with the new key.
6. Redeploy any services using the key.
7. Invalidate or revoke the old key in the dashboard.
8. Remove cached credentials and restart clients.
9. Verify new key works across all environments.
10. Document the rotation and schedule the next review.

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

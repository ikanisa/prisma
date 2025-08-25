# Key Rotation Runbook

This document outlines a 10-step process for rotating API keys across Supabase, OpenAI, and Google services. Replace placeholder values with real data during execution.

1. **Inventory** – List all applications and environments using the key.
2. **Prepare** – Generate a new key in the provider console (Supabase, OpenAI, or Google).
3. **Update Secrets Manager** – Store the new key in your secrets manager or environment configuration.
4. **Deploy to Staging** – Update the `.env` or runtime configuration in staging with the new key.
5. **Run Tests** – Execute integration tests to verify the new key functions correctly.
6. **Schedule Cutover** – Plan a time window for production rotation and notify stakeholders.
7. **Deploy to Production** – Apply the new key to production environments and restart services as needed.
8. **Monitor** – Watch logs and metrics for authentication failures or anomalies.
9. **Revoke Old Key** – Once stability is confirmed, revoke the old key from the provider console.
10. **Document** – Record the rotation in change management logs and schedule the next rotation.

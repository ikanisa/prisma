# Keys Rotation Procedures

## Overview
90-day rotation schedule with step-by-step procedures for all secret types.

## Rotation Schedule

| Secret Type | Rotation Period | Owner |
|-------------|-----------------|-------|
| Supabase Service Role Key | 90 days | Platform Team |
| Supabase JWT Secret | 90 days | Platform Team |
| OpenAI API Key | 90 days | AI Team |
| Session Cookie Secret | 90 days | Backend Team |
| Service API Keys | 90 days | Service Owners |
| OAuth Client Secrets | 180 days | Auth Team |
| Encryption Keys | 365 days | Security Team |

## Supabase Service Role Key Rotation

**Procedure:**
1. Generate new key in Supabase Dashboard (Settings → API)
2. Update `SUPABASE_SERVICE_ROLE_KEY` in secrets manager (Vault/AWS)
3. Deploy configuration change (zero-downtime)
4. Monitor error logs for 24 hours
5. Revoke old key in Supabase Dashboard
6. Document rotation in runbook

**Rollback:**
If errors spike, revert to old key immediately.

## OpenAI API Key Rotation

**Procedure:**
1. Create new API key in OpenAI Dashboard
2. Update `OPENAI_API_KEY` in secrets manager
3. Deploy configuration change
4. Monitor usage in OpenAI Dashboard
5. Revoke old key after 24 hours

## Session Cookie Secret Rotation

**Procedure (requires downtime):**
1. Schedule maintenance window (low-traffic period)
2. Generate new secret: `openssl rand -base64 32`
3. Update `SESSION_COOKIE_SECRET`
4. Deploy and restart services
5. All active sessions invalidated (users must re-login)
6. Monitor login success rate

**Zero-Downtime Alternative:**
Support multiple secrets simultaneously, phase out old secret over 7 days.

## Service API Keys Rotation

**Procedure:**
1. Generate new keys for each service
2. Update both old and new keys in config (dual-mode)
3. Deploy configuration
4. Update clients to use new keys
5. Remove old keys after all clients migrated (7-day grace period)

## Encryption Keys Rotation

**Procedure (complex, requires coordination):**
1. Generate new encryption key in KMS
2. Deploy code changes to support both old and new keys
3. Re-encrypt data incrementally (background job)
4. Monitor re-encryption progress
5. Remove old key reference after 100% completion
6. Revoke old key in KMS

**Timeline:** 2-4 weeks for large datasets

## Emergency Rotation

**If key compromised:**
1. Immediately revoke compromised key
2. Generate and deploy new key (emergency change)
3. Notify security team and stakeholders
4. Conduct incident post-mortem
5. Update security procedures

**Version:** 1.0.0 (2025-11-02)

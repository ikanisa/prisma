# Key Rotation Procedures

**Version:** 1.0.0  
**Last Updated:** 2025-11-02  
**Purpose:** Document procedures for rotating secrets, keys, tokens, and credentials in Prisma Glow

---

## Overview

Regular key rotation is essential for security hygiene and compliance. This document provides procedures for rotating all critical secrets in the Prisma Glow system.

### Rotation Schedule

| Secret Type | Rotation Frequency | Risk Level |
|-------------|-------------------|------------|
| API Keys (OpenAI, etc.) | 90 days | High |
| Database Credentials | 90 days | Critical |
| Session Cookie Secret | 90 days | High |
| Service Account Keys | 90 days | High |
| OAuth Client Secrets | 180 days | Medium |
| JWT Signing Keys | 365 days | Critical |
| TLS/SSL Certificates | Auto (Let's Encrypt 90 days) | Critical |
| Webhook Secrets | 180 days | Medium |

---

## General Rotation Process

### Before Rotation

1. **Schedule Maintenance Window**
   - Choose low-traffic time
   - Notify stakeholders 48h in advance
   - Prepare rollback plan

2. **Backup Current Configuration**
   ```bash
   # Backup current secrets
   vault kv get -format=json secret/prisma-glow/prod > backup-$(date +%Y%m%d).json
   ```

3. **Test Rotation in Staging**
   - Always test rotation procedure in staging first
   - Verify application functionality
   - Document any issues

### During Rotation

1. **Generate New Secret**
2. **Update Secret Store** (Vault, AWS Secrets Manager, etc.)
3. **Deploy with New Secret**
4. **Verify Functionality**
5. **Revoke Old Secret** (after grace period)

### After Rotation

1. **Monitor for Errors**
   - Check logs for authentication failures
   - Monitor error rates
   - Review Sentry alerts

2. **Update Documentation**
   - Record rotation date
   - Update runbooks
   - Note any issues

3. **Revoke Old Credentials**
   - After 24-48h grace period
   - Confirm no legacy systems use old credentials

---

## 1. Database Credentials

### Supabase/PostgreSQL Password Rotation

**Frequency:** 90 days  
**Impact:** High (requires restart)  
**Rollback:** Revert to previous password

**Procedure:**

1. **Create new database user (recommended) or change password:**

   ```sql
   -- Option A: Create new user
   CREATE USER prisma_app_new WITH PASSWORD 'new-strong-password';
   GRANT ALL PRIVILEGES ON DATABASE prisma_glow TO prisma_app_new;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prisma_app_new;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prisma_app_new;
   
   -- Option B: Change existing password
   ALTER USER prisma_app WITH PASSWORD 'new-strong-password';
   ```

2. **Update connection string:**

   ```env
   # Old
   DATABASE_URL="postgresql://prisma_app:old-password@host:5432/prisma_glow"
   
   # New
   DATABASE_URL="postgresql://prisma_app:new-password@host:5432/prisma_glow"
   # Or with new user
   DATABASE_URL="postgresql://prisma_app_new:new-password@host:5432/prisma_glow"
   ```

3. **Update in secret store:**

   ```bash
   # Vault
   vault kv put secret/prisma-glow/prod/database \
     url="postgresql://prisma_app_new:new-password@host:5432/prisma_glow"
   
   # AWS Secrets Manager
   aws secretsmanager update-secret \
     --secret-id prisma-glow/prod/database-url \
     --secret-string "postgresql://prisma_app_new:new-password@host:5432/prisma_glow"
   ```

4. **Deploy updated configuration:**

   ```bash
   # Update environment variables
   kubectl set env deployment/gateway DATABASE_URL="..." --from=secret/db-credentials
   kubectl set env deployment/web DATABASE_URL="..." --from=secret/db-credentials
   
   # Rolling restart
   kubectl rollout restart deployment/gateway
   kubectl rollout restart deployment/web
   ```

5. **Verify connectivity:**

   ```bash
   # Test connection
   psql "$DATABASE_URL" -c "SELECT 1;"
   
   # Check application logs
   kubectl logs -f deployment/gateway | grep -i database
   ```

6. **Revoke old user (after 24h):**

   ```sql
   -- If created new user
   REVOKE ALL PRIVILEGES ON DATABASE prisma_glow FROM prisma_app;
   DROP USER prisma_app;
   ```

---

## 2. Supabase Service Role Key

**Frequency:** 90 days  
**Impact:** High (service role has admin privileges)  
**Rollback:** Revert to previous key

**Procedure:**

1. **Generate new service role key in Supabase Dashboard:**
   - Navigate to Settings → API
   - Click "Reset" next to service_role key
   - Copy new key immediately (shown once)

2. **Update environment variables:**

   ```env
   # New key
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi...new-key"
   ```

3. **Update in secret store:**

   ```bash
   # Vault
   vault kv put secret/prisma-glow/prod/supabase \
     service_role_key="eyJhbGciOi...new-key"
   ```

4. **Deploy and verify:**

   ```bash
   # Deploy
   kubectl set env deployment/gateway SUPABASE_SERVICE_ROLE_KEY="..." --from=secret/supabase-creds
   
   # Test
   curl -X GET https://api.prismaglow.com/health \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```

**Note:** Old service role key is automatically revoked when reset.

---

## 3. OpenAI API Key

**Frequency:** 90 days  
**Impact:** Medium (RAG and assistant features affected)  
**Rollback:** Revert to previous key

**Procedure:**

1. **Create new API key in OpenAI Dashboard:**
   - Navigate to https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name it: `prisma-glow-prod-2025-11-02`
   - Copy key immediately (shown once)

2. **Update environment variable:**

   ```env
   OPENAI_API_KEY="sk-proj-new-key..."
   ```

3. **Update in secret store:**

   ```bash
   vault kv put secret/prisma-glow/prod/openai \
     api_key="sk-proj-new-key..."
   ```

4. **Deploy and test:**

   ```bash
   # Deploy
   kubectl set env deployment/rag OPENAI_API_KEY="..." --from=secret/openai-creds
   
   # Test OpenAI connection
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

5. **Revoke old key:**
   - Return to OpenAI Dashboard
   - Find old key by name
   - Click "Revoke"

---

## 4. Session Cookie Secret

**Frequency:** 90 days  
**Impact:** High (invalidates all sessions, users must re-login)  
**Rollback:** Revert to previous secret

**Procedure:**

1. **Generate new secret:**

   ```bash
   # 32-byte secret (64 hex characters)
   openssl rand -hex 32
   # Example: a1b2c3d4e5f6...
   ```

2. **Update environment variable:**

   ```env
   SESSION_COOKIE_SECRET="a1b2c3d4e5f6..."
   ```

3. **Communicate to users:**
   - Send notification: "All users will need to log in again after scheduled maintenance"
   - Schedule during low-traffic period

4. **Deploy new secret:**

   ```bash
   kubectl set env deployment/gateway SESSION_COOKIE_SECRET="..." --from=secret/session-creds
   kubectl rollout restart deployment/gateway
   ```

5. **Monitor for login issues:**

   ```bash
   # Watch authentication logs
   kubectl logs -f deployment/gateway | grep -i "auth"
   ```

**Note:** All existing sessions will be invalidated. Users must re-authenticate.

---

## 5. JWT Signing Key

**Frequency:** 365 days  
**Impact:** Critical (invalidates all tokens)  
**Rollback:** Revert to previous key with grace period

**Procedure:**

1. **Generate new key pair:**

   ```bash
   # RS256 (RSA)
   openssl genrsa -out private.pem 4096
   openssl rsa -in private.pem -pubout -out public.pem
   
   # ES256 (ECDSA - recommended)
   openssl ecparam -genkey -name prime256v1 -noout -out private.pem
   openssl ec -in private.pem -pubout -out public.pem
   ```

2. **Update Supabase JWT secret:**
   - Navigate to Supabase Dashboard → Settings → API
   - Update JWT secret
   - Note: This may vary by auth provider

3. **Implement key rotation with grace period:**

   ```typescript
   // Verify with multiple keys during transition
   const keys = [
     { kid: 'new-key', key: newPublicKey },
     { kid: 'old-key', key: oldPublicKey }, // Keep for 7 days
   ];
   
   jwt.verify(token, (header, callback) => {
     const key = keys.find(k => k.kid === header.kid);
     callback(null, key?.key);
   });
   ```

4. **Deploy with both keys active:**
   - Issue new tokens with new key
   - Accept tokens signed with old key (7-day grace period)

5. **Remove old key after grace period:**
   - After 7 days, remove old key from verification

**Warning:** This rotation is complex and requires coordination. Test thoroughly in staging.

---

## 6. TLS/SSL Certificates

**Frequency:** Auto-renewal (Let's Encrypt: 90 days)  
**Impact:** Critical (site inaccessible if expired)  
**Rollback:** Previous certificate

**Automated Renewal (Recommended):**

```bash
# Certbot auto-renewal
certbot renew --nginx --quiet

# Or with DNS challenge
certbot renew --dns-cloudflare --dns-cloudflare-credentials /path/to/cloudflare.ini
```

**Manual Renewal:**

1. **Generate new certificate:**

   ```bash
   certbot certonly --nginx -d app.prismaglow.com -d admin.prismaglow.com
   ```

2. **Update certificate in load balancer/reverse proxy:**

   ```bash
   # Nginx
   sudo cp /etc/letsencrypt/live/app.prismaglow.com/fullchain.pem /etc/nginx/certs/
   sudo cp /etc/letsencrypt/live/app.prismaglow.com/privkey.pem /etc/nginx/certs/
   sudo nginx -t && sudo systemctl reload nginx
   
   # Or with Kubernetes
   kubectl create secret tls prisma-glow-tls \
     --cert=/etc/letsencrypt/live/app.prismaglow.com/fullchain.pem \
     --key=/etc/letsencrypt/live/app.prismaglow.com/privkey.pem \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

3. **Verify new certificate:**

   ```bash
   # Check expiry
   echo | openssl s_client -servername app.prismaglow.com -connect app.prismaglow.com:443 2>/dev/null | openssl x509 -noout -dates
   
   # Verify chain
   curl -vI https://app.prismaglow.com 2>&1 | grep -i certificate
   ```

**Monitoring:**
- Set up alerts for certificates expiring in < 30 days
- Monitor renewal job logs

---

## 7. Service Account Keys (Google, AWS, etc.)

**Frequency:** 90 days  
**Impact:** Medium-High  
**Rollback:** Revert to previous key

### Google Service Account

1. **Create new key:**

   ```bash
   # Via gcloud CLI
   gcloud iam service-accounts keys create new-key.json \
     --iam-account=svc-prisma-glow@project.iam.gserviceaccount.com
   ```

2. **Update environment variable:**

   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account", ...}'
   # Or path
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH="/etc/secrets/google-sa-key.json"
   ```

3. **Deploy new key:**

   ```bash
   kubectl create secret generic google-sa-key \
     --from-file=key.json=new-key.json \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

4. **Revoke old key:**

   ```bash
   # List keys
   gcloud iam service-accounts keys list \
     --iam-account=svc-prisma-glow@project.iam.gserviceaccount.com
   
   # Delete old key
   gcloud iam service-accounts keys delete KEY_ID \
     --iam-account=svc-prisma-glow@project.iam.gserviceaccount.com
   ```

---

## 8. Webhook Secrets

**Frequency:** 180 days  
**Impact:** Low-Medium  
**Rollback:** Revert to previous secret

**Procedure:**

1. **Generate new secret:**

   ```bash
   openssl rand -hex 32
   ```

2. **Update in webhook provider:**
   - GitHub: Settings → Webhooks → Edit → Update secret
   - N8N: Update workflow webhook configuration
   - Stripe: Dashboard → Webhooks → Endpoint → Update signing secret

3. **Update environment variable:**

   ```env
   N8N_WEBHOOK_SECRET="new-secret"
   AUTOMATION_WEBHOOK_SECRET="new-secret"
   ```

4. **Deploy and test:**

   ```bash
   # Deploy
   kubectl set env deployment/gateway N8N_WEBHOOK_SECRET="..." --from=secret/webhook-creds
   
   # Test webhook
   curl -X POST https://api.prismaglow.com/webhooks/n8n \
     -H "X-Webhook-Secret: new-secret" \
     -d '{"test": true}'
   ```

---

## Emergency Rotation

### When to Rotate Immediately

1. **Secret Exposed:**
   - Committed to Git (even if reverted)
   - Exposed in logs
   - Leaked in error messages
   - Shared via insecure channel

2. **Suspected Compromise:**
   - Unauthorized access detected
   - Unusual API usage patterns
   - Security incident

3. **Personnel Changes:**
   - Employee departure
   - Contractor off-boarding
   - Role changes

### Emergency Procedure

1. **Immediate Actions:**
   - Revoke compromised secret immediately
   - Generate and deploy new secret
   - Monitor for unauthorized access
   - Review access logs

2. **Investigation:**
   - Determine scope of exposure
   - Identify affected systems
   - Review access logs for anomalies

3. **Communication:**
   - Notify security team
   - Alert stakeholders
   - Document incident

---

## Rotation Checklist

Use this checklist for each rotation:

### Pre-Rotation

- [ ] Review rotation procedure
- [ ] Schedule maintenance window
- [ ] Notify stakeholders (if downtime expected)
- [ ] Backup current configuration
- [ ] Test rotation in staging
- [ ] Prepare rollback plan

### During Rotation

- [ ] Generate new secret
- [ ] Update secret store
- [ ] Update environment variables
- [ ] Deploy to production
- [ ] Verify functionality
- [ ] Monitor for errors

### Post-Rotation

- [ ] Confirm application functionality
- [ ] Monitor logs for 24h
- [ ] Revoke old secret (after grace period)
- [ ] Update documentation
- [ ] Record rotation date in tracking spreadsheet

---

## Rotation Tracking

### Rotation Log

Maintain a rotation log in a secure location (e.g., internal wiki or ticketing system):

| Secret Type | Last Rotated | Next Rotation | Rotated By | Notes |
|-------------|--------------|---------------|------------|-------|
| Database Password | 2025-11-02 | 2026-02-02 | ops-team | - |
| OpenAI API Key | 2025-10-15 | 2026-01-15 | dev-team | - |
| Session Secret | 2025-09-01 | 2025-12-01 | security-team | - |

### Automated Reminders

Set up calendar reminders 2 weeks before rotation due date:

```bash
# Example: Cron job to check rotation due dates
0 9 * * MON /usr/local/bin/check-rotation-dates.sh
```

---

## Troubleshooting

### Authentication Failures After Rotation

**Symptoms:** 401 Unauthorized, 403 Forbidden errors

**Solutions:**
1. Verify new secret is correctly configured
2. Check for typos in environment variables
3. Restart services to pick up new secrets
4. Verify secret store is accessible
5. Check logs for specific error messages

### Database Connection Errors

**Symptoms:** "Connection refused", "Authentication failed"

**Solutions:**
1. Verify DATABASE_URL format
2. Test connection with `psql $DATABASE_URL`
3. Check database user permissions
4. Verify network connectivity

### Rollback Procedure

If issues occur after rotation:

1. **Restore previous secret:**
   ```bash
   vault kv get -field=value secret/prisma-glow/prod/backup-20251102 > current-secret
   ```

2. **Redeploy with old secret:**
   ```bash
   kubectl set env deployment/gateway SECRET="..." --from=secret/backup-creds
   kubectl rollout undo deployment/gateway
   ```

3. **Verify functionality restored**

4. **Investigate root cause before re-attempting**

---

## References

- **OWASP Key Management Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html
- **NIST SP 800-57:** Key Management Recommendations
- **CIS Controls:** Control 3 - Data Protection

---

**Last Updated:** 2025-11-02  
**Maintainer:** Security Team  
**Related:** `SECURITY.md`, `ENV_GUIDE.md`

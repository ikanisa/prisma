# Secret Management & Rotation

**Last Updated**: January 11, 2026  
**Addresses**: Audit High Priority #15

---

## Secret Inventory

| Secret | Location | Rotation Period | Last Rotated |
|--------|----------|-----------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Cloudflare | 90 days | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cloudflare | 90 days | - |
| `OPENAI_API_KEY` | Cloudflare | 90 days | - |
| `OPENAI_APP_OAUTH_CLIENT_SECRET` | Cloudflare | 90 days | - |

---

## Rotation Procedures

### 1. Supabase Keys

```bash
# 1. Generate new key in Supabase Dashboard
# Settings → API → Regenerate key

# 2. Update Cloudflare Pages
# Workers & Pages → prisma → Settings → Variables

# 3. Trigger new deployment
# Deployments → Retry deployment

# 4. Verify application works
curl https://prisma.ikanisa.com/api/health
```

### 2. OpenAI API Key

```bash
# 1. Generate new key at https://platform.openai.com/api-keys
# 2. Update in Cloudflare Pages environment variables
# 3. Deploy and verify AI features work
```

---

## Rotation Schedule

| Month | Action |
|-------|--------|
| Q1 | Rotate all keys |
| Q2 | Rotate SUPABASE keys |
| Q3 | Rotate all keys |
| Q4 | Rotate OPENAI keys |

---

## Automated Reminders

Add to calendar/ticketing system:
- Monthly: Check secret expiration dates
- Quarterly: Full rotation cycle
- After incident: Emergency rotation

---

## Emergency Rotation

If a secret is compromised:

1. **Immediately**: Revoke compromised secret
2. **Within 15 minutes**: Generate new secret
3. **Within 30 minutes**: Deploy with new secret
4. **Within 1 hour**: Audit for unauthorized access
5. **Within 24 hours**: Post-incident report

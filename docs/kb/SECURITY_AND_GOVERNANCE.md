# Knowledge Factory Security & Governance

## Overview

This document defines the security model, access controls, and governance policies for the Knowledge Factory pipeline.

---

## Tenant Isolation

### Database Level
- All KB tables include `tenant_id` column as foreign key to `organizations`
- RLS policies enforce `is_member_of(tenant_id)` check on all tables
- Vector search function `kb_search()` requires tenant_id parameter

### Application Level
- All API endpoints extract tenant_id from authenticated JWT
- Service-to-service calls must include tenant context
- Audit trail logs tenant_id with every query

---

## Confidentiality Levels

| Level | Definition | Access Policy |
|-------|------------|---------------|
| `PUBLIC` | Publicly available standards (IFRS published, government laws) | All authenticated users |
| `INTERNAL` | Internal firm methodology, templates, policies | EMPLOYEE role or above |
| `RESTRICTED` | Client-confidential, copyrighted materials, privileged | MANAGER role + explicit grant |

### Access Enforcement

```sql
-- Database function enforces access
CREATE FUNCTION kb_can_access_confidentiality(
  p_tenant_id UUID,
  p_confidentiality kb_confidentiality
) RETURNS BOOLEAN
```

- Applied in `kb_search()` function automatically
- Retrieval layer MUST check confidentiality before returning results
- Agent tools MUST NOT bypass confidentiality filters

---

## Document Classification

### Automatic Classification
The enricher (Gemini-based) classifies documents with:
- `standard`: IFRS, ISA, GAAP, TAX, AUDIT_METHODOLOGY, OTHER
- `jurisdiction`: Country/region code
- `doc_type`: LAW, REGULATION, STANDARD, GUIDANCE, etc.
- `confidentiality`: Auto-assigned based on:
  - Source folder path mappings
  - Presence of client names
  - Copyright indicators

### Override Process
- MANAGER+ can manually override classification
- Overrides logged in audit trail
- Original classification preserved in metadata

---

## Copyright & Licensing Guardrails

### Prohibited Content
1. **Verbatim Book Content**: Chunked books MUST be summarized only
2. **Licensed Training Materials**: Must be tagged RESTRICTED
3. **Client-Submitted Documents**: Default to RESTRICTED

### Ingestion Rules
| Document Type | Default Confidentiality | Chunking Allowed |
|---------------|------------------------|------------------|
| IFRS/ISA Standards | PUBLIC | Yes |
| Commentary/Books | RESTRICTED | Summary only |
| Client Files | RESTRICTED | Yes (restricted access) |
| Internal Templates | INTERNAL | Yes |

### Enforcement
- `doc_type=BOOK` triggers summary-only mode
- Copyright detection prompts manual review
- Enricher refuses to chunk suspected copyrighted material

---

## RBAC Integration

### Role Hierarchy
```
READONLY < CLIENT < EMPLOYEE < MANAGER < ADMIN < PARTNER < SYSTEM_ADMIN
```

### KB-Specific Permissions
| Action | Minimum Role |
|--------|--------------|
| Search PUBLIC docs | READONLY |
| Search INTERNAL docs | EMPLOYEE |
| Search RESTRICTED docs | MANAGER |
| Upload documents | EMPLOYEE |
| Edit classification | MANAGER |
| Delete documents | MANAGER |
| Configure sources | ADMIN |
| View audit trail | MANAGER |
| Export audit logs | ADMIN |

---

## Audit Trail

### Logged Events
Every RAG query logs:
- `tenant_id`, `user_id`
- `query` text
- `retrieved_chunk_ids` (with scores)
- `filters_applied` (standard, jurisdiction, doc_type)
- `response_id` (link to agent response)
- `created_at` timestamp

### Retention
- Audit logs retained for 7 years (regulatory compliance)
- Monthly archives to cold storage
- Delete requests require SYSTEM_ADMIN + legal approval

---

## Data Protection

### At Rest
- Supabase encryption (AES-256)
- Backup encryption enabled
- Service account keys rotated quarterly

### In Transit
- TLS 1.3 for all connections
- mTLS for service-to-service
- No sensitive data in URLs

### Embedding Security
- Embeddings stored separately from source text
- Vector-only extraction not feasible (lossy compression)
- Source text access requires explicit permission

---

## Incident Response

### Data Breach
1. Isolate affected tenant(s)
2. Notify security team within 1 hour
3. Revoke compromised credentials
4. Audit trail analysis
5. User notification per GDPR/local law

### Accidental Disclosure
1. Remove offending chunks immediately
2. Log removal in audit trail
3. Assess impact scope
4. Report to compliance officer

---

## Compliance Checklist

- [ ] RLS enabled on all KB tables
- [ ] Confidentiality filter active in retrieval
- [ ] Audit trail logging functional
- [ ] GDPR delete capability tested
- [ ] Service account key rotation automated
- [ ] Backup encryption verified

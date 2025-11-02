# Admin Panel PWA Audit

**Job:** P5-ADMIN-PWA  
**Version:** 1.0.0  
**Last Updated:** 2025-11-02  
**Purpose:** Audit admin panel PWA for production readiness

---

## Overview

**Location:** `apps/admin/`  
**Purpose:** Governance PWA for IAM, agents, knowledge, workflows, telemetry, and traceability management

**Current Status:** 🔄 Basic structure in place, needs feature completeness audit

---

## Current Structure

```
apps/admin/
├── public/              # Static assets
├── src/
│   ├── lib/
│   │   └── offline/     # Offline sync functionality
│   ├── features/
│   │   └── sync/        # Sync features
│   ├── components/      # UI components (needs audit)
│   ├── pages/           # Page components (needs audit)
│   └── utils/           # Utilities
└── tests/               # Test files
```

---

## Required Pages (per Playbook)

### Governance & IAM

| Page | Route | Status | Priority |
|------|-------|--------|----------|
| **Overview** | `/` | ❓ Unknown | P0 |
| **Identity & Access** | `/iam` | ❓ Unknown | P0 |
| **Roles & Permissions** | `/permissions` | ❓ Unknown | P0 |

**Overview Page Requirements:**
- Dashboard with key metrics
- Recent admin activity
- System health indicators
- Quick actions

**IAM Page Requirements:**
- User management (list, invite, deactivate)
- Organization membership management
- Role assignment
- MFA enforcement
- Impersonation controls (two-man rule)

**Permissions Page Requirements:**
- Permission matrix editor
- Role hierarchy visualization
- RBAC rule testing
- Policy pack management

### Agent & Knowledge Management

| Page | Route | Status | Priority |
|------|-------|--------|----------|
| **Agents & Tools** | `/agents` | ❓ Unknown | P1 |
| **Knowledge & RAG** | `/knowledge` | ❓ Unknown | P1 |

**Agents Page Requirements:**
- Agent configuration (personas, models, tools)
- Tool whitelist management
- Policy pack editor
- Agent evaluation results
- Token usage metrics

**Knowledge Page Requirements:**
- Vector store management
- Document ingestion monitor
- Index refresh controls
- Citation quality metrics
- Search testing interface

### Workflow & Integration

| Page | Route | Status | Priority |
|------|-------|--------|----------|
| **Workflows & Approvals** | `/workflows` | ❓ Unknown | P1 |
| **Jobs & Integrations** | `/jobs` | ❓ Unknown | P2 |
| **Domain Settings** | `/domain` | ❓ Unknown | P2 |

**Workflows Page Requirements:**
- Workflow definitions
- Approval queue
- SLA tracking
- MFA enforcement for approvals

**Jobs Page Requirements:**
- Scheduled jobs (cron)
- Webhook management
- Integration status
- Job execution history

**Domain Settings Page Requirements:**
- Organization settings
- Feature flags
- Data retention policies
- DSAR export requests

### System Management

| Page | Route | Status | Priority |
|------|-------|--------|----------|
| **Settings** | `/settings` | ❓ Unknown | P1 |
| **Telemetry** | `/telemetry` | ❓ Unknown | P1 |
| **Traceability** | `/traceability` | ❓ Unknown | P2 |

**Settings Page Requirements:**
- System configuration
- Feature flags
- Environment settings
- Maintenance mode

**Telemetry Page Requirements:**
- Error rates and logs
- Performance metrics
- Assistant adoption
- Security denials (RLS/RBAC)

**Traceability Page Requirements:**
- Requirements traceability matrix
- Editable/exportable matrix
- Test coverage mapping
- Compliance tracking

---

## PWA Configuration

### Manifest

**Required:** `apps/admin/public/manifest.json`

```json
{
  "name": "Prisma Glow Admin Panel",
  "short_name": "Admin",
  "description": "Governance and administration portal",
  "theme_color": "#0B1022",
  "background_color": "#0B1022",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker

**Status:** ❓ Needs verification

**Requirements:**
- Cache admin shell for offline access
- Stale-while-revalidate for API responses
- Offline page for network failures

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

- [ ] **Keyboard Navigation:** All interactive elements accessible via keyboard
- [ ] **Focus Indicators:** Visible focus states (2px outline with offset)
- [ ] **Screen Reader Support:** Proper ARIA labels and live regions
- [ ] **Color Contrast:** Minimum 4.5:1 for normal text, 3:1 for large text
- [ ] **Responsive Design:** Works on mobile, tablet, desktop
- [ ] **Form Validation:** Clear error messages with instructions

### Testing

```bash
# Run axe-core accessibility tests
pnpm exec playwright test tests/a11y.spec.ts

# Expected: 0 critical violations
```

---

## Performance Budgets

**Per Playbook:**
- Route JS: ≤250KB
- Total JS: ≤700KB
- LCP: ≤1800ms

### Current Status

❓ **Needs measurement**

```bash
# Check bundle size
pnpm run bundle:check

# Run Lighthouse
pnpm exec lighthouse https://admin.prismaglow.com --view
```

---

## Security Considerations

### Authentication

- [ ] **Session Management:** Secure cookies with HttpOnly, SameSite
- [ ] **MFA Requirement:** Enforce MFA for all admin users
- [ ] **Session Timeout:** Auto-logout after inactivity

### Authorization

- [ ] **RBAC Enforcement:** Verify SYSTEM_ADMIN or PARTNER role required
- [ ] **Impersonation Controls:** Two-man rule enforcement
- [ ] **Audit Logging:** Log all admin actions

---

## Action Items

### Priority 1: Page Inventory

- [ ] **Audit existing pages:** Document what's implemented
- [ ] **Identify gaps:** Compare against playbook requirements
- [ ] **Create implementation plan:** For missing pages

### Priority 2: Feature Completeness

- [ ] **IAM Features:** User management, role assignment, impersonation
- [ ] **Agent Management:** Configuration UI for config/agents.yaml
- [ ] **Knowledge Management:** Vector store and ingestion monitoring
- [ ] **Telemetry Dashboards:** Error rates, performance, security

### Priority 3: PWA & Accessibility

- [ ] **PWA Manifest:** Verify existence and correctness
- [ ] **Service Worker:** Implement or verify
- [ ] **Accessibility Audit:** Run axe-core, fix violations
- [ ] **Performance Testing:** Measure against budgets

### Priority 4: Testing

- [ ] **Unit Tests:** Component tests
- [ ] **Integration Tests:** API integration
- [ ] **E2E Tests:** Critical admin flows
- [ ] **Accessibility Tests:** Automated axe-core

---

## Testing Checklist

### Admin Flows to Test

1. **User Management:**
   - Invite user → accept → membership created
   - Update user role → permissions change
   - Impersonation with two-man rule

2. **Permissions Management:**
   - Edit permission matrix
   - Guard observed in application
   - Role hierarchy enforced

3. **Knowledge Management:**
   - Link Google Drive → mirror → ingest
   - Monitor ingestion progress
   - Refresh vector index
   - Test search with citations

4. **Approvals:**
   - Create approval request
   - Require MFA for approval
   - Track SLA
   - Complete approval workflow

---

## Summary

### Current Status

❓ **Needs comprehensive audit** - Basic structure exists but feature completeness unknown

### Key Questions

1. Which admin pages are currently implemented?
2. What features exist vs. playbook requirements?
3. Is PWA manifest configured?
4. Are service workers implemented?
5. What's the current Lighthouse/axe score?

### Recommendations

1. **Conduct feature inventory** - Document all existing pages/features
2. **Gap analysis** - Compare against playbook requirements
3. **Create implementation roadmap** - Prioritize missing features
4. **PWA audit** - Verify manifest, service worker, performance
5. **Accessibility audit** - Run axe-core and remediate

---

**Last Updated:** 2025-11-02  
**Maintainer:** Admin Team  
**Related:** `config/ui_ux.yaml`, `REFACTOR/plan.md`

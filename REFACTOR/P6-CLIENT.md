# Client App Stabilization

**Job:** P6-CLIENT-MIN  
**Version:** 1.0.0  
**Last Updated:** 2025-11-02  
**Purpose:** Audit and stabilize client PWA for production readiness

---

## Overview

**Location:** `apps/web/`  
**Purpose:** AI-first operations PWA for business users (agent chat, documents, tasks, domain consoles)

**Framework:** Next.js (App Router)  
**Current Status:** ✅ Extensive functionality in place

---

## Current Structure

```
apps/web/
├── app/                 # Next.js app router
│   ├── dashboard/
│   ├── api/             # API routes
│   │   ├── accounting/
│   │   ├── audit/
│   │   ├── tax/
│   │   ├── agent/
│   │   ├── openai/
│   │   └── ...
│   └── ...
├── components/          # React components
├── hooks/               # Custom hooks
├── lib/                 # Utilities
├── stores/              # Zustand state management
├── prisma/              # Prisma schema
└── public/              # Static assets
```

---

## Required Pages (per Playbook)

### Core User Journeys

| Page | Route | Status | Priority |
|------|-------|--------|----------|
| **Dashboard** | `/dashboard` | ✅ Exists | P0 |
| **Onboarding** | `/onboarding` | ❓ Unknown | P0 |
| **Documents** | `/documents` | ❓ Unknown | P0 |
| **Tasks** | `/tasks` | ❓ Unknown | P1 |

**Dashboard Requirements:**
- KPIs and metrics
- Recent activity feed
- Suggested actions
- Assistant dock (⌘K hotkey)

**Onboarding Requirements:**
- Zero-typing onboarding from documents
- Document extraction preview
- Profile commit workflow
- Welcome checklist

**Documents Requirements:**
- Repository tree navigation
- Document grid with preview
- Upload with drag-and-drop
- OCR and extraction

**Tasks Requirements:**
- Filters and search
- Task table with sorting
- Task inspector/detail view
- Create/update/assign

### Domain Consoles

| Page | Route | Status | Priority |
|------|-------|--------|----------|
| **Accounting Close** | `/close` | ✅ API exists | P1 |
| **Audit Console** | `/audit` | ❓ Unknown | P1 |
| **Tax Console** | `/tax` | ❓ Unknown | P2 |

**Accounting Close Requirements:**
- Timeline and milestones
- Journal entry alerts
- Reconciliations
- Draft financial statements

**Audit Console Requirements:**
- Audit plan
- Risk assessment
- Procedures and testing
- Sampling and confirmations
- Key audit matters (KAMs)
- Report drafting

**Tax Console Requirements:**
- Corporate income tax (CIT)
- VAT calculations
- DAC6 reporting
- Pillar Two compliance

---

## Assistant Dock

### Requirements (per Playbook)

✅ **Chat Interface:** ⌘K hotkey to open  
🔄 **Voice Push-to-Talk:** Needs verification  
✅ **Tool Calling:** Via server proxy  
🔄 **Citations:** Enforcement needs verification

### Implementation Check

```typescript
// Check for assistant dock component
// Expected location: components/assistant/ or components/chat/
```

### Features to Verify

- [ ] **Hotkey:** ⌘K (Mac) / Ctrl+K (Windows) opens dock
- [ ] **Positioning:** Right-side dock, ~400px width
- [ ] **Voice:** Push-to-talk with microphone button
- [ ] **Tool Execution:** All tools via /api/tools/* proxy
- [ ] **Citations:** Links to source documents
- [ ] **History:** Conversation persistence

---

## API Routes

### Existing Routes (from app/api/)

```
app/api/
├── accounting/          # Accounting operations
├── agent/               # Agent orchestration
├── audit/               # Audit workflows
├── tax/                 # Tax calculations
├── openai/              # OpenAI integration
├── close/               # Period close
├── compliance/          # Compliance checks
├── controls/            # Internal controls
├── dac6/                # DAC6 reporting
├── deficiency/          # Deficiency tracking
├── gl/                  # General ledger
├── group/               # Group management
├── notifications/       # Notifications
├── tb/                  # Trial balance
├── telemetry/           # Telemetry
└── vat/                 # VAT calculations
```

**Finding:** ✅ Comprehensive API routes exist

### Integration with FastAPI

**Pattern:** Next.js API routes proxy to FastAPI backend

```typescript
// app/api/[domain]/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  // Proxy to FastAPI
  const response = await fetch(`${FASTAPI_BASE_URL}/api/${domain}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  
  return Response.json(await response.json());
}
```

---

## PWA Configuration

### Manifest

**Location:** `apps/web/public/manifest.json`

```json
{
  "name": "Prisma Glow Client",
  "short_name": "Client",
  "description": "AI-powered operations suite",
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
- Cache shell for offline access
- Stale-while-revalidate for API
- Background sync for offline operations

---

## Performance Budgets

**Per Playbook:**
- Route JS: ≤250KB
- Total JS: ≤700KB
- LCP: ≤1800ms
- FID: ≤100ms
- CLS: ≤0.1

### Measurement

```bash
# Check Next.js bundle size
pnpm --filter web run build
# Review .next/analyze output

# Run Lighthouse
pnpm exec lighthouse https://app.prismaglow.com --view

# Check bundle budgets
pnpm run check:bundle:web
```

---

## Accessibility Requirements

### WCAG 2.1 AA

- [ ] **Keyboard Navigation:** All features keyboard-accessible
- [ ] **Focus Management:** Clear focus indicators
- [ ] **Screen Readers:** Proper ARIA labels
- [ ] **Color Contrast:** 4.5:1 minimum
- [ ] **Responsive Design:** Mobile, tablet, desktop
- [ ] **Form Validation:** Clear, actionable errors

### Testing

```bash
# Run accessibility tests
pnpm --filter web test:a11y

# Run Playwright a11y tests
pnpm exec playwright test tests/playwright/a11y.spec.ts
```

---

## Integration with Packages

### Required Package Dependencies

```json
{
  "dependencies": {
    "@prisma-glow/ui": "workspace:*",
    "@prisma-glow/api-client": "workspace:*",
    "@prisma-glow/system-config": "workspace:*",
    "@prisma-glow/lib": "workspace:*"
  }
}
```

### Verification

- [ ] **@prisma-glow/ui:** Components imported and used
- [ ] **@prisma-glow/api-client:** API calls use typed client
- [ ] **@prisma-glow/system-config:** Config loaded correctly
- [ ] **@prisma-glow/lib:** Utilities imported

---

## Prisma Integration

### Schema Location

`apps/web/prisma/schema.prisma`

### Common Operations

```bash
# Generate Prisma client
pnpm --filter web run prisma:generate

# Create migration
pnpm --filter web run prisma:migrate:dev --name migration_name

# Deploy migrations
pnpm --filter web run prisma:migrate:deploy

# Seed database
pnpm --filter web run prisma:seed
```

---

## State Management

**Framework:** Zustand

**Store Locations:** `apps/web/stores/`

### Expected Stores

- `authStore.ts` - Authentication state
- `appStore.ts` - Global app state
- `documentStore.ts` - Document management
- `taskStore.ts` - Task management
- `chatStore.ts` - Assistant chat state

---

## Testing Strategy

### Current Tests

**Location:** `apps/web/tests/`

### Required Test Coverage

#### Unit Tests
- [ ] Component tests (React Testing Library)
- [ ] Hook tests
- [ ] Utility function tests
- [ ] Store tests (Zustand)

#### Integration Tests
- [ ] API route tests
- [ ] Database integration tests
- [ ] Supabase integration tests

#### E2E Tests
- [ ] **Onboarding Flow:** Upload docs → extract → commit profile
- [ ] **Document Management:** Upload → view → download
- [ ] **Task Management:** Create → assign → complete
- [ ] **Assistant Dock:** Open (⌘K) → ask question → get response with citations
- [ ] **Accounting Close:** View timeline → create journal entry → reconcile
- [ ] **Approvals:** Create approval → require MFA → approve/reject

---

## Action Items

### Priority 1: Feature Audit

- [ ] **Inventory all pages:** Document what's implemented
- [ ] **Test core journeys:** Dashboard, onboarding, documents, tasks
- [ ] **Verify assistant dock:** ⌘K, voice, tool calling, citations
- [ ] **Domain consoles:** Close, audit, tax functionality

### Priority 2: Integration Validation

- [ ] **API Integration:** Verify all API routes work with FastAPI
- [ ] **Package Integration:** Verify workspace packages imported correctly
- [ ] **Prisma Integration:** Verify database operations work
- [ ] **Supabase Integration:** Verify RLS, storage, auth

### Priority 3: PWA & Performance

- [ ] **PWA Manifest:** Verify and enhance
- [ ] **Service Worker:** Implement/verify offline support
- [ ] **Performance Testing:** Measure against budgets
- [ ] **Bundle Size:** Optimize if exceeding limits

### Priority 4: Accessibility

- [ ] **Accessibility Audit:** Run axe-core
- [ ] **Keyboard Navigation:** Test all features
- [ ] **Screen Reader:** Test with NVDA/JAWS
- [ ] **Color Contrast:** Verify all text meets 4.5:1

### Priority 5: Testing

- [ ] **Unit Tests:** Add/expand component tests
- [ ] **Integration Tests:** API and database tests
- [ ] **E2E Tests:** Critical user journeys
- [ ] **Performance Tests:** Lighthouse CI

---

## Known Issues

### Items to Investigate

1. **Zero-Typing Onboarding:** Is this implemented?
2. **Voice Push-to-Talk:** Is this implemented in assistant dock?
3. **Citations Enforcement:** Are all agent responses cited?
4. **Service Worker:** Is offline support implemented?
5. **Bundle Size:** Are we within budgets?

---

## Acceptance Criteria

Per playbook, the client app must meet:

- [ ] No API errors on any route
- [ ] Assistant can call whitelisted tools via server proxy
- [ ] Zero-typing onboarding completes from documents
- [ ] RLS blocks cross-tenant access
- [ ] Approvals enforce step-up MFA
- [ ] Lighthouse ≥ 90 all categories
- [ ] axe-core critical violations = 0
- [ ] Bundle sizes ≤ budgets

---

## Summary

### Current State

✅ **Extensive Functionality:** Comprehensive API routes and domain coverage  
✅ **Next.js Best Practices:** App router, TypeScript, Prisma  
❓ **Assistant Dock:** Needs verification (⌘K, voice, citations)  
❓ **PWA Configuration:** Needs verification (manifest, service worker)  
❓ **Performance:** Needs measurement against budgets  

### Key Questions

1. Is zero-typing onboarding implemented?
2. Does assistant dock have voice push-to-talk?
3. Are all agent responses properly cited?
4. Is service worker implemented for offline?
5. What are current Lighthouse scores?
6. What is current bundle size?

### Next Steps

1. **Feature inventory** - Document all implemented pages
2. **Integration testing** - Verify all integrations work
3. **Performance audit** - Measure against budgets
4. **Accessibility audit** - Run axe-core and remediate
5. **E2E testing** - Test critical user journeys

---

**Last Updated:** 2025-11-02  
**Maintainer:** Client Team  
**Related:** `config/ui_ux.yaml`, `REFACTOR/plan.md`

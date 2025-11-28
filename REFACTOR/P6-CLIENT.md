# P6: Client App Stabilization

## Status
- **Version:** 1.0.0
- **Last Updated:** 2025-11-02
- **Owner:** Frontend Guild
- **Phase:** P6 - Client PWA

## Executive Summary

Client PWA comprehensive documentation covering core pages (Dashboard, onboarding, documents, tasks), domain consoles (Accounting close, audit, tax), Assistant dock (⌘K hotkey, voice, citations), 20+ API routes, and PWA/accessibility validation.

---

## Core Pages

### 1. Dashboard (`/`)
**Features:**
- Activity feed (recent documents, tasks, approvals)
- Quick actions (Add company, Upload PBC, What's next?)
- Engagement status cards
- Upcoming deadlines
- Assistant dock (⌘K hotkey)

**API Routes:**
- `GET /api/dashboard/activity`
- `GET /api/dashboard/engagements`
- `GET /api/dashboard/deadlines`

---

### 2. Onboarding (`/onboarding`)
**Zero-typing flow:**
1. Start onboarding (agent creates checklist)
2. Upload documents (Google Drive, local files)
3. AI extraction of company details
4. Review + edit
5. Commit entity to database

**API Routes:**
- `POST /api/onboarding/start`
- `POST /api/onboarding/upload`
- `POST /api/onboarding/extract`
- `POST /api/onboarding/commit`

---

### 3. Documents (`/documents`)
**Features:**
- Document library (all org documents)
- Filter by folder, type, date
- Full-text search
- Document preview
- Upload to specific folders

**API Routes:**
- `GET /api/documents/list`
- `POST /api/documents/upload`
- `GET /api/documents/:id`
- `DELETE /api/documents/:id`

---

### 4. Tasks (`/tasks`)
**Features:**
- Task list (assigned to me, all org tasks)
- Create tasks (manual or agent)
- Assign to team members
- Mark complete/incomplete
- Filter by status, assignee, due date

**API Routes:**
- `GET /api/tasks/list`
- `POST /api/tasks/create`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

---

## Domain Consoles

### 1. Accounting Close (`/close`)
**Workflow:**
1. Snapshot TB
2. Reconcile banks
3. Propose JEs (agent-generated)
4. Post JEs (requires MANAGER)
5. Analyze variances
6. Build cash flow (indirect)
7. Lock period (requires PARTNER approval)

**API Routes:**
- `POST /api/close/snapshot-tb`
- `POST /api/close/recon-bank`
- `POST /api/close/journals/propose`
- `POST /api/close/journals/post`
- `POST /api/close/variance`
- `POST /api/close/lock`

---

### 2. Audit (`/audit`)
**Workflow:**
1. Create audit plan
2. Design sampling
3. Execute procedures
4. Evaluate estimates
5. Assess going concern
6. Review subsequent events
7. Draft KAMs
8. Assemble report
9. EQR review
10. Release (requires PARTNER + EQR approval)

**API Routes:**
- `POST /api/audit/plan`
- `POST /api/audit/sampling`
- `POST /api/audit/confirmations`
- `POST /api/audit/estimates`
- `POST /api/audit/going-concern`
- `POST /api/audit/subsequent-events`
- `POST /api/audit/kam`
- `POST /api/audit/report`
- `POST /api/audit/tcwg`

---

### 3. Tax (`/tax`)
**Features:**
- Corporate Income Tax (CIT) computation
- VAT return preparation
- DAC6 classification
- Pillar Two scope determination
- Pillar Two top-up tax computation

**Jurisdictions:**
- Malta (primary)
- International (DAC6, Pillar Two)

**API Routes:**
- `POST /api/tax/cit/compute`
- `POST /api/tax/vat/prepare`
- `POST /api/tax/dac6/classify`
- `POST /api/tax/pillar-two/scope`
- `POST /api/tax/pillar-two/compute`

---

## Assistant Dock

### Features

**1. ⌘K Hotkey:**
- Universal command palette
- Quick actions
- Navigation shortcuts
- Recent searches

**2. Voice Input:**
- Push-to-talk button
- OpenAI Realtime API
- Transcription display
- Voice feedback

**3. Citations:**
- Every response includes sources
- Page numbers + excerpts
- Confidence scores (≥60%)
- Click to view source document

**4. Context-Aware Chips:**
Page-specific suggestions:
- Dashboard: "Add company", "What's next?"
- Documents: "Summarize", "Extract key fields"
- Accounting: "Run bank rec", "Propose JE"
- Audit: "Create plan", "Run sampling"
- Tax: "Compute CIT", "Build VAT return"

### Implementation
```typescript
import { useHotkeys } from 'react-hotkeys-hook';

export function AssistantDock() {
  const [isOpen, setIsOpen] = useState(false);
  useHotkeys('mod+k', () => setIsOpen(true));
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AssistantChat
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        contextChips={getChipsForCurrentPage()}
      />
    </div>
  );
}
```

---

## 20+ API Routes Summary

### Authentication (4)
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `POST /api/auth/reset-password`

### Documents (4)
- `GET /api/documents/list`
- `POST /api/documents/upload`
- `GET /api/documents/:id`
- `DELETE /api/documents/:id`

### Tasks (3)
- `GET /api/tasks/list`
- `POST /api/tasks/create`
- `PUT /api/tasks/:id`

### Onboarding (2)
- `POST /api/onboarding/start`
- `POST /api/onboarding/commit`

### Accounting Close (3)
- `POST /api/close/snapshot-tb`
- `POST /api/close/journals/post`
- `POST /api/close/lock`

### Audit (2)
- `POST /api/audit/plan`
- `POST /api/audit/report`

### Tax (2)
- `POST /api/tax/cit/compute`
- `POST /api/tax/vat/prepare`

### Assistant (2)
- `POST /api/assistant/query`
- `POST /api/assistant/feedback`

**Total:** 22 routes

---

## PWA Validation

### Lighthouse Audit

**Target Scores:** ≥90 for all categories
- Performance
- Accessibility
- Best Practices
- SEO
- PWA

**Run audit:**
```bash
pnpm exec lighthouse https://app.prismaglow.com \
  --output=html \
  --output-path=./lighthouse-report.html
```

### PWA Checklist
- [ ] Manifest configured
- [ ] Service worker registered
- [ ] Icons (192x192, 512x512)
- [ ] Offline fallback page
- [ ] Theme color set
- [ ] Start URL correct
- [ ] Display mode: standalone

---

## Accessibility Validation

**Testing:**
```typescript
import { axe } from 'jest-axe';

test('dashboard has no accessibility violations', async () => {
  const { container } = render(<Dashboard />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Manual Testing:**
- [ ] Keyboard navigation works
- [ ] Screen reader announces all content
- [ ] Focus indicators visible
- [ ] Color contrast passes
- [ ] Touch targets ≥44px
- [ ] Form labels present

---

## Performance Optimization

**Code Splitting:**
```typescript
// apps/web/app/close/page.tsx
const CloseConsole = dynamic(() => import('@/components/close-console'), {
  loading: () => <Skeleton />,
});
```

**Image Optimization:**
```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Prisma Glow"
  width={200}
  height={60}
  priority
/>
```

**API Caching:**
```typescript
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['documents', orgId],
  queryFn: () => apiClient.documents.list({ orgId }),
  staleTime: 60000, // 1 minute
});
```

---

## Version History
- **v1.0.0** (2025-11-02): Initial client app documentation

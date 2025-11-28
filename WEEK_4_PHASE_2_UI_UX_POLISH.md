# Phase 2: UI/UX Polish - Implementation Guide

## PHASE 2A: Animation & Loading States

### Task 1: Activate Code Splitting (App.lazy.tsx)

**File:** `src/main.tsx` or entry point

**Before:**
```typescript
import { App } from './App';
```

**After:**
```typescript
import { App } from './App.lazy';  // Use code-split version
```

**Impact:**
- Initial bundle: 800KB → 250KB (-69%)
- First Contentful Paint: ~3s → ~1.5s (-50%)
- Route-level code splitting active

---

### Task 2: Enhance Loading States

**File:** `src/components/ui/loading.tsx` (ENHANCEMENT)

```typescript
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Add animated shimmer effect
export function SkeletonCard() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
      <div className="h-20 bg-muted rounded"></div>
    </div>
  );
}

// Add progress indicator
export function LoadingProgress({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div 
        className="bg-primary h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// Add inline loader for buttons
export function ButtonLoader() {
  return (
    <Loader2 className="h-4 w-4 animate-spin" />
  );
}
```

---

### Task 3: Polish Animations (Optional - Framer Motion)

**Install (if needed):**
```bash
pnpm add framer-motion
```

**Example: Fade-in animations**
```typescript
import { motion } from 'framer-motion';

export function FadeInCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredList({ children }: { children: React.ReactNode[] }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      {children.map((child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, x: -20 },
            visible: { opacity: 1, x: 0 }
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

### Task 4: Verify Error Boundaries

**Check:**
- Error boundaries are active in App.lazy.tsx ✅
- Fallback UI displays properly
- Error logging works in production

**Test in Dev Console:**
```javascript
// Trigger error to test boundary
throw new Error("Test error boundary");
```

---

## PHASE 2B: Accessibility & Dark Mode

### Task 1: Run Accessibility Audit

**Commands:**
```bash
# Install axe-core for Playwright
pnpm add -D @axe-core/playwright

# Run accessibility tests
pnpm exec playwright test --grep accessibility
```

**Or manual testing:**
```bash
# Use Lighthouse in Chrome DevTools:
# 1. Open DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Select "Accessibility" category
# 4. Click "Generate report"
# Target: Score >= 95
```

---

### Task 2: Fix Common WCAG 2.1 AA Issues

**Common Fixes:**

```typescript
// 1. Add aria-labels to icon buttons
<Button variant="ghost" aria-label="Download document">
  <Download className="h-4 w-4" />
</Button>

// 2. Ensure sufficient color contrast
// Check all text against backgrounds:
// - Normal text: 4.5:1 minimum
// - Large text (18px+): 3:1 minimum

// 3. Add keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClick();
    }
  }}
  onClick={onClick}
>
  Clickable element
</div>

// 4. Add focus indicators
.focus-visible:outline-2
.focus-visible:outline-offset-2
.focus-visible:outline-primary

// 5. Screen reader text
<span className="sr-only">Hidden text for screen readers</span>
```

---

### Task 3: Dark Mode Contrast Checks

**Tools:**
```bash
# Use WebAIM Contrast Checker
# https://webaim.org/resources/contrastchecker/

# Or use Chrome DevTools:
# 1. Inspect element
# 2. Check computed styles
# 3. Look for contrast ratio in color picker
```

**Common dark mode issues:**
```css
/* Ensure borders are visible in dark mode */
.border {
  @apply border-border;  /* Not border-gray-200 */
}

/* Ensure text is readable */
.text-muted {
  @apply text-muted-foreground;  /* Not text-gray-500 */
}

/* Check form inputs */
.input {
  @apply bg-background border-input;
}
```

---

### Task 4: Keyboard Navigation Testing

**Test Checklist:**
- [ ] Tab through all interactive elements
- [ ] Shift+Tab works in reverse
- [ ] Enter activates buttons/links
- [ ] Space activates buttons
- [ ] Escape closes modals/dialogs
- [ ] Arrow keys navigate lists/menus
- [ ] Focus is always visible
- [ ] Focus order is logical

**Example: Add keyboard shortcuts**
```typescript
useEffect(() => {
  const handleKeyboard = (e: KeyboardEvent) => {
    // Cmd/Ctrl + K for command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  
  window.addEventListener('keydown', handleKeyboard);
  return () => window.removeEventListener('keydown', handleKeyboard);
}, []);
```

---

### Task 5: Screen Reader Compatibility

**Add ARIA attributes:**
```typescript
// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {notification && <p>{notification.message}</p>}
</div>

// Progress indicators
<div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
  {progress}%
</div>

// Loading states
<div aria-busy={isLoading} aria-label="Loading content">
  {isLoading ? <Spinner /> : <Content />}
</div>

// Skip links
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

---

## IMPLEMENTATION PRIORITY

### High Priority (Do Now):
1. ✅ Activate App.lazy.tsx in entry point
2. ✅ Verify error boundaries work
3. ✅ Run Lighthouse accessibility audit
4. ✅ Fix critical WCAG issues (if any)

### Medium Priority (Today):
5. ✅ Enhance loading states (SkeletonCard, etc.)
6. ✅ Dark mode contrast checks
7. ✅ Keyboard navigation testing

### Low Priority (Optional):
8. ⏸️ Add animations (framer-motion) - Can skip if time-limited
9. ⏸️ Advanced ARIA enhancements - Basic coverage sufficient

---

## SUCCESS CRITERIA

**Accessibility:**
- [ ] Lighthouse Accessibility score >= 95
- [ ] All interactive elements keyboard accessible
- [ ] Sufficient color contrast (WCAG AA)
- [ ] Screen reader compatible
- [ ] Focus indicators visible

**Performance:**
- [ ] Code splitting active (App.lazy.tsx)
- [ ] Loading states consistent
- [ ] Error boundaries catching errors
- [ ] No console errors in production build

---

## ESTIMATED TIME

**Phase 2A:** 2 hours
- Activate App.lazy: 15 min
- Enhance loading: 30 min
- Polish animations: 1 hr 15 min (or skip)

**Phase 2B:** 2 hours
- Accessibility audit: 30 min
- Fix WCAG issues: 1 hr
- Keyboard testing: 30 min

**Total:** 4 hours (or 2.5 hours if skipping animations)

---

## NEXT STEPS

After Phase 2 completion:
- ✅ Virtual components integrated
- ✅ Caching activated
- ✅ UI/UX polished
- ✅ Accessibility validated
- **Week 4 Progress:** 50% → 70%

**Then:** Deploy to Staging! 🚀

/**
 * Performance Optimization Guide
 * Phase 5: Bundle size reduction & lazy loading
 */

# Phase 5: Performance Optimization Implementation

## 🎯 Goals
- Reduce bundle size from 800KB → <500KB
- Improve Lighthouse score from 78 → >90
- Implement code splitting & lazy loading
- Optimize images and assets

## 1. Code Splitting Strategy

### Route-Based Code Splitting (✅ Already Implemented)
```tsx
// App.tsx - Already using lazy loading
const Dashboard = lazyNamed(() => import('./pages/dashboard'), 'Dashboard');
const Documents = lazyNamed(() => import('./pages/documents'), 'Documents');
```

### Component-Based Lazy Loading (NEW)
```tsx
// Heavy components to lazy load:
const CommandPalette = lazy(() => import('@/components/smart/CommandPalette'));
const FloatingAssistant = lazy(() => import('@/components/smart/FloatingAssistant'));
const ChartComponents = lazy(() => import('@/components/charts'));
```

## 2. Bundle Analysis

### Run Bundle Analyzer
```bash
# Install analyzer
pnpm add -D rollup-plugin-visualizer

# Update vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});

# Build and analyze
pnpm run build
```

### Expected Heavy Dependencies
- `framer-motion` (~100KB) - Keep, core to UX
- `@tanstack/react-query` (~40KB) - Keep, essential
- `lucide-react` - Replace with tree-shakeable icons
- `date-fns` - Replace with lighter alternative

## 3. Dependency Optimization

### Replace Heavy Packages
```bash
# Before
pnpm remove date-fns
pnpm add dayjs  # 2KB vs 70KB

# Replace moment.js if used
pnpm remove moment
pnpm add dayjs
```

### Tree-Shake Lucide Icons
```tsx
// ❌ Bad - imports all icons
import * as Icons from 'lucide-react';

// ✅ Good - imports only needed icons
import { Home, FileText, Settings } from 'lucide-react';
```

## 4. Image Optimization

### Use Next-Gen Formats
```tsx
// Install image optimizer
pnpm add -D vite-plugin-imagemin

// vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      webp: { quality: 80 },
    }),
  ],
});
```

### Lazy Load Images
```tsx
// Use native lazy loading
<img src="..." alt="..." loading="lazy" />

// Or use Intersection Observer for custom logic
import { useInView } from 'react-intersection-observer';

function LazyImage({ src, alt }) {
  const { ref, inView } = useInView({ triggerOnce: true });
  return <img ref={ref} src={inView ? src : placeholder} alt={alt} />;
}
```

## 5. Virtual Scrolling (Large Lists)

### Install React Window
```bash
pnpm add react-window
pnpm add -D @types/react-window
```

### Implement for Documents/Tasks
```tsx
import { FixedSizeList } from 'react-window';

function VirtualizedDocumentList({ documents }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <DocumentRow document={documents[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={documents.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

## 6. Memoization & React Optimization

### Use React.memo for Heavy Components
```tsx
import { memo } from 'react';

export const ExpensiveComponent = memo(({ data }) => {
  // Heavy rendering logic
  return <div>{/* ... */}</div>;
});
```

### useMemo & useCallback
```tsx
const sortedData = useMemo(
  () => data.sort((a, b) => a.name.localeCompare(b.name)),
  [data]
);

const handleClick = useCallback(() => {
  // Handler logic
}, [dependency]);
```

## 7. Service Worker & Caching

### Enable Workbox (PWA)
```bash
pnpm add -D vite-plugin-pwa
```

```tsx
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
});
```

## 8. Critical CSS & Font Loading

### Inline Critical CSS
```html
<!-- index.html -->
<style>
  /* Critical above-the-fold CSS */
  body { margin: 0; font-family: system-ui; }
  .loading { /* ... */ }
</style>
```

### Optimize Font Loading
```css
/* Use font-display: swap */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
}
```

## 9. Remove Unused Code

### Analyze Dead Code
```bash
# Use depcheck
pnpm add -D depcheck
pnpm exec depcheck

# Remove unused dependencies
pnpm remove <unused-package>
```

### Tree-Shake CSS
```bash
# Use PurgeCSS with Tailwind (already configured)
# Ensure tailwind.config.ts has correct content paths
```

## 10. Lighthouse CI Integration

### Add Lighthouse CI
```bash
pnpm add -D @lhci/cli

# .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm preview',
      url: ['http://localhost:4173'],
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
  },
};
```

## 📊 Expected Results

| Metric | Before | Target | Strategy |
|--------|--------|--------|----------|
| Bundle Size | 800KB | <500KB | Code splitting, tree-shaking |
| First Load JS | 350KB | <200KB | Lazy loading, fewer deps |
| Lighthouse Perf | 78 | >90 | All optimizations |
| Time to Interactive | 3.2s | <2s | Critical CSS, defer JS |
| Largest Contentful Paint | 2.8s | <2.5s | Image optimization |

## ✅ Implementation Checklist

- [ ] Run bundle analyzer
- [ ] Replace heavy dependencies (date-fns → dayjs)
- [ ] Implement virtual scrolling for documents/tasks
- [ ] Add React.memo to expensive components
- [ ] Enable service worker caching
- [ ] Optimize images (WebP, lazy loading)
- [ ] Lighthouse CI integration
- [ ] Remove unused code & dependencies
- [ ] Critical CSS extraction
- [ ] Font loading optimization

---

**Next Steps**: After implementing these optimizations, re-run Lighthouse and bundle analysis to measure improvements.

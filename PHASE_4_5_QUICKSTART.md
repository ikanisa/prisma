# PHASE 4 & 5: UI/UX REDESIGN - QUICK START GUIDE

**Status**: 🚀 Ready to Implement  
**Timeline**: 3 Weeks  
**Last Updated**: 2025-01-28

---

## 🎯 OVERVIEW

This guide provides step-by-step instructions to implement the complete UI/UX redesign with:
- ✨ Minimalist, fluid, responsive design
- 🤖 AI-powered features (Gemini integration)
- 🖥️ Desktop app capabilities (Tauri)
- ⚡ Performance optimization (<600KB bundle)
- ♿ WCAG 2.1 AA accessibility

---

## 📋 PREREQUISITES

### Required Tools
```bash
# Node.js 22.12.0
node --version  # Should output v22.12.0

# pnpm 9.12.3
pnpm --version  # Should output 9.12.3

# Rust (for Tauri desktop app)
rustc --version  # Should output 1.75+
cargo --version
```

### Install Dependencies
```bash
# Install all workspace dependencies
pnpm install --frozen-lockfile

# Install Tauri CLI (for desktop app)
cargo install tauri-cli

# Install Playwright (for e2e tests)
pnpm exec playwright install --with-deps
```

---

## 🚀 PHASE 4: ADVANCED FEATURES (Week 1-2)

### Day 1-2: Gemini AI Integration

#### Step 1: Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env.local`:
```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

#### Step 2: Create Gemini Service
```bash
# The service is already created in:
# /Users/jeanbosco/workspace/prisma/PHASE_4_5_UI_REDESIGN_COMPLETE.md

# Copy the implementation to your project:
mkdir -p prisma-glow-ui/src/services
# Then copy from the blueprint
```

#### Step 3: Test Gemini Integration
```bash
# Create a test file
cat > prisma-glow-ui/src/services/__tests__/gemini.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { geminiService } from '../gemini.service';

describe('GeminiService', () => {
  it('should generate embeddings', async () => {
    const embedding = await geminiService.generateEmbedding('test query');
    expect(embedding).toBeInstanceOf(Array);
    expect(embedding.length).toBeGreaterThan(0);
  });

  it('should enhance document summary', async () => {
    const summary = await geminiService.enhanceDocumentSummary(
      'This is a long document that needs summarization...'
    );
    expect(summary).toBeTruthy();
    expect(summary.length).toBeLessThan(200);
  });
});
EOF

# Run the test
pnpm test gemini.test.ts
```

### Day 3-4: Virtual Scrolling for Documents

#### Step 1: Install Dependency
```bash
pnpm add @tanstack/react-virtual
```

#### Step 2: Implement Virtual Document List
See `PHASE_4_5_UI_REDESIGN_COMPLETE.md` for the full `VirtualDocumentList` component.

#### Step 3: Test with 10,000+ Items
```bash
# Create mock data generator
cat > prisma-glow-ui/src/__tests__/helpers/mockDocuments.ts << 'EOF'
export function generateMockDocuments(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `doc-${i}`,
    name: `Document ${i}`,
    description: `Description for document ${i}`,
    size: `${Math.floor(Math.random() * 1000)}KB`,
    uploadedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}
EOF

# Test rendering performance
pnpm test:performance
```

### Day 5: Advanced Command Palette

#### Step 1: Install Dependencies
```bash
pnpm add cmdk react-hotkeys-hook
```

#### Step 2: Implement Command Palette
See `PHASE_4_5_UI_REDESIGN_COMPLETE.md` for the `AdvancedCommandPalette` component.

#### Step 3: Add Keyboard Shortcuts
```typescript
// prisma-glow-ui/src/hooks/useKeyboardShortcuts.ts
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useHotkeys('mod+1', () => navigate('/'));
  useHotkeys('mod+2', () => navigate('/documents'));
  useHotkeys('mod+3', () => navigate('/tasks'));
  useHotkeys('mod+n', () => {
    // Open new document dialog
  });
  useHotkeys('mod+t', () => {
    // Open new task dialog
  });
}
```

---

## 🖥️ PHASE 5: DESKTOP APP (Week 3)

### Day 1-2: Tauri Setup

#### Step 1: Initialize Tauri
```bash
cd /Users/jeanbosco/workspace/prisma

# Create Tauri project
cargo tauri init

# Answer prompts:
# - App name: Prisma Glow
# - Window title: Prisma Glow
# - Web assets: ../prisma-glow-ui/dist
# - Dev server: http://localhost:5173
# - Frontend dev command: pnpm --filter prisma-glow-ui dev
# - Frontend build command: pnpm --filter prisma-glow-ui build
```

#### Step 2: Configure Tauri
Copy the `tauri.conf.json` from `PHASE_4_5_UI_REDESIGN_COMPLETE.md`.

#### Step 3: Add Gemini Commands to Rust
Copy the Rust code from `src-tauri/src/main.rs` in the blueprint.

#### Step 4: Test Desktop Build
```bash
# Development mode
cargo tauri dev

# Production build
cargo tauri build
```

### Day 3-4: Desktop-Specific Features

#### Custom Title Bar
See `TitleBar.tsx` component in the blueprint.

#### File System Access
```typescript
// prisma-glow-ui/src/hooks/useFileSystem.ts
import { open, save } from '@tauri-apps/api/dialog';
import { readBinaryFile, writeBinaryFile } from '@tauri-apps/api/fs';

export function useFileSystem() {
  const openFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Documents',
        extensions: ['pdf', 'docx', 'txt']
      }]
    });

    if (selected) {
      const contents = await readBinaryFile(selected as string);
      return { path: selected, contents };
    }
  };

  const saveFile = async (data: Uint8Array, defaultPath?: string) => {
    const path = await save({
      defaultPath,
      filters: [{
        name: 'Documents',
        extensions: ['pdf']
      }]
    });

    if (path) {
      await writeBinaryFile(path, data);
    }
  };

  return { openFile, saveFile };
}
```

#### System Notifications
```typescript
// prisma-glow-ui/src/hooks/useNotifications.ts
import { sendNotification } from '@tauri-apps/api/notification';

export function useNotifications() {
  const notify = async (title: string, body: string) => {
    await sendNotification({
      title,
      body,
      icon: '/icon.png',
    });
  };

  return { notify };
}
```

### Day 5: Build & Package

#### macOS
```bash
cargo tauri build --target x86_64-apple-darwin
cargo tauri build --target aarch64-apple-darwin

# Universal binary
cargo tauri build --target universal-apple-darwin

# Output: src-tauri/target/release/bundle/dmg/
```

#### Windows
```bash
cargo tauri build --target x86_64-pc-windows-msvc

# Output: src-tauri/target/release/bundle/msi/
```

#### Linux
```bash
cargo tauri build --target x86_64-unknown-linux-gnu

# Output: src-tauri/target/release/bundle/deb/
# Output: src-tauri/target/release/bundle/appimage/
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### Bundle Analysis
```bash
# Build with stats
pnpm --filter prisma-glow-ui build

# Analyze bundle
open prisma-glow-ui/dist/stats.html
```

### Code Splitting
```typescript
// prisma-glow-ui/src/App.tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Documents = lazy(() => import('./pages/Documents'));
const Tasks = lazy(() => import('./pages/Tasks'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/tasks" element={<Tasks />} />
      </Routes>
    </Suspense>
  );
}
```

### Lighthouse Audit
```bash
# Build production bundle
pnpm --filter prisma-glow-ui build

# Serve locally
pnpm --filter prisma-glow-ui preview

# Run Lighthouse
npx lighthouse http://localhost:4173 --view
```

**Target Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

---

## ♿ ACCESSIBILITY TESTING

### Automated Testing
```bash
# Install axe-core
pnpm add -D @axe-core/playwright

# Run accessibility tests
pnpm test:a11y
```

### Manual Testing Checklist
- [ ] Keyboard navigation (Tab through all interactive elements)
- [ ] Screen reader (test with NVDA/JAWS on Windows, VoiceOver on Mac)
- [ ] Color contrast (use browser DevTools)
- [ ] Focus indicators visible
- [ ] Form labels properly associated
- [ ] ARIA attributes correct

### Screen Reader Testing
```bash
# macOS - VoiceOver
# Press Cmd+F5 to enable VoiceOver
# Navigate with VoiceOver+Arrow keys

# Windows - NVDA
# Download from https://www.nvaccess.org/
# Press Insert+Down arrow to read content
```

---

## 📊 TESTING STRATEGY

### Unit Tests
```bash
# Run all tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

### E2E Tests
```bash
# Run Playwright tests
pnpm test:e2e

# Debug mode
pnpm test:e2e --debug

# Specific test
pnpm test:e2e tests/documents.spec.ts
```

### Performance Tests
```bash
# Load testing with k6
k6 run scripts/perf/load-test.js

# Stress testing
k6 run scripts/perf/stress-test.js
```

---

## 🚢 DEPLOYMENT

### Pre-Release Checklist
- [ ] All tests passing (`pnpm test && pnpm test:e2e`)
- [ ] Lighthouse scores ≥90
- [ ] Bundle size <600KB
- [ ] Accessibility audit clean (axe-core 0 violations)
- [ ] Desktop builds successful (macOS, Windows, Linux)
- [ ] Changelog updated
- [ ] Version bumped in `package.json`

### Release Process
```bash
# 1. Update version
pnpm version patch  # or minor, major

# 2. Build all targets
pnpm build

# 3. Build desktop apps
cargo tauri build --target universal-apple-darwin
cargo tauri build --target x86_64-pc-windows-msvc
cargo tauri build --target x86_64-unknown-linux-gnu

# 4. Create GitHub release
gh release create v1.0.0 \
  src-tauri/target/release/bundle/dmg/*.dmg \
  src-tauri/target/release/bundle/msi/*.msi \
  src-tauri/target/release/bundle/deb/*.deb \
  --title "Prisma Glow v1.0.0" \
  --notes-file CHANGELOG.md

# 5. Deploy web app
pnpm deploy
```

---

## 🐛 TROUBLESHOOTING

### Gemini API Issues
```bash
# Check API key is set
echo $VITE_GEMINI_API_KEY

# Test API manually
curl -X POST \
  https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent \
  -H "x-goog-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Tauri Build Errors
```bash
# Clean build cache
cargo clean

# Update dependencies
cargo update

# Check Rust version
rustc --version  # Should be 1.75+
```

### Bundle Size Too Large
```bash
# Analyze bundle
pnpm --filter prisma-glow-ui build
open prisma-glow-ui/dist/stats.html

# Check for large dependencies
npx depcheck

# Remove unused dependencies
pnpm prune
```

### Lighthouse Score Low
```bash
# Check what's failing
npx lighthouse http://localhost:4173 --view

# Common fixes:
# - Enable compression (gzip/brotli)
# - Optimize images (use WebP)
# - Lazy load components
# - Reduce JavaScript execution time
```

---

## 📚 NEXT STEPS

1. **Week 1**: Implement Gemini AI features
   - Set up API key
   - Test document processing
   - Add semantic search

2. **Week 2**: Add desktop capabilities
   - Initialize Tauri
   - Implement custom title bar
   - Add file system access

3. **Week 3**: Optimize & polish
   - Bundle optimization
   - Accessibility audit
   - Performance testing
   - Deploy desktop apps

---

## 🤝 GETTING HELP

- **Documentation**: See `PHASE_4_5_UI_REDESIGN_COMPLETE.md`
- **Issues**: Create GitHub issue with `[UI Redesign]` prefix
- **Questions**: Ask in team Slack #ui-redesign channel

---

## ✅ SUCCESS METRICS

### Performance
- [x] Bundle size: <600KB ✓
- [ ] FCP: <1.5s
- [ ] LCP: <2.5s
- [ ] TTI: <3.5s
- [ ] Lighthouse: 90+

### Accessibility
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation complete
- [ ] Screen reader tested
- [ ] Color contrast 4.5:1+

### Features
- [ ] Gemini AI integrated
- [ ] Virtual scrolling (10,000+ items)
- [ ] Command palette (⌘K)
- [ ] Desktop app builds

---

**Ready to begin? Start with Phase 4, Day 1!** 🚀

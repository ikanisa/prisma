# Desktop App Production Readiness - Action Checklist

**Status:** 40% Complete  
**Target:** Production-ready macOS app  
**Timeline:** 6-10 weeks  
**Last Updated:** 2025-12-02

---

## 🔴 Phase 1: Infrastructure Consolidation (WEEK 1)

**Owner:** Tech Lead  
**Priority:** CRITICAL  
**Effort:** 2-3 days

### Day 1: Decision & Backup
- [ ] **DECISION:** Commit to Tauri 2.0 as canonical version
- [ ] Backup `desktop-app/tauri.conf.json` settings
- [ ] Backup `desktop-app/src-tauri/Cargo.toml` dependencies
- [ ] Document any unique configs in `desktop-app/`
- [ ] Create git branch: `refactor/consolidate-tauri`

### Day 2-3: Consolidation
- [ ] Delete `desktop-app/` directory entirely
  ```bash
  git rm -rf desktop-app/
  ```
- [ ] Upgrade `src-tauri/Cargo.toml` to Tauri 2.0
  ```toml
  [dependencies]
  tauri = { version = "2.0", features = [...] }
  ```
- [ ] Migrate `src-tauri/tauri.conf.json` to 2.x format
  - Change schema to `https://schema.tauri.app/config/2.0`
  - Update structure (build, app, bundle sections)
- [ ] Update `src-tauri/tauri.conf.json` build paths:
  ```json
  {
    "build": {
      "beforeDevCommand": "pnpm run dev",
      "beforeBuildCommand": "pnpm run build",
      "devPath": "http://localhost:5173",
      "distDir": "../dist"
    }
  }
  ```
- [ ] Test build: `cd src-tauri && cargo build`
- [ ] Fix any Tauri 1.x → 2.x API changes in Rust code
- [ ] Commit: "refactor: consolidate to single Tauri 2.0 project"

### Validation
- [ ] Run: `pnpm tauri dev` → App launches
- [ ] Verify: Vite dev server starts at :5173
- [ ] Check: Rust commands still accessible
- [ ] Test: System tray appears on macOS

**Deliverable:** Single unified Tauri 2.0 project

---

## 🔴 Phase 2: React Integration (WEEK 2)

**Owner:** Frontend Developer  
**Priority:** CRITICAL  
**Effort:** 3-4 days

### Task 2.1: Main App Integration
- [ ] Update `src/main.tsx`:
  ```typescript
  import { useTauri } from '@/hooks/useTauri';
  
  function Main() {
    const { isTauri } = useTauri();
    
    useEffect(() => {
      if (isTauri) {
        // Initialize desktop features
        invoke('init_local_db', { dbPath: './prisma.db' });
      }
    }, [isTauri]);
  }
  ```

### Task 2.2: Conditional TitleBar
- [ ] Update `src/App.tsx`:
  ```typescript
  import { TitleBar } from '@/components/desktop/TitleBar';
  import { useTauri } from '@/hooks/useTauri';
  
  export function App() {
    const { isTauri } = useTauri();
    
    return (
      <>
        {isTauri && <TitleBar />}
        <Router>
          {/* existing routes */}
        </Router>
      </>
    );
  }
  ```

### Task 2.3: System Tray Integration
- [ ] Import `SystemTrayMenu` component
- [ ] Listen to Tauri events:
  ```typescript
  listen('open-ai-dialog', () => {
    navigate('/ai-assistant');
  });
  
  listen('trigger-sync', async () => {
    await syncService.syncToServer();
  });
  ```

### Task 2.4: Desktop Features Page
- [ ] Create route: `/settings/desktop`
- [ ] Import `DesktopFeatures` component
- [ ] Add to settings navigation

### Validation
- [ ] Run: `pnpm tauri dev`
- [ ] Check: Custom titlebar appears (if isTauri)
- [ ] Test: All routes accessible
- [ ] Verify: Web version still works (no titlebar)
- [ ] Test: System tray menu items trigger navigation

**Deliverable:** React app integrated with Tauri shell

---

## 🔴 Phase 3: Offline Sync Service (WEEK 2)

**Owner:** Full-Stack Developer  
**Priority:** CRITICAL  
**Effort:** 2-3 days

### Task 3.1: Create Sync Service
- [ ] Create file: `src/services/sync.ts`
  ```typescript
  export class OfflineSyncService {
    private dbPath = './prisma.db';
    
    async init() {
      await invoke('init_local_db', { dbPath: this.dbPath });
    }
    
    async syncToServer(): Promise<SyncResult> {
      const changes = await invoke('sync_from_local', { 
        dbPath: this.dbPath 
      });
      
      if (changes.documents.length === 0 && changes.tasks.length === 0) {
        return { status: 'no-changes', synced: 0 };
      }
      
      const response = await api.post('/sync/push', changes);
      return { status: 'success', synced: changes.documents.length + changes.tasks.length };
    }
    
    async syncFromServer(): Promise<void> {
      const data = await api.get('/sync/pull');
      await invoke('sync_to_local', { 
        dbPath: this.dbPath,
        data 
      });
    }
    
    async getOfflineData(table: 'documents' | 'tasks') {
      return await invoke('get_offline_data', {
        dbPath: this.dbPath,
        table
      });
    }
  }
  ```

### Task 3.2: Network Detection Hook
- [ ] Create file: `src/hooks/useOfflineSync.ts`
  ```typescript
  export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    
    useEffect(() => {
      const handleOnline = () => {
        setIsOnline(true);
        syncService.syncToServer();
      };
      
      const handleOffline = () => {
        setIsOnline(false);
      };
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }, []);
    
    return { isOnline, syncStatus };
  }
  ```

### Task 3.3: Conflict Resolution
- [ ] Implement last-write-wins strategy
- [ ] Add UI for conflict review
- [ ] Add manual sync button in UI

### Validation
- [ ] Test: Create document offline → Goes to local DB
- [ ] Test: Go online → Document syncs to server
- [ ] Test: Server changes → Download and merge
- [ ] Check: No data loss during sync

**Deliverable:** Working offline-first data sync

---

## 🔴 Phase 4: Code Signing (WEEK 3)

**Owner:** DevOps Engineer  
**Priority:** CRITICAL  
**Effort:** 5-7 days (includes Apple approval wait)

### Task 4.1: Apple Developer Program
- [ ] Enroll at https://developer.apple.com/programs/
- [ ] Pay $99 annual fee
- [ ] Wait for approval (1-2 days typically)
- [ ] Note down Team ID

### Task 4.2: Create Certificates
- [ ] Open Xcode → Preferences → Accounts → Manage Certificates
- [ ] Create "Developer ID Application" certificate
- [ ] Create "Developer ID Installer" certificate
- [ ] Export both as .p12 files with password

### Task 4.3: Configure CI/CD Secrets
- [ ] Encode certificate to base64:
  ```bash
  base64 -i DeveloperID.p12 -o cert.base64
  ```
- [ ] Add GitHub Secrets:
  - `MACOS_CERT_P12`: `<paste base64 content>`
  - `MACOS_CERT_PASSWORD`: `<p12 password>`
  - `APPLE_ID`: `<your apple ID>`
  - `APPLE_TEAM_ID`: `<from developer portal>`
  - `APPLE_APP_SPECIFIC_PASSWORD`: `<generate at appleid.apple.com>`

### Task 4.4: Enable Notarization
- [ ] Create `src-tauri/entitlements.plist`:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
  </dict>
  </plist>
  ```
- [ ] Update `tauri.conf.json`:
  ```json
  {
    "bundle": {
      "macOS": {
        "entitlements": "entitlements.plist",
        "hardenedRuntime": true,
        "signingIdentity": null
      }
    }
  }
  ```

### Task 4.5: Update CI Workflow
- [ ] Add notarization step to `.github/workflows/desktop-build-sign.yml`:
  ```yaml
  - name: Notarize app
    run: |
      xcrun notarytool submit "Prisma Glow.app.zip" \
        --apple-id "${{ secrets.APPLE_ID }}" \
        --team-id "${{ secrets.APPLE_TEAM_ID }}" \
        --password "${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}" \
        --wait
      
      xcrun stapler staple "Prisma Glow.app"
  ```

### Validation
- [ ] Local test: `./scripts/sign_app.sh dist/mac/PrismaGlow.app`
- [ ] Verify: No Gatekeeper warning on launch
- [ ] CI test: Push to main → Check workflow succeeds
- [ ] Download artifact → Test on fresh Mac → No warnings

**Deliverable:** Signed and notarized macOS app

---

## 🟡 Phase 5: Testing Infrastructure (WEEK 4-5)

**Owner:** QA Engineer + Developers  
**Priority:** HIGH  
**Effort:** 8-10 days

### Task 5.1: Unit Tests (Vitest)
- [ ] Create `tests/unit/hooks/useTauri.test.ts`
- [ ] Create `tests/unit/hooks/useFileSystem.test.ts`
- [ ] Create `tests/unit/services/sync.test.ts`
- [ ] Mock Tauri APIs:
  ```typescript
  vi.mock('@tauri-apps/api/tauri', () => ({
    invoke: vi.fn()
  }));
  ```
- [ ] Run: `pnpm run test`
- [ ] Target: 80% coverage for desktop code

### Task 5.2: Rust Tests
- [ ] Add to `src-tauri/src/commands/database.rs`:
  ```rust
  #[cfg(test)]
  mod tests {
      use super::*;
      use tempfile::tempdir;
      
      #[test]
      fn test_init_local_db() { /* ... */ }
      
      #[test]
      fn test_sync_to_local() { /* ... */ }
  }
  ```
- [ ] Run: `cd src-tauri && cargo test`
- [ ] Target: All commands tested

### Task 5.3: E2E Tests (Playwright)
- [ ] Install: `pnpm add -D @playwright/test`
- [ ] Configure Tauri driver
- [ ] Create `tests/e2e/desktop/file-operations.spec.ts`
- [ ] Create `tests/e2e/desktop/offline-sync.spec.ts`
- [ ] Run: `pnpm run test:e2e`

### Task 5.4: Performance Tests
- [ ] Measure app launch time (target: < 2s)
- [ ] Measure memory usage (target: < 150MB idle)
- [ ] Measure bundle size (target: < 40MB)
- [ ] Document results

### Validation
- [ ] All unit tests pass
- [ ] All Rust tests pass
- [ ] E2E tests run in CI
- [ ] Coverage gates met

**Deliverable:** Comprehensive test suite

---

## 🟢 Phase 6: Production Polish (WEEK 5-6)

**Owner:** Product Team  
**Priority:** MEDIUM  
**Effort:** 5-7 days

### Task 6.1: Auto-Updater
- [ ] Generate updater keys:
  ```bash
  pnpm tauri signer generate
  ```
- [ ] Add to GitHub Secrets: `TAURI_PRIVATE_KEY`, `TAURI_KEY_PASSWORD`
- [ ] Configure update endpoint in `tauri.conf.json`
- [ ] Test update flow

### Task 6.2: Universal Binary
- [ ] Install targets:
  ```bash
  rustup target add aarch64-apple-darwin
  rustup target add x86_64-apple-darwin
  ```
- [ ] Build: `pnpm tauri build --target universal-apple-darwin`
- [ ] Test on Intel and Apple Silicon Macs

### Task 6.3: DMG Installer
- [ ] Install: `pnpm add -D create-dmg`
- [ ] Create script: `scripts/create-dmg.sh`
- [ ] Add to CI workflow

### Task 6.4: Accessibility
- [ ] Test VoiceOver navigation
- [ ] Implement keyboard shortcuts
- [ ] Add reduce motion support

### Task 6.5: Error Reporting
- [ ] Install: `pnpm add @sentry/tauri`
- [ ] Configure Sentry DSN
- [ ] Test error capture

### Task 6.6: Documentation
- [ ] Write user guide
- [ ] Document keyboard shortcuts
- [ ] Create troubleshooting FAQ

### Validation
- [ ] Auto-updates work
- [ ] Universal binary runs on both architectures
- [ ] DMG installer works
- [ ] Accessibility tested
- [ ] Errors reported to Sentry

**Deliverable:** Production-ready macOS app

---

## 📊 Progress Tracking

### Completion Status
- [ ] Phase 1: Infrastructure (0/10 tasks)
- [ ] Phase 2: React Integration (0/15 tasks)
- [ ] Phase 3: Offline Sync (0/8 tasks)
- [ ] Phase 4: Code Signing (0/12 tasks)
- [ ] Phase 5: Testing (0/10 tasks)
- [ ] Phase 6: Polish (0/12 tasks)

**Overall: 0/67 tasks (0%)**

### Milestones
- [ ] **M1:** Single Tauri project (Week 1)
- [ ] **M2:** React integrated (Week 2)
- [ ] **M3:** Offline sync working (Week 2)
- [ ] **M4:** Code signed (Week 3)
- [ ] **M5:** Tests passing (Week 5)
- [ ] **M6:** Beta release (Week 6)

### Risk Tracker
| Risk | Mitigation | Status |
|------|------------|--------|
| Apple approval delay | Apply early, use self-signed for testing | 🟡 Medium |
| Tauri 2.0 migration issues | Follow migration guide, test incrementally | 🟡 Medium |
| Offline sync conflicts | Implement simple last-write-wins first | 🟢 Low |
| Test environment setup | Use GitHub Actions runners | 🟢 Low |

---

## 🚀 Quick Start (Today)

**To get started immediately:**

1. **Review audit report:**
   ```bash
   cat DESKTOP_APP_FULL_STACK_AUDIT.md
   ```

2. **Create GitHub issues:**
   - Issue #1: Consolidate Tauri projects
   - Issue #2: Integrate React with Tauri
   - Issue #3: Implement offline sync service
   - Issue #4: Setup code signing
   - Issue #5: Add desktop tests

3. **Assign owners:**
   - Tech Lead → Phase 1
   - Frontend Dev → Phase 2
   - Full-Stack Dev → Phase 3
   - DevOps → Phase 4
   - QA → Phase 5

4. **Start Phase 1:**
   ```bash
   git checkout -b refactor/consolidate-tauri
   # Follow Phase 1 checklist
   ```

---

**Next Review:** After Phase 1 completion  
**Contact:** See DESKTOP_APP_FULL_STACK_AUDIT.md for details


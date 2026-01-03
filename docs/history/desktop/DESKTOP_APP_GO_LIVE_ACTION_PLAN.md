# Desktop App Go-Live Action Plan
**Status:** ⚠️ NOT READY - 42% Complete  
**Estimated Time to Production:** 8-12 weeks  
**Last Updated:** 2025-12-02

---

## 🚨 CRITICAL BLOCKERS (Must Fix First)

### 1. Build System Broken ❌
**Problem:** Dependencies won't install, Tauri CLI non-functional  
**Impact:** Cannot build desktop app at all  
**Fix:**
```bash
cd desktop-app
rm -rf node_modules pnpm-lock.yaml
pnpm install --frozen-lockfile
pnpm tauri info  # Should work
pnpm tauri build # Test build
```
**Time:** 1-2 days  
**Owner:** DevOps/Build Engineer

---

### 2. No App Integration ❌
**Problem:** Desktop app shows HTML placeholders, not real Next.js UI  
**Impact:** Users see demo pages instead of actual features  
**Fix:**
```json
// desktop-app/src-tauri/tauri.conf.json
{
  "build": {
    "distDir": "../../apps/web/out",  // Use Next.js build
    "beforeBuildCommand": "cd ../../apps/web && pnpm build"
  }
}
```
**Time:** 2 weeks (integration + testing)  
**Owner:** Frontend Lead

---

### 3. No API Connectivity ❌
**Problem:** Desktop app can't talk to FastAPI backend or Supabase  
**Impact:** No data, no authentication, offline only  
**Fix:**
```rust
// Add to Cargo.toml
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
postgrest = "1.0"

// Implement in src/main.rs
#[tauri::command]
async fn api_call(endpoint: String, token: String) -> Result<Value, String> {
    // HTTP client implementation
}
```
**Time:** 2 weeks  
**Owner:** Backend Engineer

---

### 4. No Authentication ❌
**Problem:** Users can't login to desktop app  
**Impact:** App is completely unusable  
**Fix:**
```rust
use keyring::Entry;

#[tauri::command]
async fn login(email: String, password: String) -> Result<User, String> {
    // Call Supabase auth
    // Store token in macOS Keychain
    let entry = Entry::new("com.prisma-glow", "auth_token")?;
    entry.set_password(&token)?;
    Ok(user)
}
```
**Time:** 2 weeks  
**Owner:** Auth/Security Engineer

---

### 5. No Production Security ❌
**Problem:** Self-signed certificate only, no notarization  
**Impact:** macOS Gatekeeper blocks app, users can't install  
**Fix:**
1. Purchase Apple Developer account ($99/year)
2. Generate distribution certificate
3. Configure notarization in CI/CD
4. Test with real users

**Time:** 1 week  
**Cost:** $99/year  
**Owner:** DevOps + Legal

---

### 6. Zero Tests ❌
**Problem:** No automated tests for any desktop functionality  
**Impact:** High risk of bugs, no regression detection  
**Fix:**
```rust
// src-tauri/src/main.rs
#[cfg(test)]
mod tests {
    #[test]
    fn test_file_operations() { /* ... */ }
    
    #[tokio::test]
    async fn test_api_call() { /* ... */ }
}
```
**Time:** 2 weeks  
**Owner:** QA/Test Engineer

---

### 7. No Monitoring ❌
**Problem:** No crash reports, analytics, or error tracking  
**Impact:** Can't detect issues, no usage data  
**Fix:**
```rust
// Add Sentry
use sentry_tauri::sentry;

fn main() {
    let _guard = sentry::init(("DSN", sentry::ClientOptions {
        release: sentry::release_name!(),
        ..Default::default()
    }));
    // ...
}
```
**Time:** 1 week  
**Cost:** $26/month (Sentry)  
**Owner:** DevOps

---

## 📋 WEEK-BY-WEEK PLAN

### Week 1: Make It Build ✅
- [ ] Fix pnpm install
- [ ] Generate app icons (1024x1024 → all sizes)
- [ ] Complete one successful build
- [ ] Verify installer works on fresh Mac
- [ ] Fix CI/CD pipeline

**Exit Criteria:** Green build in CI, working .app file

---

### Week 2: Consolidate & Integrate
- [ ] Choose Tauri v2 as primary
- [ ] Delete duplicate `src-tauri/` code
- [ ] Integrate Next.js app (apps/web)
- [ ] Test all routes load correctly
- [ ] Verify desktop-specific components show

**Exit Criteria:** Desktop app shows real UI, not HTML placeholders

---

### Week 3: Connect Backend
- [ ] Implement HTTP client in Rust
- [ ] Add Supabase Rust client (postgrest)
- [ ] Test API calls from desktop
- [ ] Initialize local SQLite database
- [ ] Sync data on app start (read-only)

**Exit Criteria:** Desktop can fetch and display real data from Supabase

---

### Week 4: Authentication
- [ ] Implement OAuth login flow
- [ ] Store token in macOS Keychain
- [ ] Add token refresh logic
- [ ] Test logout and re-login
- [ ] Handle expired sessions

**Exit Criteria:** Users can login and stay logged in

---

### Week 5: Offline & Sync
- [ ] Build bidirectional sync engine
- [ ] Add conflict resolution (last-write-wins)
- [ ] Show offline indicators in UI
- [ ] Enable background sync (every 5 min)
- [ ] Test offline→online transitions

**Exit Criteria:** App works offline, syncs when online

---

### Week 6: Desktop UX
- [ ] Add keyboard shortcuts (Cmd+N, Cmd+S, etc.)
- [ ] Implement system notifications
- [ ] Add file associations (.prisma files)
- [ ] Enable drag-and-drop for uploads
- [ ] Create custom title bar

**Exit Criteria:** Feels like a native Mac app

---

### Week 7: Security Hardening
- [ ] Purchase Apple Developer cert ($99)
- [ ] Configure notarization
- [ ] Enable SQLCipher encryption
- [ ] Harden CSP (remove unsafe-inline)
- [ ] Add certificate pinning

**Exit Criteria:** App passes macOS Gatekeeper, data encrypted

---

### Week 8: Testing
- [ ] Write 20+ Rust unit tests
- [ ] Create 10+ E2E tests (Playwright)
- [ ] Add integration tests for sync
- [ ] Run tests in CI/CD
- [ ] Achieve 60% code coverage

**Exit Criteria:** Tests pass in CI, coverage >60%

---

### Week 9: Distribution
- [ ] Set up update server (GitHub Releases)
- [ ] Configure auto-update in app
- [ ] Create download page (website)
- [ ] Generate release notes
- [ ] Test update flow

**Exit Criteria:** App can auto-update

---

### Week 10: Monitoring & Docs
- [ ] Integrate Sentry for crashes
- [ ] Add analytics (PostHog)
- [ ] Create user manual
- [ ] Build in-app help
- [ ] Update all documentation

**Exit Criteria:** Can track crashes and usage

---

### Week 11-12: Beta Testing
- [ ] Internal beta (10 team members)
- [ ] Fix P0/P1 bugs
- [ ] External beta (50 users via TestFlight)
- [ ] Collect feedback
- [ ] Performance optimization

**Exit Criteria:** <5 bugs per 100 users, >80% satisfaction

---

### Week 13: Pre-Launch
- [ ] Security audit (external)
- [ ] Performance testing (startup <5s)
- [ ] Legal review (privacy policy)
- [ ] Marketing materials
- [ ] Support plan

**Exit Criteria:** All checklists complete

---

### Week 14: LAUNCH 🚀
- [ ] Public release v1.0.0
- [ ] Submit to App Store (optional)
- [ ] Announce on website/social
- [ ] Monitor metrics (crashes, downloads)
- [ ] Support early users

**Exit Criteria:** 1000+ downloads, <1% crash rate

---

## 🎯 QUICK WINS (Do First)

### Day 1: Fix Dependencies
```bash
cd desktop-app
pnpm install --frozen-lockfile
pnpm tauri --version  # Should print version
```

### Day 2: Generate Icons
```bash
# Create 1024x1024 icon (use Figma/Sketch)
pnpm tauri icon assets/icon-1024.png
# Creates all sizes automatically
```

### Day 3: First Build
```bash
cd desktop-app
pnpm tauri build
# Wait 10-15 min for first build
# Check src-tauri/target/release/bundle/macos/
```

### Day 4: Test Installer
```bash
open src-tauri/target/release/bundle/dmg/*.dmg
# Install on another Mac
# Verify it launches
```

### Day 5: Fix CI/CD
```bash
# Trigger .github/workflows/desktop-build-sign.yml
# Fix any errors
# Get green checkmark
```

---

## 💰 BUDGET BREAKDOWN

### Required Costs
| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Program | $99 | Annual |
| Code Signing Cert (Windows) | $400 | Annual |
| Sentry (Crash Reporting) | $26 | Monthly |
| **Year 1 Total** | **$811** | |

### Optional Costs
| Item | Cost | Frequency |
|------|------|-----------|
| Analytics (PostHog Pro) | $99 | Monthly |
| App Store Submission | $0 | Included |
| Icons/Branding | $500 | One-time |
| Security Audit | $2000 | One-time |

---

## 👥 TEAM REQUIREMENTS

| Role | Time Commitment | Weeks |
|------|----------------|-------|
| Full-Stack Developer | 100% (40h/week) | 8-10 |
| DevOps Engineer | 50% (20h/week) | 4-6 |
| QA/Test Engineer | 50% (20h/week) | 4-6 |
| Designer (icons/UX) | 25% (10h/week) | 2-3 |
| Product Manager | 25% (10h/week) | 12-14 |

**Total Effort:** ~560 developer hours over 12-14 weeks

---

## 📊 SUCCESS METRICS

### Technical KPIs
- [ ] Build success rate: >95% in CI/CD
- [ ] App startup time: <5 seconds
- [ ] Installed size: <200MB
- [ ] Test coverage: >60%
- [ ] Crash rate: <1%

### User KPIs
- [ ] Time to first login: <30 seconds
- [ ] Sync success rate: >95%
- [ ] Offline→online transition: <5 seconds
- [ ] User satisfaction (NPS): >50

### Business KPIs
- [ ] Downloads (Month 1): 1000+
- [ ] Uninstall rate: <2%
- [ ] DAU/MAU ratio: >60%
- [ ] Support tickets: <10 per 100 users

---

## 🚦 DECISION GATES

### Gate 1: After Week 4 (Foundation Complete)
**Go/No-Go Criteria:**
- ✅ App builds successfully
- ✅ Users can login
- ✅ Data syncs from backend
- ✅ No P0 security issues

**If NO:** Pause and reassess. Consider PWA instead.

---

### Gate 2: After Week 8 (Features Complete)
**Go/No-Go Criteria:**
- ✅ Offline mode works
- ✅ Auto-update works
- ✅ Tests pass in CI
- ✅ Performance meets targets

**If NO:** Delay beta testing, fix critical issues.

---

### Gate 3: After Week 12 (Beta Complete)
**Go/No-Go Criteria:**
- ✅ <5 bugs per 100 users
- ✅ >80% beta satisfaction
- ✅ All P0/P1 bugs fixed
- ✅ Legal/security approvals

**If NO:** Extend beta, don't launch until ready.

---

## 🔄 ALTERNATIVE: PWA FIRST

**If timeline is too aggressive or resources limited, consider:**

### PWA Advantages
- ✅ Already implemented (`apps/client`)
- ✅ Works offline (Service Worker)
- ✅ Auto-updates (no approval needed)
- ✅ Cross-platform (one codebase)
- ✅ No code signing complexity
- ✅ Faster time to market (2-3 weeks)

### PWA Disadvantages
- ❌ No system tray
- ❌ Limited file system access
- ❌ No native notifications (desktop)
- ❌ Less "native" feel

**Recommendation:** Ship PWA first, desktop app second if needed.

---

## 📞 SUPPORT PLAN

### Documentation
- [ ] User manual (getting started, features, troubleshooting)
- [ ] FAQ (10+ common questions)
- [ ] Video tutorials (3-5 short videos)
- [ ] In-app help system

### Channels
- [ ] Email support (support@prisma-glow.com)
- [ ] Discord/Slack community
- [ ] GitHub issues (for bugs)
- [ ] Knowledge base (searchable docs)

### SLAs
- P0 (app crashes): 4 hours response
- P1 (can't login): 24 hours response
- P2 (feature broken): 3 days response
- P3 (enhancement): Best effort

---

## 🎓 LESSONS LEARNED (Pre-Mortem)

### Common Pitfalls to Avoid
1. **Don't over-engineer:** Ship MVP first, add features later
2. **Test on real hardware:** CI builds ≠ user machines
3. **Beta test extensively:** First impressions matter
4. **Monitor from Day 1:** Can't fix what you can't measure
5. **Document everything:** Future you will thank you
6. **Plan for rollback:** Updates can break things
7. **Budget for support:** Users will have questions

---

## 📅 WEEKLY STANDUP TEMPLATE

```markdown
## Desktop App Progress - Week X

### Completed This Week
- [ ] Task 1
- [ ] Task 2

### In Progress
- [ ] Task 3 (80% done, blocker: X)

### Blocked
- [ ] Task 4 (waiting on: API update)

### Next Week Plan
- [ ] Task 5
- [ ] Task 6

### Risks
- Risk 1: Description, mitigation plan

### Metrics
- Build success: X%
- Test coverage: X%
- Open P0 bugs: X
```

---

## ✅ FINAL CHECKLIST (Before Launch)

### Technical
- [ ] App builds on macOS (Intel + Apple Silicon)
- [ ] App builds on Windows
- [ ] App builds on Linux
- [ ] All tests pass (unit, integration, E2E)
- [ ] Security audit complete (no P0/P1 issues)
- [ ] Performance targets met (startup, memory, disk)
- [ ] Auto-update tested end-to-end
- [ ] Crash reporting working
- [ ] Analytics tracking events
- [ ] All features functional offline

### Legal & Compliance
- [ ] Privacy policy updated (desktop-specific)
- [ ] Terms of service reviewed
- [ ] Data handling compliant (GDPR, CCPA)
- [ ] Open source licenses attributed
- [ ] Apple Developer agreement signed

### Operations
- [ ] Update server configured and tested
- [ ] Monitoring dashboards created
- [ ] Alerting rules defined
- [ ] Runbooks written (incidents, deploys)
- [ ] Support team trained
- [ ] Rollback plan documented

### Marketing
- [ ] Download page live
- [ ] Release notes published
- [ ] Social media posts ready
- [ ] Blog post written
- [ ] Video demo recorded
- [ ] Press kit prepared (if applicable)

---

## 📖 REFERENCES

- [Main Audit Report](./DESKTOP_APP_PRODUCTION_READINESS_AUDIT.md)
- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Existing Desktop Docs](./DESKTOP_APPS_COMPLETE_SUMMARY.md)
- [Week 2 Desktop Status](./WEEK_2_DESKTOP_APP_COMPLETE.md)

---

**Next Action:** Review with team, assign owners, set kickoff date.

**Prepared By:** AI Assistant  
**Date:** 2025-12-02

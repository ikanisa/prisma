# 🚀 MASTER DESKTOP DEPLOYMENT CHECKLIST

**Complete guide for releasing Prisma Glow Desktop Apps**  
**Platforms**: macOS (Admin Panel + Client Portal) | Windows | Linux  
**Last Updated**: 2025-12-02

---

## 📋 QUICK REFERENCE

**Release Flow**: Version bump → Changelog → Push → CI builds & signs → Download → Test → Publish → Announce

**Typical Timeline**: 30-45 minutes per release cycle  
**Frequency**: As needed (bug fixes, features, security updates)

---

## ✅ PHASE 1: PRE-REQUISITES

**Status Check**: All items must be ✅ before proceeding

| Status | Item | How to Verify |
|--------|------|---------------|
| ☑️ | CI/CD builds successfully | Check https://github.com/ikanisa/prisma/actions |
| ☑️ | Code-signing (macOS) working | Run `./scripts/sign_all_apps.sh` locally |
| ⬜ | Code-signing (Windows) configured | Add `WIN_CERT_PFX` secret |
| ⬜ | Linux packaging working | Test `.deb` and `.AppImage` creation |
| ☑️ | Versioning strategy decided | Using SemVer (1.0.0) |
| ⬜ | CHANGELOG.md exists | Create if missing |
| ☑️ | Distribution method chosen | GitHub Releases + Artifacts |
| ⬜ | QA test plan documented | See Phase 6 below |

**Blockers**: If any item is ⬜, complete it before proceeding with release.

---

## 🔑 PHASE 2: CREDENTIALS & SECRETS

### GitHub Secrets Configuration

**Location**: https://github.com/ikanisa/prisma/settings/secrets/actions

#### macOS Signing (✅ Complete)

| Secret Name | Value | Status |
|-------------|-------|--------|
| `MACOS_CERT_P12` | Base64-encoded .p12 certificate | ✅ Configured |
| `MACOS_CERT_PASSWORD` | Certificate password | ✅ Configured |
| `MACOS_CERT_IDENTITY` | "Inhouse Dev Signing" | ✅ Configured |

**Verification**:
```bash
# Check locally
./scripts/list_identities.sh
# Should show: "Inhouse Dev Signing"
```

#### Windows Signing (⚠️ TODO)

| Secret Name | Value | Status |
|-------------|-------|--------|
| `WIN_CERT_PFX` | Base64-encoded .pfx certificate | ⬜ Not configured |
| `WIN_CERT_PASSWORD` | Certificate password | ⬜ Not configured |
| `WIN_CERT_SUBJECT` | CN from certificate | ⬜ Not configured |

**Setup Guide**: See `docs/windows_signing.md` (to be created)

#### Linux Packaging (✅ No secrets needed)

Linux packages (.deb, .AppImage) don't require signing for internal distribution.

**Optional**: Add GPG key for package signing if distributing publicly.

---

## 📁 PHASE 3: FILES & INFRASTRUCTURE

### Required Files Checklist

#### Build Scripts (✅ Complete)

- [x] `scripts/create-demo-apps.sh`
- [x] `scripts/list_identities.sh`
- [x] `scripts/sign_app.sh`
- [x] `scripts/sign_all_apps.sh`
- [x] `scripts/build-desktop-apps.sh`
- [ ] `scripts/sign_windows.ps1` (TODO)
- [ ] `scripts/build_linux.sh` (TODO)

#### CI/CD Workflows (✅ Complete)

- [x] `.github/workflows/desktop-build-sign.yml`
  - macOS builds ✅
  - Windows builds ✅
  - Linux builds ✅
  - Automated signing ✅
  - Artifact uploads ✅

#### Documentation (✅ Complete)

- [x] `docs/internal_mac_signing.md`
- [x] `docs/DEPLOYMENT_DESKTOP.md`
- [x] `docs/DESKTOP_DEPLOYMENT_CHECKLIST.md`
- [x] `docs/DESKTOP_READY.md`
- [ ] `docs/windows_signing.md` (TODO)
- [ ] `docs/linux_packaging.md` (TODO)

#### App Configuration

- [x] `desktop-app/package.json` (version number)
- [x] `desktop-app/src-tauri/tauri.conf.json` (app metadata)
- [x] `desktop-app/src-tauri/Cargo.toml` (Rust version)
- [ ] `CHANGELOG.md` (release notes)
- [ ] `RELEASES.md` (version history)

---

## 🔄 PHASE 4: PRE-RELEASE PREPARATION

### Step 1: Update Version Numbers

**Target Version**: `1.0.1` (example)

#### Update Files:

```bash
# 1. Update package.json
sed -i '' 's/"version": "1.0.0"/"version": "1.0.1"/' desktop-app/package.json

# 2. Update tauri.conf.json
sed -i '' 's/"version": "1.0.0"/"version": "1.0.1"/' desktop-app/src-tauri/tauri.conf.json

# 3. Update Cargo.toml
sed -i '' 's/version = "1.0.0"/version = "1.0.1"/' desktop-app/src-tauri/Cargo.toml

# 4. Verify changes
git diff desktop-app/
```

#### Manual Updates:

- [ ] Update version in About dialog (if exists in UI)
- [ ] Update version in README.md
- [ ] Update any hardcoded version strings

### Step 2: Update CHANGELOG.md

**Create file if doesn't exist**:

```bash
cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to Prisma Glow Desktop Apps will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2025-12-02

### Added
- Feature 1
- Feature 2

### Changed
- Improvement 1
- Improvement 2

### Fixed
- Bug fix 1
- Bug fix 2

### Security
- Security fix 1

## [1.0.0] - 2025-12-02

### Added
- Initial release
- Admin Panel desktop app
- Client Portal desktop app
- Code signing for macOS
- CI/CD automated builds

EOF
```

**Update for current release**:

```bash
# Edit CHANGELOG.md
vim CHANGELOG.md
# or
code CHANGELOG.md
```

**Required sections**:
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

### Step 3: Commit Version Bump

```bash
# Stage changes
git add desktop-app/package.json \
        desktop-app/src-tauri/tauri.conf.json \
        desktop-app/src-tauri/Cargo.toml \
        CHANGELOG.md \
        README.md

# Commit
git commit -m "chore: Bump version to 1.0.1

- Update version in package.json
- Update version in tauri.conf.json
- Update version in Cargo.toml
- Update CHANGELOG.md with release notes"

# Create git tag
git tag -a v1.0.1 -m "Release v1.0.1

Changes:
- Feature 1
- Feature 2
- Bug fix 1"

# Push
git push origin main
git push origin v1.0.1
```

**⚠️ Important**: The push will trigger CI/CD workflow!

---

## 🏗️ PHASE 5: CI/CD BUILD PROCESS

### Automatic Workflow Trigger

**When**: Immediately after `git push origin main`

**What happens**:

```
1. ✅ Checkout code
2. ✅ Setup Node.js 22.12.0
3. ✅ Setup Rust toolchain
4. ✅ Install dependencies (macOS, Windows, Linux jobs)
5. ✅ Build Admin Panel app (all platforms)
6. ✅ Build Client Portal app (all platforms)
7. ✅ Import code-signing certificate (macOS)
8. ✅ Sign both macOS apps
9. ✅ Verify signatures
10. ✅ Create distribution archives (.zip, .msi, .deb, .AppImage)
11. ✅ Generate SHA-256 checksums
12. ✅ Upload artifacts
```

### Monitor Build Progress

**GitHub Actions**: https://github.com/ikanisa/prisma/actions

**Expected duration**: 10-15 minutes

#### Watch for:

| Job | Expected Result | If Fails |
|-----|----------------|----------|
| `build-macos` | ✅ Green | Check Rust/Node versions |
| `build-windows` | ✅ Green | Check Windows toolchain |
| `build-linux` | ✅ Green | Check Linux dependencies |
| Code signing | ✅ Signed | Verify secrets configured |
| Artifact upload | ✅ 4 artifacts | Check workflow YAML |

**Build Status Colors**:
- 🟢 **Green**: Success
- 🟡 **Yellow**: In progress
- 🔴 **Red**: Failed (investigate logs)
- ⚪ **Gray**: Queued/waiting

### Troubleshooting Build Failures

**Common Issues**:

| Error | Cause | Solution |
|-------|-------|----------|
| "No identities found" | Secrets not configured | Add `MACOS_CERT_*` secrets |
| "codesign failed" | Invalid certificate | Re-export and re-encode .p12 |
| "pnpm install failed" | Lockfile mismatch | Update `pnpm-lock.yaml` |
| "Cargo build failed" | Rust version | Update `rust-toolchain` |
| "Artifact upload failed" | Path wrong | Check `desktop-build-sign.yml` |

**Debug Commands**:

```bash
# Test locally before pushing
./scripts/build-desktop-apps.sh
./scripts/sign_all_apps.sh

# Check workflow syntax
act -l  # if using nektos/act for local CI testing
```

---

## 📦 PHASE 6: DOWNLOAD & VERIFY ARTIFACTS

### Download from GitHub Actions

**Steps**:

1. Go to: https://github.com/ikanisa/prisma/actions
2. Click on the latest workflow run
3. Scroll to **Artifacts** section
4. Download all 4 artifacts:

**Expected Artifacts**:

| Artifact Name | Contents | Size (approx) |
|---------------|----------|---------------|
| `AdminPanel-macOS` | AdminPanel.app.zip + .sha256 | 50-150 MB |
| `ClientPortal-macOS` | ClientPortal.app.zip + .sha256 | 50-150 MB |
| `Desktop-Windows` | .msi + .exe installers | 60-180 MB |
| `Desktop-Linux` | .deb + .AppImage packages | 70-200 MB |

### Verify Checksums

**macOS**:

```bash
# Extract artifacts
cd ~/Downloads
unzip AdminPanel-macOS.zip
unzip ClientPortal-macOS.zip

# Verify checksums
shasum -a 256 -c AdminPanel.app.zip.sha256
shasum -a 256 -c ClientPortal.app.zip.sha256

# Expected output:
# AdminPanel.app.zip: OK
# ClientPortal.app.zip: OK
```

**Windows** (PowerShell):

```powershell
Get-FileHash AdminPanel.msi -Algorithm SHA256
# Compare with .sha256 file
```

**Linux**:

```bash
sha256sum -c AdminPanel.deb.sha256
sha256sum -c AdminPanel.AppImage.sha256
```

### Verify Code Signatures

**macOS**:

```bash
# Extract apps
unzip AdminPanel.app.zip

# Verify signature
codesign --verify --deep --strict --verbose=2 AdminPanel.app
# Expected: "satisfies its Designated Requirement"

# Check identity
codesign -dvvv AdminPanel.app | grep "Authority"
# Expected: "Authority=Inhouse Dev Signing"
```

**Windows**:

```powershell
# Verify Authenticode signature
Get-AuthenticodeSignature AdminPanel.msi

# Expected:
# Status: Valid
# SignerCertificate: CN=Your Company Name
```

---

## 🧪 PHASE 7: QA TESTING

### macOS Testing Checklist

**Environment**: Clean macOS 11+ machine (or VM)

#### First-Time Install (Unsigned/Self-Signed)

- [ ] Download `AdminPanel.app.zip`
- [ ] Extract ZIP file
- [ ] **Right-click** AdminPanel.app → **Open** (not double-click!)
- [ ] Click **Open** in security dialog
- [ ] App launches successfully
- [ ] No crash on launch
- [ ] Version number correct in About dialog

#### Subsequent Launches

- [ ] Double-click AdminPanel.app
- [ ] App launches without security warning
- [ ] Same for ClientPortal.app

#### Functional Tests

- [ ] **Authentication**: Login works
- [ ] **Navigation**: All menu items accessible
- [ ] **Role-based access**: Admin panel shows admin features
- [ ] **API connectivity**: Can connect to backend
- [ ] **File operations**: Can save/open files (if applicable)
- [ ] **Offline mode**: App works offline (if applicable)
- [ ] **Window behavior**: Minimize, maximize, full-screen work
- [ ] **Keyboard shortcuts**: All shortcuts functional

### Windows Testing Checklist

**Environment**: Clean Windows 10/11 machine

#### Installation

- [ ] Download `.msi` installer
- [ ] Run installer (SmartScreen may warn - expected for self-signed)
- [ ] Click **More info** → **Run anyway** (if self-signed)
- [ ] Installer completes successfully
- [ ] App appears in Start Menu
- [ ] Desktop shortcut created (if configured)

#### Launch & Function

- [ ] Launch from Start Menu
- [ ] No crash on startup
- [ ] Version number correct
- [ ] All functional tests (same as macOS list above)
- [ ] Windows-specific: System tray integration (if applicable)

### Linux Testing Checklist

**Environment**: Ubuntu 20.04+ or Debian 11+

#### .deb Installation

```bash
# Install
sudo dpkg -i prisma-glow-admin-panel_1.0.1_amd64.deb

# Fix dependencies if needed
sudo apt-get install -f

# Launch
prisma-glow-admin-panel

# Verify
which prisma-glow-admin-panel
```

#### .AppImage Usage

```bash
# Make executable
chmod +x PrismaGlowAdminPanel-1.0.1.AppImage

# Run
./PrismaGlowAdminPanel-1.0.1.AppImage

# Test
# - Launch from file manager
# - All functional tests
```

### Performance Testing

- [ ] **Startup time**: < 3 seconds
- [ ] **Memory usage**: < 200 MB idle
- [ ] **CPU usage**: < 5% idle
- [ ] **Network requests**: No excessive polling
- [ ] **Battery impact**: No significant drain (laptops)

### Regression Testing

**Test previous release's key scenarios**:

- [ ] Data migration (if database schema changed)
- [ ] Settings preserved from previous version
- [ ] No breaking changes in API calls
- [ ] Backward compatibility with server API

### Security Testing

- [ ] **Code signature**: Valid on all platforms
- [ ] **HTTPS only**: No insecure HTTP requests
- [ ] **Token storage**: Secure credential storage
- [ ] **XSS protection**: Content properly escaped
- [ ] **CSP headers**: Content Security Policy enforced

---

## 🚢 PHASE 8: PUBLISHING & DISTRIBUTION

### Option A: GitHub Releases (Recommended)

**Advantages**: Version control, changelog, download stats, free hosting

**Steps**:

```bash
# 1. Go to GitHub Releases
open https://github.com/ikanisa/prisma/releases/new

# 2. Create new release
# - Tag: v1.0.1
# - Title: "Prisma Glow Desktop v1.0.1"
# - Description: Copy from CHANGELOG.md
# - Attach artifacts:
#   - AdminPanel.app.zip
#   - AdminPanel.app.zip.sha256
#   - ClientPortal.app.zip
#   - ClientPortal.app.zip.sha256
#   - PrismaGlow-Windows.msi
#   - PrismaGlow-Linux.deb
#   - PrismaGlow-Linux.AppImage

# 3. Mark as pre-release (if not stable)
# 4. Publish release
```

**Download URLs** (after publish):

```
https://github.com/ikanisa/prisma/releases/download/v1.0.1/AdminPanel.app.zip
https://github.com/ikanisa/prisma/releases/download/v1.0.1/ClientPortal.app.zip
```

### Option B: Internal Download Portal

**Requirements**:
- Web server (Nginx, Apache)
- HTTPS enabled
- Basic authentication (optional)

**Directory structure**:

```
/downloads/
├── desktop/
│   ├── latest/
│   │   ├── macos/
│   │   │   ├── AdminPanel.app.zip
│   │   │   ├── AdminPanel.app.zip.sha256
│   │   │   ├── ClientPortal.app.zip
│   │   │   └── ClientPortal.app.zip.sha256
│   │   ├── windows/
│   │   │   └── PrismaGlow.msi
│   │   └── linux/
│   │       ├── prisma-glow.deb
│   │       └── PrismaGlow.AppImage
│   └── archive/
│       ├── v1.0.0/
│       └── v1.0.1/
└── index.html
```

### Option C: Cloud Storage (S3/R2/Supabase)

**Example with Supabase Storage**:

```bash
# Upload to Supabase
supabase storage cp AdminPanel.app.zip \
  supabase://desktop-releases/v1.0.1/macos/AdminPanel.app.zip

# Get public URL
supabase storage url desktop-releases/v1.0.1/macos/AdminPanel.app.zip
```

### Option D: Auto-Update System (Future)

**Frameworks**:
- **Electron**: Built-in auto-updater
- **Tauri**: `tauri-plugin-updater`
- **Sparkle**: macOS only
- **Squirrel**: Windows

**Setup** (Tauri example):

```toml
# Cargo.toml
[dependencies]
tauri-plugin-updater = "2.0"
```

```json
// tauri.conf.json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.prismaglow.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

---

## 📢 PHASE 9: ANNOUNCEMENT & ROLLOUT

### Internal Communication Template

```markdown
📱 New Desktop App Release: v1.0.1

Hi team,

We've just released a new version of Prisma Glow Desktop apps!

**What's New:**
✨ Feature 1
✨ Feature 2
🐛 Bug fix 1
🔒 Security improvement 1

**Download Links:**
- Admin Panel (macOS): https://github.com/ikanisa/prisma/releases/download/v1.0.1/AdminPanel.app.zip
- Client Portal (macOS): https://github.com/ikanisa/prisma/releases/download/v1.0.1/ClientPortal.app.zip
- Windows Installer: https://github.com/ikanisa/prisma/releases/download/v1.0.1/PrismaGlow.msi
- Linux Package: https://github.com/ikanisa/prisma/releases/download/v1.0.1/prisma-glow.deb

**Installation Notes:**
- macOS: Right-click → Open (first time only)
- Windows: Run installer, click "More info" → "Run anyway" if prompted
- Linux: sudo dpkg -i prisma-glow.deb

**Questions?**
Reply here or contact the dev team.

Cheers! 🚀
```

### Rollout Strategy

**Phased Rollout** (Recommended):

| Phase | Audience | Duration | Rollback Plan |
|-------|----------|----------|---------------|
| 1. Canary | Dev team (2-3 people) | 24 hours | Keep v1.0.0 links |
| 2. Beta | Early adopters (10-20 users) | 3 days | Document issues |
| 3. General | All internal users | Ongoing | Hotfix if critical bugs |

**Immediate Rollout** (Small teams):
- Announce to everyone
- Monitor feedback closely
- Prepare hotfix branch if needed

### Cleanup Old Versions

```bash
# Remove old builds from shared folders
rm -rf /shared/downloads/desktop/v1.0.0/

# Update RELEASES.md
echo "## v1.0.1 - 2025-12-02" >> RELEASES.md
echo "Deprecated: v1.0.0" >> RELEASES.md

# Archive in cloud storage
mv s3://releases/v1.0.0/ s3://releases/archive/
```

---

## 📊 PHASE 10: POST-RELEASE MONITORING

### Collect Metrics

**Track**:
- Download counts (GitHub/S3 analytics)
- Installation success rate
- Crash reports (if telemetry enabled)
- User feedback (Slack, email, support tickets)

**Tools**:
- GitHub Insights (download stats)
- Sentry (crash reporting)
- Google Analytics (if embedded)
- Custom telemetry endpoint

### Monitor for Issues

**First 24 Hours**:
- [ ] Check for crash reports
- [ ] Monitor support channels
- [ ] Review user feedback
- [ ] Test on different OS versions

**First Week**:
- [ ] Analyze usage patterns
- [ ] Identify common issues
- [ ] Plan hotfix if needed
- [ ] Gather feature requests

### Hotfix Process

**If critical bug found**:

```bash
# 1. Create hotfix branch
git checkout -b hotfix/v1.0.2 v1.0.1

# 2. Fix bug
# ... make changes ...

# 3. Test locally
./scripts/build-desktop-apps.sh
./scripts/sign_all_apps.sh

# 4. Bump version to 1.0.2
# Update package.json, Cargo.toml, tauri.conf.json

# 5. Update CHANGELOG.md
cat >> CHANGELOG.md << EOF

## [1.0.2] - 2025-12-03

### Fixed
- Critical bug fix XYZ
EOF

# 6. Commit and tag
git commit -am "fix: Critical bug XYZ"
git tag -a v1.0.2 -m "Hotfix: Critical bug XYZ"

# 7. Push (triggers CI)
git push origin hotfix/v1.0.2
git push origin v1.0.2

# 8. Merge to main
git checkout main
git merge hotfix/v1.0.2
git push origin main

# 9. Announce hotfix
# Use same communication template
```

---

## 🔄 PHASE 11: CONTINUOUS IMPROVEMENT

### Feedback Collection

**Create feedback form**:

```markdown
# Desktop App Feedback - v1.0.1

**Your Role**: [ ] Admin [ ] Staff [ ] Client

**Platform**: [ ] macOS [ ] Windows [ ] Linux

**Rating** (1-5): ___

**What works well?**


**What needs improvement?**


**Bugs encountered?**


**Feature requests?**

```

**Channels**:
- Google Forms
- Internal Slack channel (#desktop-app-feedback)
- Email: desktop-feedback@company.com
- GitHub Issues (if public)

### Roadmap Planning

**Monthly Review**:
- Analyze collected feedback
- Prioritize bug fixes
- Plan new features
- Update roadmap

**Sprint Planning**:
- Assign issues to sprints
- Estimate effort
- Set release dates
- Update stakeholders

### Documentation Updates

**Keep current**:
- [ ] Update DEPLOYMENT_DESKTOP.md if process changes
- [ ] Update DESKTOP_DEPLOYMENT_CHECKLIST.md (this file)
- [ ] Document new features in user guide
- [ ] Update API documentation if endpoints change
- [ ] Refresh screenshots in docs

---

## 💎 OPTIONAL UPGRADES

### Apple Notarization (macOS)

**Benefits**:
- No "right-click → Open" requirement
- Better user experience
- Required for macOS 10.15+

**Requirements**:
- Apple Developer Program ($99/year)
- Developer ID Application certificate

**Setup**:

```bash
# 1. Sign app
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Company (TEAM)" \
  --options runtime \
  AdminPanel.app

# 2. Create ZIP
ditto -c -k --keepParent AdminPanel.app AdminPanel.app.zip

# 3. Notarize
xcrun notarytool submit AdminPanel.app.zip \
  --apple-id "your@email.com" \
  --team-id "TEAM123" \
  --password "app-specific-password" \
  --wait

# 4. Staple ticket
xcrun stapler staple AdminPanel.app

# 5. Verify
spctl --assess --verbose=4 --type execute AdminPanel.app
# Should show: "accepted"
```

**Add to CI/CD**:

```yaml
- name: Notarize macOS app
  env:
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
    TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  run: |
    xcrun notarytool submit AdminPanel.app.zip \
      --apple-id "$APPLE_ID" \
      --team-id "$TEAM_ID" \
      --password "$APPLE_PASSWORD" \
      --wait
    xcrun stapler staple AdminPanel.app
```

### Windows EV Certificate

**Benefits**:
- No SmartScreen warnings
- Instant trust for users
- Required for kernel drivers

**Cost**: $300-$500/year

**Providers**:
- DigiCert
- Sectigo
- GlobalSign

### Crash Reporting (Sentry)

**Setup**:

```bash
# Install Sentry SDK
cd desktop-app
pnpm add @sentry/electron

# Configure
// main.ts
import * as Sentry from '@sentry/electron';

Sentry.init({
  dsn: 'https://YOUR_DSN@sentry.io/PROJECT',
  release: '1.0.1',
  environment: 'production',
});
```

**Benefits**:
- Automatic error tracking
- User-affected metrics
- Release comparison
- Performance monitoring

### Auto-Update System

**Tauri Updater**:

```json
// tauri.conf.json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.prismaglow.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEU0NUJDOUI1RkFBMjExMzgKUldSRkYwN1BURzJLWEpDR0I2NEQ5RTRBRjVERjNBMzJBMTU1RTM0RTI4MTI2MDREMzExQzBGNwo="
    }
  }
}
```

**Benefits**:
- Users auto-update
- No manual downloads
- Faster adoption
- Reduced support burden

---

## 🏁 QUICK CHECKLIST (Copy for Each Release)

```markdown
## Release v_____ Checklist

### Pre-Release
- [ ] Version bumped in all 3 files
- [ ] CHANGELOG.md updated
- [ ] Committed and tagged
- [ ] Pushed to GitHub

### CI/CD
- [ ] Build succeeded (all platforms)
- [ ] Code signing worked (macOS)
- [ ] Artifacts uploaded (4 files)

### QA
- [ ] macOS Admin Panel tested
- [ ] macOS Client Portal tested
- [ ] Windows installer tested
- [ ] Linux packages tested
- [ ] Checksums verified
- [ ] Signatures verified

### Distribution
- [ ] Published to GitHub Releases
- [ ] Download links work
- [ ] Checksums included
- [ ] Release notes clear

### Communication
- [ ] Team announcement sent
- [ ] Old versions removed/archived
- [ ] RELEASES.md updated
- [ ] Feedback channel ready

### Post-Release
- [ ] Monitor for 24 hours
- [ ] Collect feedback
- [ ] Log issues for next sprint
- [ ] Update documentation
```

---

## 📞 SUPPORT & ESCALATION

### Issue Severity Levels

| Level | Description | Response Time | Action |
|-------|-------------|---------------|--------|
| **P0 - Critical** | App crashes on launch, data loss | 1 hour | Immediate hotfix |
| **P1 - High** | Core feature broken, affects all users | 4 hours | Hotfix within 24h |
| **P2 - Medium** | Feature degraded, workaround exists | 1 day | Fix in next release |
| **P3 - Low** | Minor bug, cosmetic issue | 1 week | Backlog item |

### Contact Points

- **Development Team**: #dev-desktop on Slack
- **QA Team**: qa@company.com
- **Support**: support@company.com
- **Emergency**: On-call rotation (PagerDuty)

---

## 📚 ADDITIONAL RESOURCES

### Documentation

- [Internal Mac Signing Guide](./internal_mac_signing.md)
- [Desktop Deployment Guide](./DEPLOYMENT_DESKTOP.md)
- [Desktop Ready Summary](./DESKTOP_READY.md)
- [Test Report](../DESKTOP_TEST_REPORT.md)

### External Resources

- [Tauri Documentation](https://tauri.app/)
- [Code Signing Guide (Apple)](https://developer.apple.com/support/code-signing/)
- [Authenticode (Microsoft)](https://docs.microsoft.com/en-us/windows-hardware/drivers/install/authenticode)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

### Scripts Reference

```bash
# Create demo apps
./scripts/create-demo-apps.sh

# List signing identities
./scripts/list_identities.sh

# Sign single app
./scripts/sign_app.sh path/to/App.app "Identity"

# Sign all apps
./scripts/sign_all_apps.sh

# Build both apps
./scripts/build-desktop-apps.sh

# Complete setup
./scripts/setup-complete.sh
```

---

## 🎯 SUCCESS METRICS

### Per-Release KPIs

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Build Success Rate | >95% | CI/CD pipeline logs |
| Installation Success | >90% | User feedback, telemetry |
| Crash-Free Sessions | >99% | Sentry dashboard |
| User Satisfaction | >4.0/5 | Feedback forms |
| Update Adoption (7 days) | >70% | Download stats |
| Critical Bugs | 0 | Issue tracker |

### Long-Term Goals

- **Fully automated releases**: Version bump → CI/CD → auto-publish
- **Zero-downtime updates**: Auto-update with background downloads
- **Cross-platform parity**: Same features on all platforms
- **Professional certificates**: Apple notarization + Windows EV cert
- **Monitoring**: Full telemetry and crash reporting

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-02  
**Maintained By**: Development Team  
**Next Review**: 2025-12-09

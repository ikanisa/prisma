# Desktop Apps Deployment Checklist

## ✅ Pre-Deployment Setup (One-time)

### Local Development Environment

- [ ] Install Node.js 22.12.0
- [ ] Install pnpm 9.12.3: `npm install -g pnpm@9.12.3`
- [ ] Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [ ] Install Xcode Command Line Tools (macOS): `xcode-select --install`
- [ ] Clone repository: `git clone <repo-url>`
- [ ] Install dependencies: `cd desktop-app && pnpm install`

### Code Signing Certificate (macOS)

- [ ] Create self-signed certificate OR obtain Apple Developer ID
  - Follow: `docs/internal_mac_signing.md`
  - Certificate name: `Inhouse Dev Signing` (or your choice)
- [ ] Export certificate as `.p12` with strong password
- [ ] Test signing locally: `./scripts/list_identities.sh`
- [ ] Mark certificate as "Always Trust" in Keychain Access

### CI/CD Configuration

- [ ] Add GitHub Secrets:
  - `MACOS_CERTIFICATE_BASE64` (base64-encoded .p12 file)
  - `MACOS_CERTIFICATE_PASSWORD` (certificate password)
  - `MACOS_SIGNING_IDENTITY` (optional, defaults to "Inhouse Dev Signing")
- [ ] Test workflow: Push to main and verify builds succeed
- [ ] Verify artifacts are uploaded correctly

---

## 🏗️ Build Process

### Local Build

- [ ] Pull latest code: `git pull origin main`
- [ ] Build both apps: `./scripts/build-desktop-apps.sh`
- [ ] Verify output:
  - [ ] `dist/mac/AdminPanel.app` exists
  - [ ] `dist/mac/ClientPortal.app` exists
- [ ] Check app sizes (should be reasonable, <200MB per app)

### CI/CD Build

- [ ] Push to main: `git push origin main`
- [ ] Monitor GitHub Actions workflow
- [ ] Wait for all jobs to complete (macOS, Windows, Linux)
- [ ] Check build summary in Actions tab

---

## 🔐 Code Signing

### Local Signing

- [ ] List available identities: `./scripts/list_identities.sh`
- [ ] Sign both apps: `./scripts/sign_all_apps.sh`
- [ ] Verify signatures:
  ```bash
  codesign --verify --deep --strict --verbose=2 ./dist/mac/AdminPanel.app
  codesign --verify --deep --strict --verbose=2 ./dist/mac/ClientPortal.app
  ```
- [ ] Check Gatekeeper status:
  ```bash
  spctl --assess --verbose=4 --type execute ./dist/mac/AdminPanel.app
  spctl --assess --verbose=4 --type execute ./dist/mac/ClientPortal.app
  ```

### CI/CD Signing

- [ ] Verify workflow includes signing step
- [ ] Check workflow logs for signing success
- [ ] Download artifacts and verify they're signed

---

## 📦 Packaging

### Create Distribution Archives

- [ ] Navigate to dist directory: `cd dist/mac`
- [ ] Create ZIP archives:
  ```bash
  ditto -c -k --keepParent AdminPanel.app AdminPanel.app.zip
  ditto -c -k --keepParent ClientPortal.app ClientPortal.app.zip
  ```
- [ ] Generate checksums:
  ```bash
  shasum -a 256 AdminPanel.app.zip > AdminPanel.app.zip.sha256
  shasum -a 256 ClientPortal.app.zip > ClientPortal.app.zip.sha256
  ```
- [ ] Record file sizes and checksums

### From CI/CD Artifacts

- [ ] Go to GitHub Actions → Latest run
- [ ] Download artifacts:
  - [ ] `AdminPanel-macOS.zip`
  - [ ] `ClientPortal-macOS.zip`
  - [ ] `Desktop-Windows.zip` (optional)
  - [ ] `Desktop-Linux.zip` (optional)
- [ ] Extract and verify checksums match

---

## 🧪 Testing

### Pre-Distribution Testing

- [ ] Test Admin Panel:
  - [ ] Launch: `open dist/mac/AdminPanel.app`
  - [ ] Verify app launches without errors
  - [ ] Test UI renders correctly
  - [ ] Test API connectivity
  - [ ] Test file operations (if applicable)
  - [ ] Test all core features
- [ ] Test Client Portal:
  - [ ] Launch: `open dist/mac/ClientPortal.app`
  - [ ] Verify app launches without errors
  - [ ] Test UI renders correctly
  - [ ] Test API connectivity
  - [ ] Test all core features
- [ ] Test on fresh machine (or VM):
  - [ ] Verify first-launch experience (right-click → Open)
  - [ ] Verify subsequent launches work normally

### Security Testing

- [ ] Verify code signatures are valid
- [ ] Test Gatekeeper behavior (expected to fail for self-signed)
- [ ] Ensure no sensitive data in app bundle
- [ ] Verify CSP policies are correct
- [ ] Test with quarantine flag: `xattr -l ./dist/mac/AdminPanel.app`

### User Acceptance Testing

- [ ] Distribute to 2-3 internal beta testers
- [ ] Provide installation instructions
- [ ] Collect feedback on:
  - Installation experience
  - First-launch behavior
  - Performance
  - Any errors or issues
- [ ] Address critical issues before wider distribution

---

## 🚀 Distribution

### Prepare Distribution Materials

- [ ] Create release notes (version, new features, bug fixes)
- [ ] Prepare installation instructions:
  - [ ] macOS (self-signed): right-click → Open instructions
  - [ ] macOS (Developer ID): standard installation
  - [ ] Windows: run installer instructions
  - [ ] Linux: package installation instructions
- [ ] Include checksums file for verification
- [ ] Document any known issues

### Internal Distribution

- [ ] Upload to secure internal server/storage:
  - [ ] AdminPanel.app.zip + checksum
  - [ ] ClientPortal.app.zip + checksum
- [ ] Send distribution email to internal team:
  - [ ] Include download links
  - [ ] Include checksums
  - [ ] Include installation instructions
  - [ ] Include version number and release notes
- [ ] Update internal wiki/documentation with new version

### GitHub Release (Optional)

- [ ] Create new release: `git tag -a v1.0.0 -m "Version 1.0.0"`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] Go to GitHub Releases → Draft new release
- [ ] Upload artifacts:
  - [ ] AdminPanel.app.zip
  - [ ] AdminPanel.app.zip.sha256
  - [ ] ClientPortal.app.zip
  - [ ] ClientPortal.app.zip.sha256
- [ ] Add release notes
- [ ] Mark as pre-release if not production-ready
- [ ] Publish release

---

## 📋 Post-Distribution

### Monitor Installation

- [ ] Track installation success/failure
- [ ] Collect user feedback
- [ ] Monitor for common issues
- [ ] Respond to support requests

### Documentation

- [ ] Update version tracking spreadsheet/wiki
- [ ] Record distribution date and recipients
- [ ] Document any installation issues and solutions
- [ ] Update FAQs if needed

### Metrics

- [ ] Number of successful installations
- [ ] Number of issues reported
- [ ] Average installation time
- [ ] User satisfaction score

---

## 🔄 Version Updates

### Releasing New Version

- [ ] Update version numbers:
  - [ ] `desktop-app/package.json`
  - [ ] `desktop-app/src-tauri/tauri.conf.json`
  - [ ] `desktop-app/src-tauri/Cargo.toml`
- [ ] Update CHANGELOG.md
- [ ] Build and test new version
- [ ] Sign new version
- [ ] Create new distribution archives
- [ ] Follow testing checklist (above)
- [ ] Distribute to users
- [ ] Notify users of update

### Rollback Plan

If critical issues are discovered:

- [ ] Identify issue severity
- [ ] If critical: notify users immediately
- [ ] Provide previous version download
- [ ] Document rollback instructions
- [ ] Fix issue and release patch version
- [ ] Test patch thoroughly
- [ ] Redistribute

---

## ⚠️ Troubleshooting Common Issues

### Build Failures

- [ ] Check Node.js version: `node --version` (should be 22.12.0)
- [ ] Check pnpm version: `pnpm --version` (should be 9.12.3)
- [ ] Check Rust version: `rustc --version` (should be 1.70+)
- [ ] Clear caches: `pnpm store prune && cargo clean`
- [ ] Reinstall dependencies: `rm -rf node_modules && pnpm install`

### Signing Failures

- [ ] Verify certificate exists: `./scripts/list_identities.sh`
- [ ] Check certificate not expired
- [ ] Ensure certificate is "Always Trust"
- [ ] Verify environment variable: `echo $SIGNING_IDENTITY`
- [ ] Check script permissions: `ls -la scripts/sign_*.sh`

### Distribution Issues

- [ ] Verify checksums match
- [ ] Check ZIP file integrity
- [ ] Ensure files aren't corrupted during transfer
- [ ] Test on clean machine
- [ ] Verify download links work

### User Installation Issues

- [ ] User didn't right-click → Open (self-signed certs)
- [ ] Quarantine flag blocking launch: `xattr -cr App.app`
- [ ] Certificate not trusted on user's machine
- [ ] Provide step-by-step troubleshooting guide

---

## 📊 Deployment Metrics

Track these metrics for each release:

| Metric | Target | Actual | Notes |
|--------|--------|--------|-------|
| Build time (local) | < 10 min | _____ | |
| Build time (CI) | < 15 min | _____ | |
| App size (Admin) | < 150 MB | _____ | |
| App size (Client) | < 150 MB | _____ | |
| Signing time | < 5 min | _____ | |
| Installation success rate | > 95% | _____ | |
| First-launch success | > 90% | _____ | |
| Critical issues | 0 | _____ | |
| User satisfaction | > 4/5 | _____ | |

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ Both apps build without errors
- ✅ Both apps are properly signed
- ✅ Checksums are generated and verified
- ✅ Apps launch successfully on test machines
- ✅ Core functionality works as expected
- ✅ No critical security issues
- ✅ Users can install without excessive friction
- ✅ Documentation is complete and accurate
- ✅ Support resources are available

---

## 📝 Notes

Use this section for deployment-specific notes, issues, or observations:

---

## 🔗 Quick Links

- [Internal Mac Signing Guide](./internal_mac_signing.md)
- [Desktop Deployment Guide](./DEPLOYMENT_DESKTOP.md)
- [GitHub Actions Workflow](../.github/workflows/desktop-build-sign.yml)
- [Build Script](../scripts/build-desktop-apps.sh)
- [Signing Scripts](../scripts/)
- [Tauri Documentation](https://tauri.app/)

---

**Last Updated**: 2025-12-02  
**Maintained By**: Development Team  
**Version**: 1.0

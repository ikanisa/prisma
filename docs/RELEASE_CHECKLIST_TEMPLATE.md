# Release v______ Quick Checklist

**Date**: _____________  
**Released By**: _____________  
**Target Platforms**: macOS ☐ | Windows ☐ | Linux ☐

---

## ✅ PRE-RELEASE (5 min)

- [ ] Version bumped in `package.json`
- [ ] Version bumped in `tauri.conf.json`
- [ ] Version bumped in `Cargo.toml`
- [ ] `CHANGELOG.md` updated with release notes
- [ ] All changes committed
- [ ] Git tag created: `git tag -a v_____ -m "Release v_____"`
- [ ] Pushed to main: `git push origin main --tags`

---

## 🏗️ CI/CD BUILD (10-15 min wait)

**Workflow**: https://github.com/ikanisa/prisma/actions

- [ ] Build triggered successfully
- [ ] macOS job: ✅ Green
- [ ] Windows job: ✅ Green
- [ ] Linux job: ✅ Green
- [ ] Code signing: ✅ Signed
- [ ] Artifacts uploaded: ✅ 4 files

**If failed**: Check logs, fix issues, re-push

---

## 📦 DOWNLOAD ARTIFACTS (2 min)

- [ ] Downloaded: `AdminPanel-macOS.zip`
- [ ] Downloaded: `ClientPortal-macOS.zip`
- [ ] Downloaded: `Desktop-Windows.zip`
- [ ] Downloaded: `Desktop-Linux.zip`
- [ ] Checksums verified: `shasum -c *.sha256`

---

## 🧪 QA TESTING (15-20 min)

### macOS

- [ ] AdminPanel.app: Right-click → Open works
- [ ] ClientPortal.app: Right-click → Open works
- [ ] Version number correct in UI
- [ ] Login/authentication works
- [ ] Core features functional
- [ ] No crashes on basic usage

### Windows

- [ ] Installer runs successfully
- [ ] App launches from Start Menu
- [ ] Version number correct
- [ ] Core features functional

### Linux

- [ ] .deb installs: `sudo dpkg -i *.deb`
- [ ] .AppImage runs: `chmod +x *.AppImage && ./...`
- [ ] Core features functional

---

## 🚢 PUBLISH (10 min)

- [ ] GitHub Release created: https://github.com/ikanisa/prisma/releases/new
  - Tag: `v_____`
  - Title: "Prisma Glow Desktop v_____"
  - Description: (from CHANGELOG.md)
- [ ] Artifacts attached:
  - [ ] AdminPanel.app.zip + .sha256
  - [ ] ClientPortal.app.zip + .sha256
  - [ ] Windows installers
  - [ ] Linux packages
- [ ] Release published

**Download URLs** (verify):
```
https://github.com/ikanisa/prisma/releases/download/v_____/AdminPanel.app.zip
https://github.com/ikanisa/prisma/releases/download/v_____/ClientPortal.app.zip
```

---

## 📢 ANNOUNCE (5 min)

- [ ] Team notification sent (Slack/Email)
- [ ] Download links included
- [ ] Installation instructions provided
- [ ] RELEASES.md updated
- [ ] Old versions archived/removed

---

## 📊 POST-RELEASE (ongoing)

**Monitor for 24 hours**:

- [ ] No critical crashes reported
- [ ] No installation failures
- [ ] Users can download successfully
- [ ] Feedback collected

**Action items**: _______________________________________________

---

## ⏱️ TIMING

| Phase | Actual Time |
|-------|-------------|
| Pre-release | ______ min |
| CI/CD wait | ______ min |
| Download | ______ min |
| QA Testing | ______ min |
| Publish | ______ min |
| Announce | ______ min |
| **TOTAL** | ______ min |

**Target**: < 45 minutes  
**Actual**: ______ minutes

---

## 📝 NOTES

Issues encountered:


Improvements for next time:


---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete | 🔴 Blocked

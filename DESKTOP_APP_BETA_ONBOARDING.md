# Desktop App - Beta User Onboarding Guide

## 🎉 Welcome to Prisma Glow Desktop (Beta)!

Thank you for being an early adopter! This guide will get you up and running in 5 minutes.

---

## 🚀 Quick Start

### Step 1: Download & Install

1. **Download** the DMG file from the link you received
2. **Open** the DMG file
3. **Drag** Prisma Glow to your Applications folder
4. **Open** Prisma Glow from Applications

⚠️ **First Launch:** macOS will show a security warning. Right-click the app and select "Open" to bypass Gatekeeper.

### Step 2: Sign In

1. The app will open to the login screen
2. Enter your Prisma Glow email and password
3. Click "Sign In"
4. Your credentials will be securely stored in macOS Keychain

### Step 3: Verify Sync

1. Look for the sync status bar at the top
2. Click "Sync Now" to trigger your first sync
3. Wait for "Last sync: just now" to appear
4. Your data is now synced locally!

---

## ✨ Key Features

### 🔄 Automatic Sync
- Syncs every 5 minutes automatically
- Manual sync with "Sync Now" button
- Works offline (syncs when reconnected)

### 🪟 Native macOS Experience
- Custom title bar with window controls
- Full keyboard shortcuts support
- Native notifications

### ⚡ Lightning Fast
- Local SQLite database
- Instant search and filtering
- Works offline

---

## 🐛 Beta Testing - What We Need From You

### Please Report:
1. **Crashes** - If the app crashes, note what you were doing
2. **Sync Issues** - If data doesn't sync correctly
3. **Performance** - If the app feels slow
4. **UI Bugs** - Any visual glitches or layout issues
5. **Feature Requests** - What's missing?

### How to Report:
- **Email:** beta-feedback@prisma-glow.com
- **Slack:** #desktop-app-beta
- **Google Form:** [link to form]

### What to Include:
```
Bug Title: Short description
What happened: Detailed explanation
Expected: What should have happened
Steps to reproduce: 1, 2, 3...
macOS Version: (About This Mac)
App Version: (Help > About)
Screenshot: If applicable
```

---

## 📋 Testing Checklist

Please test these scenarios and report any issues:

### Basic Functionality
- [ ] Launch app successfully
- [ ] Sign in with credentials
- [ ] Create a new document
- [ ] Edit an existing document
- [ ] Trigger manual sync
- [ ] Close and reopen app (session persists?)

### Offline Mode
- [ ] Disconnect from internet
- [ ] Create/edit documents
- [ ] Reconnect to internet
- [ ] Verify sync completes

### Performance
- [ ] Launch time (< 3 seconds?)
- [ ] Memory usage (< 200MB?)
- [ ] Sync speed (< 5 seconds?)

### Window Controls
- [ ] Minimize window
- [ ] Maximize/restore window
- [ ] Close window (app quits?)
- [ ] Resize window (UI adapts?)

---

## 🔧 Troubleshooting

### App Won't Open
**Solution:** Right-click > Open (bypass Gatekeeper)

### "Cannot be opened" Error
**Solution:** System Preferences > Security & Privacy > Open Anyway

### Sync Not Working
**Solution:** 
1. Check internet connection
2. Click "Sync Now"
3. Check sync status bar
4. If still failing, email beta-feedback@prisma-glow.com

### Login Failed
**Solution:**
1. Verify email/password in web app
2. Clear Keychain entry: Keychain Access > search "Prisma Glow" > delete
3. Try logging in again

### App Crashed
**Solution:**
1. Relaunch the app
2. Report the crash with steps to reproduce
3. Check Console.app for crash logs (search "prisma-glow-desktop")

---

## 💡 Tips & Tricks

### Keyboard Shortcuts
- `Cmd+N` - New document
- `Cmd+S` - Save
- `Cmd+F` - Search
- `Cmd+R` - Refresh/Sync
- `Cmd+Q` - Quit

### Sync Status
- 🟢 Green - Synced
- 🟡 Yellow - Syncing
- 🔴 Red - Sync failed
- ⚪ Gray - Never synced

### Data Location
Your local database is stored at:
```
~/Library/Application Support/prisma-glow-desktop/prisma_glow.db
```

---

## 📊 Beta Timeline

**Week 1:** Internal testing (you are here!)
**Week 2:** Fix critical bugs
**Week 3:** Performance improvements
**Week 4:** Apple code signing
**Week 5:** Extended beta (50+ users)
**Week 6:** Public launch 🎉

---

## 🙏 Thank You!

Your feedback is invaluable. We're committed to making this the best desktop experience possible.

**Questions?** Email beta-feedback@prisma-glow.com

**Enjoying the app?** Share your thoughts in #desktop-app-beta

---

**App Version:** 1.0.0-beta  
**Last Updated:** 2025-12-02  
**Support:** beta-feedback@prisma-glow.com

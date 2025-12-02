# 🚀 Desktop App - Quick Start Guide

**Updated:** 2025-12-02  
**Time to Launch:** 2 minutes

---

## ⚡ FASTEST WAY TO TEST

```bash
./test-desktop-app.sh
```

**That's it!** Script will:
1. Check prerequisites ✅
2. Build Next.js (if needed) ✅
3. Verify Rust compiles ✅
4. Check environment ✅
5. Launch desktop app ✅

---

## 📋 WHAT YOU NEED

### Required (Must Have)
- ✅ Rust & Cargo installed
- ✅ pnpm installed  
- ✅ Node.js 20+

### Optional (For Full Features)
- Supabase credentials (for auth)
- macOS (for Keychain)

---

## 🎯 WHAT YOU'LL SEE

When you run the desktop app:

```
┌─────────────────────────────────────────┐
│ ● ● ●  Prisma Glow        [Sync Now]    │ ← Custom Title Bar
├─────────────────────────────────────────┤
│ 🟢 Last sync: 2:05 PM      [Sync Now]   │ ← Sync Status
├─────────────────────────────────────────┤
│                                          │
│      YOUR NEXT.JS APP HERE               │
│      (Real application, not HTML!)       │
│                                          │
│                                          │
│                                          │
│                                          │
│                                          │
└─────────────────────────────────────────┘
```

**Features Working:**
- ✅ macOS-style window controls (●●●)
- ✅ Draggable title bar
- ✅ Sync status indicator
- ✅ Real Next.js application
- ✅ DevTools (auto-open in debug)

---

## 🔐 SETUP ENVIRONMENT

**Create** `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.prisma-glow.com
```

---

## 🧪 QUICK TESTS

### Test 1: Window Controls
1. Click yellow button → Window minimizes
2. Click green button → Window maximizes
3. Click red button → App closes
4. Drag title bar → Window moves

### Test 2: Sync
1. Click "Sync Now" button
2. Watch status change to "Syncing..."
3. See "Last sync: [time]" when done

### Test 3: Authentication (if configured)
```typescript
// Open DevTools console and run:
import('@tauri-apps/api/tauri').then(({ invoke }) => {
  invoke('login', {
    email: 'test@example.com',
    password: 'password123'
  }).then(console.log);
});
```

---

## 📊 IMPLEMENTATION STATUS

```
┌──────────────────────────────────────────┐
│ COMPLETE ✅          65%                  │
├──────────────────────────────────────────┤
│ ████████████████░░░░░░░░░░               │
├──────────────────────────────────────────┤
│                                           │
│ ✅ Build System                           │
│ ✅ Next.js Integration                    │
│ ✅ Authentication                         │
│ ✅ Local Database                         │
│ ✅ Custom Title Bar                       │
│ ✅ Sync Manager UI                        │
│                                           │
│ ⚠️  Sync Logic (partial)                  │
│ ❌ Keyboard Shortcuts                     │
│ ❌ Production Security                    │
│ ❌ Automated Tests                        │
│                                           │
└──────────────────────────────────────────┘
```

---

## 🔥 NEXT STEPS

### To Complete Sync (1 hour)
1. Edit `src-tauri/src/main.rs`
2. Add `mod sync_commands;`
3. Add sync commands to handler
4. Update `SyncManager.tsx`

### To Add Shortcuts (30 min)
1. Create `shortcuts.rs`
2. Add menu to main
3. Test Cmd+N, Cmd+S

### To Go Production (3-4 weeks)
1. Apple Developer cert ($99)
2. Notarization setup
3. Comprehensive testing
4. Beta program
5. Public launch

---

## 🆘 TROUBLESHOOTING

### "Rust not installed"
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### "pnpm not installed"
```bash
npm install -g pnpm@9.12.3
```

### "Build fails"
```bash
cd src-tauri
cargo clean
cargo build
```

### "Window won't open"
```bash
# Check logs
tail -f src-tauri/target/debug/prisma-glow.log

# Force quit if needed
killall prisma-glow
```

---

## 📚 MORE INFO

- **Setup:** [DESKTOP_APP_SETUP_COMPLETE.md](./DESKTOP_APP_SETUP_COMPLETE.md)
- **Testing:** [DESKTOP_APP_TESTING_GUIDE.md](./DESKTOP_APP_TESTING_GUIDE.md)
- **Status:** [DESKTOP_APP_IMPLEMENTATION_STATUS.md](./DESKTOP_APP_IMPLEMENTATION_STATUS.md)
- **Roadmap:** [DESKTOP_APP_GO_LIVE_ACTION_PLAN.md](./DESKTOP_APP_GO_LIVE_ACTION_PLAN.md)

---

## ✅ SUCCESS CHECKLIST

- [ ] Ran `./test-desktop-app.sh`
- [ ] App launched successfully
- [ ] Saw custom title bar
- [ ] Window controls work
- [ ] Sync status shows
- [ ] Next.js app visible
- [ ] No errors in console

**All checked?** You're ready to develop! 🎉

---

**Launch command:** `./test-desktop-app.sh`  
**Time to launch:** < 2 minutes  
**Status:** Ready for testing ✅

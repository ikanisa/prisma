# Phase 1 Implementation - In Progress

**Started:** 2025-12-02  
**Branch:** refactor/consolidate-tauri  
**Status:** 🟡 IN PROGRESS

---

## 🎯 Goal

Consolidate duplicate Tauri structures into a single Tauri 2.0 project pointing to Vite/React build.

---

## ✅ Completed Steps

### Step 1: Create Feature Branch ✅
```bash
git checkout -b refactor/consolidate-tauri
```
**Status:** Complete

### Step 2: Backup desktop-app/ ✅
```bash
cp -r desktop-app desktop-app.backup
```
**Files Backed Up:**
- desktop-app/package.json
- desktop-app/src-tauri/Cargo.toml
- desktop-app/src-tauri/tauri.conf.json
- All build artifacts

**Status:** Complete - Backup at `desktop-app.backup/`

### Step 3: Configuration Analysis ✅

**Current State Identified:**

| Aspect | src-tauri/ | desktop-app/src-tauri/ |
|--------|------------|------------------------|
| **Tauri Version** | 1.6 | 2.0 ✅ |
| **Points To** | apps/client (Next.js) | Static HTML ❌ |
| **Rust Code** | Full (database.rs, etc.) ✅ | Minimal skeleton |
| **Backend** | Well-developed ✅ | Empty |

**Decision:** Keep src-tauri/ structure, upgrade to Tauri 2.0, delete desktop-app/

---

## 🔄 Next Steps

### Step 4: Upgrade src-tauri/Cargo.toml to Tauri 2.0 ⏳

**Changes needed:**
```toml
[build-dependencies]
-tauri-build = { version = "1.5", features = [] }
+tauri-build = { version = "2.0", features = [] }

[dependencies]
-tauri = { version = "1.6", features = [...] }
+tauri = { version = "2.0", features = [...] }

# Add Tauri 2.0 plugins
+tauri-plugin-dialog = "2.0"
+tauri-plugin-fs = "2.0"
+tauri-plugin-shell = "2.0"
```

### Step 5: Update src-tauri/tauri.conf.json ⏳

**Changes needed:**
```json
{
  "$schema": "https://schema.tauri.app/config/2.0",  // Add schema
  "build": {
    "beforeDevCommand": "pnpm run dev",
    "beforeBuildCommand": "pnpm run build",
    "devPath": "http://localhost:5173",  // Point to Vite
    "frontendDist": "../dist"  // Point to React build
  }
}
```

### Step 6: Delete desktop-app/ ⏳
```bash
git rm -rf desktop-app/
```

### Step 7: Test Build ⏳
```bash
cd src-tauri
cargo build
```

### Step 8: Test Dev Mode ⏳
```bash
pnpm tauri dev
```

### Step 9: Commit Changes ⏳
```bash
git add .
git commit -m "refactor: consolidate to single Tauri 2.0 project

- Upgrade src-tauri from Tauri 1.6 to 2.0
- Point to Vite dev server (:5173) and React build
- Remove duplicate desktop-app/ directory
- Keep all existing Rust backend code
"
```

---

## 📋 Implementation Guide

### Manual Steps Required

Since this is a significant architectural change, here's what needs to be done:

#### 1. Update Cargo.toml
Edit `src-tauri/Cargo.toml`:
- Change `tauri-build` version from `1.5` to `2.0`
- Change `tauri` version from `1.6` to `2.0`
- Update feature flags for Tauri 2.0 compatibility
- Add Tauri 2.0 plugin dependencies

#### 2. Update tauri.conf.json  
Edit `src-tauri/tauri.conf.json`:
- Add `$schema` pointing to Tauri 2.0 schema
- Update `build.devPath` to `http://localhost:5173`
- Update `build.frontendDist` to `../dist`
- Migrate config structure to Tauri 2.0 format
- Update window configuration
- Update bundle configuration

#### 3. Update main.rs (if needed)
Check `src-tauri/src/main.rs` for any Tauri 1.x API usage and update to 2.x

#### 4. Test Incrementally
- Test `cargo build` first
- Test `cargo run` 
- Test `pnpm tauri dev`
- Verify React app loads

---

## ⚠️ Potential Issues

### Issue 1: Tauri 2.0 API Changes
**Problem:** Tauri 2.0 has breaking API changes from 1.6  
**Solution:** Follow migration guide at https://beta.tauri.app/guides/migrate/v2/

### Issue 2: Plugin System Changed
**Problem:** Tauri 2.0 uses different plugin system  
**Solution:** Replace old plugins with new @tauri-apps/plugin-* packages

### Issue 3: Config Schema Changed
**Problem:** tauri.conf.json structure different in 2.0  
**Solution:** Use $schema and follow new format

---

## 🔍 Validation Checklist

After implementation, verify:

- [ ] `cargo build` succeeds
- [ ] No Tauri version conflicts
- [ ] `pnpm tauri dev` launches app
- [ ] Vite dev server starts at :5173
- [ ] React app loads in Tauri window
- [ ] System tray works
- [ ] All Rust commands accessible
- [ ] No duplicate src-tauri directories
- [ ] desktop-app/ removed from git

---

## 📚 Resources

- **Tauri 2.0 Migration Guide:** https://beta.tauri.app/guides/migrate/v2/
- **Tauri 2.0 Config:** https://schema.tauri.app/config/2.0
- **Backup Location:** `desktop-app.backup/`
- **Config Documentation:** `desktop-app-configs.txt`

---

**Status:** Paused - Awaiting manual implementation  
**Next:** Update Cargo.toml and tauri.conf.json as outlined above

**To continue:**
1. Manually edit files as described
2. Test build: `cd src-tauri && cargo build`
3. Return here to complete remaining steps


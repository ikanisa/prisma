# Desktop App Guide
## Prisma Glow Desktop Application

**Version:** 2.0.0  
**Last Updated:** January 2025

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Overview](#overview)
3. [Technical Architecture](#technical-architecture)
4. [Development Setup](#development-setup)
5. [Integration Guide](#integration-guide)
6. [Testing](#testing)
7. [Optimization](#optimization)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Fastest Way to Test

```bash
./test-desktop-app.sh
```

This script will:
1. Check prerequisites ✅
2. Build Next.js (if needed) ✅
3. Verify Rust compiles ✅
4. Check environment ✅
5. Launch desktop app ✅

### Manual Setup

```bash
# Install dependencies
pnpm install

# Build Next.js app
pnpm --filter @prisma-glow/web build

# Run desktop app
pnpm desktop:dev
```

---

## Overview

The Prisma Glow Desktop App is built with:
- **Tauri 2.0** - Rust-based desktop framework
- **Next.js** - Frontend application
- **SQLite** - Local database
- **Keychain** - Secure credential storage (macOS)

### Key Features

- ✅ Native desktop experience
- ✅ Offline-first architecture
- ✅ Automatic sync with server
- ✅ Secure credential storage
- ✅ Custom title bar
- ✅ System tray integration

---

## Technical Architecture

### Stack

- **Frontend:** Next.js 15, React 18, TypeScript
- **Backend:** Rust (Tauri)
- **Database:** SQLite (local), PostgreSQL (server)
- **Sync:** Background sync with conflict resolution

### Project Structure

```
src-tauri/          # Rust/Tauri backend
apps/web/           # Next.js frontend
apps/web/lib/desktop/  # Desktop-specific utilities
```

### Key Components

- **TitleBar** - Custom window controls
- **SyncManager** - Background sync logic
- **OfflineStorage** - IndexedDB + SQLite
- **AuthManager** - Keychain integration

---

## Development Setup

### Prerequisites

- **Rust & Cargo** - Latest stable version
- **pnpm** - 9.12.3+
- **Node.js** - 22.12.0+
- **macOS** - For Keychain support (optional)

### Installation

```bash
# Install Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install dependencies
pnpm install

# Build workspace packages
pnpm run build
```

### Development Commands

```bash
# Start development server
pnpm desktop:dev

# Build for production
pnpm desktop:build

# Build for macOS (universal)
pnpm tauri:build:macos

# Run tests
pnpm test:desktop
```

---

## Integration Guide

### Next.js Integration

The desktop app loads the Next.js build output:

```typescript
// tauri.conf.json
{
  "build": {
    "distDir": "../apps/web/out"
  }
}
```

### Desktop-Specific Features

#### Platform Detection

```typescript
import { isDesktop } from '@/lib/desktop/tauri';

if (isDesktop()) {
  // Desktop-specific code
}
```

#### Title Bar

```typescript
import { TitleBar } from '@/app/components/desktop/TitleBar';

<TitleBar />
```

#### Sync Manager

```typescript
import { useSyncManager } from '@/app/components/desktop/SyncManager';

const { syncStatus, syncNow } = useSyncManager();
```

---

## Testing

### Unit Tests

```bash
pnpm test:desktop:unit
```

### E2E Tests

```bash
pnpm test:desktop
```

### Manual Testing Checklist

- [ ] App launches successfully
- [ ] Authentication works
- [ ] Offline mode functions
- [ ] Sync works when online
- [ ] Title bar displays correctly
- [ ] System tray menu works
- [ ] Keyboard shortcuts work

---

## Optimization

### Build Size

- Target: < 200MB installed size
- Current: ~150MB

### Performance

- Startup time: < 5 seconds
- Memory usage: < 500MB
- CPU usage: < 5% idle

### Optimization Tips

1. **Code Splitting** - Lazy load routes
2. **Asset Optimization** - Compress images
3. **Bundle Analysis** - Use webpack-bundle-analyzer
4. **Rust Optimization** - Use release builds

---

## Production Deployment

### Code Signing

```bash
# Generate certificate (requires Apple Developer account)
# See CODE_SIGNING_SETUP.md
```

### Notarization

```bash
# Notarize app
xcrun notarytool submit app.dmg --keychain-profile "notarytool"
```

### Distribution

1. Build universal binary
2. Create DMG installer
3. Code sign
4. Notarize
5. Upload to distribution platform

---

## Troubleshooting

### Common Issues

#### App Won't Build

```bash
# Clean and rebuild
rm -rf node_modules apps/web/.next src-tauri/target
pnpm install
pnpm run build
```

#### Sync Not Working

1. Check network connection
2. Verify Supabase credentials
3. Check sync status in UI
4. Review logs: `~/Library/Logs/prisma-glow/`

#### Authentication Issues

1. Clear Keychain entries
2. Re-authenticate
3. Check Supabase configuration

---

## Related Documentation

- [Quick Start Guide](../DESKTOP_APP_QUICK_START.md)
- [Full Stack Audit](./DESKTOP_APP_FULLSTACK_AUDIT_2025.md)
- [Tauri Documentation](https://tauri.app)
- [Next.js Documentation](https://nextjs.org)

---

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review [Full Stack Audit](./DESKTOP_APP_FULLSTACK_AUDIT_2025.md)
- Open an issue on GitHub

---

**Last Updated:** January 2025  
**Maintained By:** Desktop Team


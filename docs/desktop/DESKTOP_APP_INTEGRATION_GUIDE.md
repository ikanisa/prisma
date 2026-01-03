/**
 * Desktop App Integration - Tauri Shell
 * Phase 5: Native desktop capabilities
 */

# Desktop App Integration Guide (Tauri)

## 🎯 Overview
Transform Prisma Glow into a native desktop application using Tauri, providing:
- Native performance
- System integration (file access, notifications)
- Offline-first capabilities
- Auto-updates

## 1. Setup Tauri

### Install Tauri CLI
```bash
pnpm add -D @tauri-apps/cli
pnpm add @tauri-apps/api
```

### Initialize Tauri
```bash
pnpm tauri init

# Configuration prompts:
# - App name: Prisma Glow
# - Window title: Prisma Glow
# - Web assets: ../ui/dist
# - Dev server: http://localhost:5173
# - Frontend dev command: pnpm run dev
# - Frontend build command: pnpm run build
```

### Project Structure
```
prisma/
├── src-tauri/          # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs     # Main Tauri app
│   │   └── commands.rs # Rust commands
│   ├── icons/          # App icons
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri config
├── ui/                 # Frontend (existing)
└── package.json
```

## 2. Tauri Configuration

### tauri.conf.json
```json
{
  "build": {
    "beforeDevCommand": "pnpm run dev",
    "beforeBuildCommand": "pnpm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../ui/dist"
  },
  "package": {
    "productName": "Prisma Glow",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": {
        "scope": ["$APPDATA/*", "$DOCUMENT/*"],
        "readFile": true,
        "writeFile": true
      },
      "dialog": {
        "open": true,
        "save": true
      },
      "notification": {
        "all": true
      },
      "shell": {
        "open": true
      },
      "http": {
        "scope": ["https://api.prisma-glow.com/*"]
      }
    },
    "windows": [
      {
        "title": "Prisma Glow",
        "width": 1400,
        "height": 900,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    }
  }
}
```

## 3. Rust Backend (Tauri Commands)

### src-tauri/src/main.rs
```rust
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod commands;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      commands::save_document,
      commands::load_document,
      commands::show_notification,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

### src-tauri/src/commands.rs
```rust
use tauri::command;
use std::fs;

#[command]
pub fn save_document(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[command]
pub fn load_document(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[command]
pub fn show_notification(title: String, body: String) {
    // Notification logic
    Ok(())
}
```

## 4. Frontend Integration

### Detect Desktop Environment
```tsx
// ui/src/lib/desktop.ts
import { invoke } from '@tauri-apps/api/tauri';

export const isDesktop = () => {
  return '__TAURI__' in window;
};

export const saveDocumentToFile = async (content: string) => {
  if (!isDesktop()) {
    // Fallback: browser download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.txt';
    a.click();
    return;
  }

  // Desktop: use Tauri
  const { save } = await import('@tauri-apps/api/dialog');
  const filePath = await save({
    filters: [{ name: 'Text', extensions: ['txt'] }],
  });

  if (filePath) {
    await invoke('save_document', { path: filePath, content });
  }
};
```

### System Notifications
```tsx
// ui/src/lib/notifications.ts
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';

export const showDesktopNotification = async (title: string, body: string) => {
  if (!isDesktop()) {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }

  // Tauri notification
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  if (permissionGranted) {
    sendNotification({ title, body });
  }
};
```

## 5. Window Management

### Custom Title Bar
```tsx
// ui/src/components/desktop/TitleBar.tsx
import { appWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  if (!isDesktop()) return null;

  return (
    <div data-tauri-drag-region className="h-8 bg-muted flex items-center justify-between px-2">
      <div className="text-sm font-semibold">Prisma Glow</div>
      <div className="flex gap-2">
        <button onClick={() => appWindow.minimize()}>
          <Minus className="h-4 w-4" />
        </button>
        <button onClick={() => appWindow.toggleMaximize()}>
          <Square className="h-4 w-4" />
        </button>
        <button onClick={() => appWindow.close()}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

## 6. Auto-Updates (Tauri Updater)

### Enable Updater
```json
// tauri.conf.json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.prisma-glow.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

### Check for Updates
```tsx
// ui/src/hooks/useAutoUpdate.ts
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater';
import { relaunch } from '@tauri-apps/api/process';

export function useAutoUpdate() {
  const checkForUpdates = async () => {
    const { shouldUpdate, manifest } = await checkUpdate();
    
    if (shouldUpdate) {
      await installUpdate();
      await relaunch();
    }
  };

  useEffect(() => {
    if (isDesktop()) {
      checkForUpdates();
    }
  }, []);
}
```

## 7. Build & Distribution

### Development
```bash
# Run desktop app in dev mode
pnpm tauri dev
```

### Production Build
```bash
# Build for current platform
pnpm tauri build

# Outputs:
# - macOS: .dmg, .app
# - Windows: .msi, .exe
# - Linux: .deb, .AppImage
```

### Cross-Platform Build (GitHub Actions)
```yaml
# .github/workflows/desktop-release.yml
name: Desktop Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-20.04, windows-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Prisma Glow ${{ github.ref_name }}'
          releaseBody: 'See CHANGELOG.md for details'
          releaseDraft: true
          prerelease: false
```

## 8. Icons & Branding

### Generate Icons
```bash
# Install icon generator
pnpm add -D @tauri-apps/cli

# Generate from single source (1024x1024 PNG)
pnpm tauri icon public/icon.png
```

## ✅ Desktop Feature Checklist

- [ ] Tauri setup & configuration
- [ ] File system access (save/load documents)
- [ ] Native notifications
- [ ] Custom title bar
- [ ] Window management (minimize, maximize, close)
- [ ] Auto-updates
- [ ] System tray integration
- [ ] Keyboard shortcuts (global)
- [ ] Cross-platform builds (macOS, Windows, Linux)
- [ ] Code signing & notarization

---

**Estimated Timeline**: 1-2 weeks for full desktop integration

# Prisma Glow Desktop Application

**Version 2.0.0** - Built with Tauri 2.0 + React + TypeScript

## Overview

This is the Prisma Glow desktop application, an AI-powered operations platform for modern teams. The desktop app provides native features including:

- **Native file system access** - Open, save, and manage files using native dialogs
- **System tray integration** - Quick access and background operation
- **Offline-first architecture** - Work offline with local SQLite database
- **Auto-updates** - Seamless updates with Tauri's updater
- **Cross-platform** - Runs on Windows, macOS, and Linux

## Architecture

```
desktop-app/
├── src-tauri/           # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs      # Application entry point
│   │   └── commands/    # IPC command handlers
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri configuration
├── package.json         # Desktop-specific deps
└── README.md
```

The desktop app uses the React frontend from the root `src/` directory and bundles it with a Tauri Rust backend.

## Development

### Prerequisites

- Node.js 22.12.0+
- Rust 1.70+
- pnpm 9.12.3+
- Platform-specific requirements (see below)

### Setup

```bash
# From repository root
pnpm install --frozen-lockfile

# Install desktop-app dependencies
cd desktop-app
pnpm install --frozen-lockfile
```

### Running in Development

```bash
# From desktop-app directory
pnpm run dev
```

This will:
1. Start the Vite dev server on port 8080
2. Launch the Tauri development window
3. Enable hot reloading

## Building

### Development Build

```bash
pnpm run build:debug
```

### Production Build

```bash
pnpm run build
```

### Universal Binary (macOS)

```bash
pnpm run build:universal
```

## Platform-Specific Notes

### macOS

**Requirements:**
- Xcode Command Line Tools
- Apple Developer ID for code signing (optional for dev)

**Development:**
```bash
xcode-select --install
```

**Code Signing:**
For distribution, you need:
1. Apple Developer ID Application certificate
2. Apple Developer ID Installer certificate
3. Notarization with `xcrun notarytool`

### Windows

**Requirements:**
- Visual Studio C++ Build Tools
- WebView2 Runtime (usually pre-installed on Windows 10/11)

**Installation:**
```powershell
# Install Visual Studio Build Tools
winget install Microsoft.VisualStudio.2022.BuildTools
```

### Linux

**Requirements:**
```bash
# Ubuntu/Debian
sudo apt-get install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf
```

## IPC Commands

The following Tauri commands are available:

### Window Commands
- `minimize_window` - Minimize the window
- `maximize_window` - Toggle maximize/restore
- `close_window` - Close the window
- `toggle_fullscreen` - Toggle fullscreen mode
- `get_window_state` - Get current window state

### File System Commands
- `open_file_dialog` - Open native file picker
- `save_file_dialog` - Open native save dialog
- `read_file` - Read file contents
- `write_file` - Write file contents
- `list_directory` - List directory contents

### Database Commands
- `init_local_db` - Initialize local SQLite database
- `sync_to_local` - Sync data from server to local
- `sync_from_local` - Get local changes to sync
- `get_offline_data` - Query offline data

### System Commands
- `get_app_version` - Get application version
- `get_platform` - Get current platform
- `get_system_theme` - Get system theme preference
- `check_for_updates` - Check for app updates

## Configuration

### tauri.conf.json

Key configuration options:

- **build.devUrl** - Development server URL (http://localhost:8080)
- **build.frontendDist** - Built frontend directory (../../dist)
- **app.windows** - Window configuration
- **bundle** - Platform-specific bundle settings
- **plugins.updater** - Auto-updater configuration

## Troubleshooting

### Common Issues

**"Failed to open database"**
- Ensure the app data directory is writable
- Check file permissions

**"Not in Tauri environment"**
- This error appears when running in web mode
- Desktop features are only available in the Tauri app

**Build fails with Rust errors**
- Run `cargo clean` in src-tauri directory
- Update Rust: `rustup update`

### Logs

Logs are stored in the app data directory:
- macOS: `~/Library/Application Support/com.prismaglow.desktop/logs`
- Windows: `%APPDATA%\com.prismaglow.desktop\logs`
- Linux: `~/.local/share/com.prismaglow.desktop/logs`

## Production Checklist

- [ ] Code signing configured
- [ ] Notarization (macOS) configured
- [ ] Updater endpoints configured
- [ ] Bundle icons provided
- [ ] App sandbox enabled
- [ ] Hardened runtime enabled (macOS)
- [ ] Security audit completed

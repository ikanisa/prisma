# Prisma Glow Desktop Application

Built with Tauri 2.0 + React + TypeScript

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

## Building

```bash
# Build for production
pnpm run build

# Build debug version
pnpm run build:debug
```

## Features

- Native file system access
- Cross-platform (Windows, macOS, Linux)
- Auto-updates
- System tray integration
- Deep linking support
- Offline-first architecture

## Requirements

- Node.js 20+
- Rust 1.70+
- pnpm 9+

## Platform-Specific Notes

### macOS
- Requires Xcode Command Line Tools
- Code signing required for distribution

### Windows
- Visual Studio C++ Build Tools required
- Code signing recommended for distribution

### Linux
- Requires various system libraries
- See Tauri documentation for distribution packages

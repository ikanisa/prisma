# Prisma Glow Desktop App - Internal Deployment Guide

## Overview
This guide explains how to build and distribute the Prisma Glow Desktop App to internal team members. Since this is an in-house application, we use unsigned development builds which are simpler and don't require Apple Developer Program enrollment.

## For Developers: Building the App

### Prerequisites
- macOS 10.15 or later
- Node.js 22.12.0+ and pnpm 9.12.3+
- Rust and Cargo (install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)

### Quick Build
```bash
# From the project root
./build-dev.sh
```

This will:
1. Install dependencies
2. Build the frontend (Vite)
3. Build the Tauri app in debug mode
4. Create a `.app` bundle

### Build Output
The app will be located at:
```
src-tauri/target/debug/bundle/macos/Prisma Glow.app
```

### Creating a DMG for Distribution
```bash
pnpm tauri build --debug --bundles dmg
```

The DMG will be at:
```
src-tauri/target/debug/bundle/dmg/Prisma Glow_1.0.0_x64.dmg
```

## For End Users: Installing the App

### Method 1: Direct .app Installation
1. Copy `Prisma Glow.app` to your Applications folder
2. **First launch only**: Right-click the app and select "Open"
3. Click "Open" in the security dialog
4. The app will now launch normally

### Method 2: DMG Installation
1. Double-click the `.dmg` file
2. Drag `Prisma Glow.app` to the Applications folder
3. Eject the DMG
4. **First launch only**: Right-click the app and select "Open"
5. Click "Open" in the security dialog

## Bypassing Gatekeeper (First Launch)

Since the app is not signed with an Apple Developer certificate, macOS Gatekeeper will block it on first launch.

### Expected Warning
```
"Prisma Glow" cannot be opened because the developer cannot be verified.
```

### Solution
1. **Right-click** (or Control+click) on `Prisma Glow.app`
2. Select **"Open"** from the context menu
3. Click **"Open"** in the dialog that appears
4. The app will launch and be remembered for future launches

### Alternative: System Settings Method
1. Try to open the app normally (it will be blocked)
2. Go to **System Settings** → **Privacy & Security**
3. Scroll down to the **Security** section
4. Click **"Open Anyway"** next to the Prisma Glow message
5. Click **"Open"** in the confirmation dialog

## Troubleshooting

### "App is damaged and can't be opened"
This can happen if the app was downloaded from certain sources. Fix:
```bash
xattr -cr "/Applications/Prisma Glow.app"
```

### App won't launch after update
1. Quit the app completely
2. Delete the app from Applications
3. Empty Trash
4. Install the new version
5. Follow first-launch instructions again

### "Operation not permitted" error
The app may need additional permissions:
1. Go to **System Settings** → **Privacy & Security**
2. Grant permissions as requested (Files and Folders, etc.)

### App crashes on launch
Check the Console app for crash logs:
1. Open **Console.app**
2. Search for "Prisma Glow"
3. Share the crash log with the development team

## Distribution Best Practices

### For IT/Admins
1. **Test first**: Always test new builds on a test machine before distributing
2. **Version control**: Keep track of which version is deployed
3. **Shared location**: Use a shared network drive or cloud storage for distribution
4. **Update notifications**: Notify users when new versions are available

### Recommended Distribution Methods
- **Internal file server**: Copy `.dmg` to shared network location
- **Cloud storage**: Upload to Google Drive/Dropbox with restricted access
- **Email**: For small teams, email the `.dmg` directly
- **MDM**: For larger deployments, use Mobile Device Management

## Security Considerations

### Why No Code Signing?
- **Cost**: Apple Developer Program costs $99/year
- **Complexity**: Notarization process adds development overhead
- **Internal use**: Not required for in-house applications
- **Trust**: Internal users can verify app source directly

### Security Best Practices
1. **Verify source**: Only install from trusted internal sources
2. **Check version**: Verify you're installing the correct version
3. **Scan for malware**: Use antivirus if downloading from external sources
4. **Report issues**: Report any suspicious behavior immediately

## Updating the App

### For Users
1. Quit the current version
2. Download the new version
3. Replace the old app in Applications
4. Launch the new version (no Gatekeeper bypass needed after first install)

### For Developers
1. Update version in `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`
2. Build new version with `./build-dev.sh`
3. Test thoroughly
4. Distribute to team

## Support

### Getting Help
- **Development team**: Contact the Prisma Glow development team
- **Documentation**: Check the main README.md for technical details
- **Issues**: Report bugs via your internal issue tracking system

### Logs Location
If you need to share logs for troubleshooting:
```
~/Library/Logs/Prisma Glow/
```

## Appendix: Technical Details

### Build Configuration
- **Framework**: Tauri 2.0
- **Frontend**: React + Vite
- **Backend**: Rust
- **Target**: macOS 10.15+

### Bundle Structure
```
Prisma Glow.app/
├── Contents/
│   ├── Info.plist
│   ├── MacOS/
│   │   └── prisma-glow-desktop (binary)
│   └── Resources/
│       └── (frontend assets)
```

### Environment Variables
The app uses these environment variables (configured in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

---

**Last Updated**: December 2, 2025  
**Version**: 1.0.0  
**Maintained by**: Prisma Glow Development Team

# Desktop App Deployment Guide

## Overview

This guide covers building, signing, and deploying the Prisma Glow desktop applications:

1. **Admin Panel** - Internal administration application
2. **Client Portal** - Client/staff-facing portal application

Both apps are built with **Tauri 2.0** and support **macOS, Windows, and Linux**.

---

## Quick Start

### Local Build and Sign (macOS)

```bash
# 1. Build both apps
./scripts/build-desktop-apps.sh

# 2. Sign both apps (requires certificate)
./scripts/sign_all_apps.sh

# 3. Test the signed apps
open dist/mac/AdminPanel.app
open dist/mac/ClientPortal.app
```

### CI/CD Build and Sign (GitHub Actions)

Push to `main` branch or manually trigger the workflow:

```bash
git push origin main
```

Or via GitHub UI: Actions → Build and Sign Desktop Apps → Run workflow

---

## Prerequisites

### Development Machine

**macOS**:
- macOS 10.15+ (Catalina or later)
- Xcode Command Line Tools: `xcode-select --install`
- Node.js 22.12.0
- pnpm 9.12.3: `npm install -g pnpm@9.12.3`
- Rust 1.70+: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

**Windows**:
- Windows 10/11
- Visual Studio C++ Build Tools
- Node.js 22.12.0
- pnpm 9.12.3
- Rust 1.70+

**Linux**:
- Ubuntu 20.04+ or equivalent
- System libraries: `sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf`
- Node.js 22.12.0
- pnpm 9.12.3
- Rust 1.70+

### Code Signing (macOS)

For internal distribution, create a self-signed certificate:

1. Follow instructions in [`docs/internal_mac_signing.md`](./internal_mac_signing.md)
2. Or for production, use an Apple Developer ID certificate

---

## Build Process

### Automated Build Script

The `build-desktop-apps.sh` script builds both apps:

```bash
# Release build (optimized)
./scripts/build-desktop-apps.sh

# Debug build (faster, includes debug symbols)
BUILD_MODE=debug ./scripts/build-desktop-apps.sh
```

**What it does**:
1. Installs dependencies (`pnpm install`)
2. Builds Admin Panel with custom config
3. Builds Client Portal with custom config
4. Outputs to `dist/mac/AdminPanel.app` and `dist/mac/ClientPortal.app`

### Manual Build

If you need to build manually:

```bash
cd desktop-app

# Install dependencies
pnpm install

# Build (creates one app with current tauri.conf.json)
pnpm run build

# Debug build
pnpm run build:debug

# Development mode (hot reload)
pnpm run dev
```

**Note**: Manual builds only create one app at a time. Use the automated script for both apps.

### Build Configuration

Each app has different settings in `tauri.conf.json`:

| Setting | Admin Panel | Client Portal |
|---------|------------|---------------|
| **Product Name** | Prisma Glow Admin Panel | Prisma Glow Client Portal |
| **Bundle ID** | com.prismaglow.admin | com.prismaglow.client |
| **Window Size** | 1400x900 | 1200x800 |
| **Min Size** | 1024x768 | 800x600 |

The build script automatically switches configs between builds.

---

## Code Signing

### macOS Signing

After building, sign both apps:

```bash
# Sign with default identity ("Inhouse Dev Signing")
./scripts/sign_all_apps.sh

# Sign with custom identity
export SIGNING_IDENTITY="Developer ID Application: Company (TEAM)"
./scripts/sign_all_apps.sh

# Sign individual app
./scripts/sign_app.sh ./dist/mac/AdminPanel.app "Inhouse Dev Signing"
```

**Verification**:

```bash
# Verify signatures
codesign --verify --deep --strict --verbose=2 ./dist/mac/AdminPanel.app
codesign --verify --deep --strict --verbose=2 ./dist/mac/ClientPortal.app

# Check Gatekeeper status
spctl --assess --verbose=4 --type execute ./dist/mac/AdminPanel.app
spctl --assess --verbose=4 --type execute ./dist/mac/ClientPortal.app
```

### Windows Signing (Optional)

For Windows, you can sign with a code signing certificate:

```bash
# Using signtool.exe (requires Windows SDK)
signtool sign /f cert.pfx /p password /t http://timestamp.digicert.com AdminPanel.exe
```

### Linux Signing

Linux .deb and .AppImage packages typically don't require signing for internal distribution.

---

## Distribution

### Package for Distribution

**macOS**:

```bash
cd dist/mac

# Create ZIP archives
ditto -c -k --keepParent AdminPanel.app AdminPanel.app.zip
ditto -c -k --keepParent ClientPortal.app ClientPortal.app.zip

# Generate checksums for verification
shasum -a 256 AdminPanel.app.zip > AdminPanel.app.zip.sha256
shasum -a 256 ClientPortal.app.zip > ClientPortal.app.zip.sha256
```

**Windows**:

Built installers are ready to distribute:
- `desktop-app/src-tauri/target/release/bundle/msi/*.msi` (MSI installer)
- `desktop-app/src-tauri/target/release/bundle/nsis/*.exe` (NSIS installer)

**Linux**:

Built packages are ready to distribute:
- `desktop-app/src-tauri/target/release/bundle/deb/*.deb` (Debian package)
- `desktop-app/src-tauri/target/release/bundle/appimage/*.AppImage` (AppImage)

### Distribution Methods

**Internal File Sharing**:
- Upload signed apps to secure internal file server
- Share via encrypted cloud storage (Google Drive, Dropbox with password)
- Include checksums for verification

**Email Distribution**:
- Attach ZIP files to internal emails
- Include SHA-256 checksums in email body
- Provide installation instructions

**MDM/Software Distribution**:
- Use Jamf, Munki, or Microsoft Intune for automated deployment
- Push apps to managed devices
- Configure policies for auto-updates

**GitHub Releases**:
- Create a release in your private repo
- Attach signed app archives
- Include release notes and checksums

---

## CI/CD Integration

### GitHub Actions Workflow

The workflow in `.github/workflows/desktop-build-sign.yml` automatically:

1. **Builds** apps for macOS, Windows, and Linux
2. **Signs** macOS apps (if certificates are configured)
3. **Creates** distribution archives with checksums
4. **Uploads** artifacts for download

### Required Secrets

Configure in GitHub Settings → Secrets and variables → Actions:

| Secret | Description | Required |
|--------|-------------|----------|
| `MACOS_CERTIFICATE_BASE64` | Base64-encoded .p12 certificate | For macOS signing |
| `MACOS_CERTIFICATE_PASSWORD` | Certificate password | For macOS signing |
| `MACOS_SIGNING_IDENTITY` | Identity name (default: "Inhouse Dev Signing") | Optional |

### Setting Up Secrets

1. **Export certificate**:
   ```bash
   # Export from Keychain Access as .p12
   # Then base64 encode
   base64 -i InhouseDevSigning.p12 -o cert.p12.base64
   cat cert.p12.base64
   # Copy the output
   ```

2. **Add to GitHub**:
   - Go to repo Settings → Secrets → New repository secret
   - Name: `MACOS_CERTIFICATE_BASE64`
   - Value: Paste base64 output
   - Add another secret: `MACOS_CERTIFICATE_PASSWORD` with the certificate password

3. **Trigger workflow**:
   ```bash
   git push origin main
   ```

### Downloading Artifacts

After workflow completes:

1. Go to Actions → Build and Sign Desktop Apps → Select run
2. Scroll to Artifacts section
3. Download:
   - `AdminPanel-macOS.zip`
   - `ClientPortal-macOS.zip`
   - `Desktop-Windows.zip`
   - `Desktop-Linux.zip`

---

## Testing

### Pre-Distribution Testing

**Functional Tests**:

```bash
# Launch apps
open dist/mac/AdminPanel.app
open dist/mac/ClientPortal.app

# Test checklist:
# - App launches without errors
# - UI renders correctly
# - Can connect to backend API
# - File system access works (save/open)
# - System tray integration (if applicable)
# - Deep linking works (if applicable)
```

**Code Signing Verification**:

```bash
# Verify signatures are valid
codesign --verify --deep --strict --verbose=2 ./dist/mac/AdminPanel.app
codesign --verify --deep --strict --verbose=2 ./dist/mac/ClientPortal.app

# Check signature details
codesign -dvvv ./dist/mac/AdminPanel.app

# Test Gatekeeper (will fail for self-signed, pass for Developer ID)
spctl --assess --verbose=4 --type execute ./dist/mac/AdminPanel.app
```

**User Acceptance Testing**:

1. Distribute to small group of internal users
2. Verify first-launch experience (right-click → Open for self-signed)
3. Test core workflows
4. Collect feedback

### Automated Testing

Add end-to-end tests for desktop apps:

```bash
# Install Tauri testing dependencies
cd desktop-app
pnpm add -D @tauri-apps/cli-test

# Run tests
pnpm run test:e2e
```

---

## User Installation Instructions

### macOS (Self-Signed Certificate)

**First-time installation**:

1. Download `AdminPanel.app.zip` or `ClientPortal.app.zip`
2. Verify checksum (optional but recommended):
   ```bash
   shasum -a 256 AdminPanel.app.zip
   # Compare with AdminPanel.app.zip.sha256
   ```
3. Double-click ZIP to extract
4. **Right-click** the app → Select **Open** (DO NOT double-click)
5. Click **Open** in the security dialog
6. App will launch and remember this choice

**Subsequent launches**: Double-click normally

### macOS (Developer ID Certificate)

1. Download and extract ZIP
2. Verify checksum (optional)
3. Double-click to launch - no warnings!

### Windows

1. Download the `.msi` or `.exe` installer
2. Double-click to run installer
3. Follow installation wizard
4. App will be in Start Menu

### Linux (Debian/Ubuntu)

```bash
# Download .deb package
wget https://yourserver.com/AdminPanel.deb

# Install
sudo dpkg -i AdminPanel.deb

# If dependencies are missing
sudo apt-get install -f
```

### Linux (AppImage)

```bash
# Download AppImage
wget https://yourserver.com/AdminPanel.AppImage

# Make executable
chmod +x AdminPanel.AppImage

# Run
./AdminPanel.AppImage
```

---

## Troubleshooting

### Build Issues

**Problem**: `cargo: command not found`

**Solution**: Install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Problem**: `pnpm: command not found`

**Solution**: Install pnpm:
```bash
npm install -g pnpm@9.12.3
```

**Problem**: Tauri build fails with linker errors (Linux)

**Solution**: Install required system libraries:
```bash
sudo apt-get update
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
```

### Signing Issues

**Problem**: No identities found

**Solution**: Create or import signing certificate (see `docs/internal_mac_signing.md`)

**Problem**: "User interaction is not allowed" in CI

**Solution**: Use `security set-key-partition-list` (handled automatically in workflow)

**Problem**: Gatekeeper blocks app

**Solution**: For self-signed certs, instruct users to right-click → Open. For Developer ID, ensure certificate is not expired.

### Runtime Issues

**Problem**: App won't launch - "damaged" error

**Solution**: Remove quarantine flag:
```bash
xattr -cr ./dist/mac/AdminPanel.app
```

**Problem**: API connection errors

**Solution**: Check CSP settings in `tauri.conf.json` allow your API domain

**Problem**: File system access denied

**Solution**: Check `fs.scope` in `tauri.conf.json` includes required paths

---

## Version Management

### Updating Version Numbers

**Update in multiple places**:

1. `desktop-app/package.json`:
   ```json
   {
     "version": "1.1.0"
   }
   ```

2. `desktop-app/src-tauri/tauri.conf.json`:
   ```json
   {
     "version": "1.1.0"
   }
   ```

3. `desktop-app/src-tauri/Cargo.toml`:
   ```toml
   [package]
   version = "1.1.0"
   ```

**Automated version bumping**:

```bash
cd desktop-app
pnpm version patch  # 1.0.0 → 1.0.1
pnpm version minor  # 1.0.0 → 1.1.0
pnpm version major  # 1.0.0 → 2.0.0
```

### Release Workflow

1. **Update version numbers** (all three files above)
2. **Update CHANGELOG.md** with new features/fixes
3. **Build and test** locally
4. **Commit and tag**:
   ```bash
   git add .
   git commit -m "Release v1.1.0"
   git tag -a v1.1.0 -m "Version 1.1.0"
   git push origin main --tags
   ```
5. **CI builds and signs** automatically
6. **Download artifacts** from GitHub Actions
7. **Create GitHub Release** and attach artifacts
8. **Distribute** to users

---

## Auto-Updates (Future Enhancement)

Tauri supports auto-updates via the `updater` plugin:

1. **Enable updater** in `tauri.conf.json`:
   ```json
   {
     "plugins": {
       "updater": {
         "active": true,
         "endpoints": [
           "https://releases.prismaglow.com/{{target}}/{{current_version}}"
         ],
         "dialog": true,
         "pubkey": "YOUR_PUBLIC_KEY"
       }
     }
   }
   ```

2. **Generate signing keys**:
   ```bash
   pnpm tauri signer generate -w ~/.tauri/myapp.key
   ```

3. **Set up release server** that serves JSON with latest version info

4. **Sign updates** during build:
   ```bash
   export TAURI_PRIVATE_KEY=$(cat ~/.tauri/myapp.key)
   pnpm run build
   ```

---

## Security Best Practices

### Certificate Management

- ✅ Store `.p12` files securely (password manager, encrypted storage)
- ✅ Use strong passwords (16+ characters)
- ✅ Rotate certificates annually
- ✅ Revoke certificates when team members leave
- ❌ Never commit certificates to git
- ❌ Never share certificates via unencrypted channels

### Build Security

- ✅ Use locked dependency versions (`pnpm install --frozen-lockfile`)
- ✅ Audit dependencies regularly (`pnpm audit`)
- ✅ Verify checksums before distributing
- ✅ Use HTTPS for all API connections
- ✅ Implement Content Security Policy (CSP)
- ❌ Never disable security features for convenience

### Distribution Security

- ✅ Provide SHA-256 checksums with all downloads
- ✅ Use secure channels (HTTPS, encrypted email, VPN)
- ✅ Version all releases
- ✅ Maintain a list of distributed versions
- ❌ Never distribute unsigned apps
- ❌ Never use unencrypted HTTP for downloads

---

## Appendix: Command Reference

### Build Commands

```bash
# Build both apps (release)
./scripts/build-desktop-apps.sh

# Build both apps (debug)
BUILD_MODE=debug ./scripts/build-desktop-apps.sh

# Build manually (one app at a time)
cd desktop-app
pnpm run build
pnpm run build:debug
pnpm run dev
```

### Signing Commands

```bash
# Sign both apps
./scripts/sign_all_apps.sh

# Sign with custom identity
export SIGNING_IDENTITY="Developer ID Application: Company (TEAM)"
./scripts/sign_all_apps.sh

# Sign one app
./scripts/sign_app.sh ./dist/mac/AdminPanel.app "Inhouse Dev Signing"

# Verify signature
codesign --verify --deep --strict --verbose=2 ./dist/mac/AdminPanel.app

# Check Gatekeeper
spctl --assess --verbose=4 --type execute ./dist/mac/AdminPanel.app
```

### Distribution Commands

```bash
# Create ZIP archives
ditto -c -k --keepParent AdminPanel.app AdminPanel.app.zip

# Generate checksums
shasum -a 256 AdminPanel.app.zip > AdminPanel.app.zip.sha256

# Verify checksum
shasum -a 256 -c AdminPanel.app.zip.sha256
```

### Cleanup Commands

```bash
# Remove quarantine flag
xattr -cr ./dist/mac/AdminPanel.app

# Clean build artifacts
cd desktop-app
rm -rf src-tauri/target
rm -rf dist

# Clean all
pnpm run clean
cargo clean
```

---

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review Tauri documentation: https://tauri.app/
3. Check internal code signing guide: `docs/internal_mac_signing.md`
4. Contact the development team

---

## Summary

✅ **Build**: Automated script builds both Admin Panel and Client Portal apps  
✅ **Sign**: Scripts handle code signing for macOS (self-signed or Developer ID)  
✅ **CI/CD**: GitHub Actions workflow builds and signs automatically  
✅ **Distribute**: Create ZIPs with checksums for secure internal distribution  
✅ **Cross-platform**: Supports macOS, Windows, and Linux  
✅ **Future-proof**: Easy upgrade path to auto-updates and notarization  

**Next steps**:
1. Build apps locally: `./scripts/build-desktop-apps.sh`
2. Set up code signing certificate (see `docs/internal_mac_signing.md`)
3. Sign apps: `./scripts/sign_all_apps.sh`
4. Test locally: `open dist/mac/AdminPanel.app`
5. Configure CI/CD secrets for automated builds
6. Distribute to internal users

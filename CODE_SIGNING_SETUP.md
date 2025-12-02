# 🔐 Code Signing Setup Guide

Complete guide to set up code signing for Prisma Glow Desktop App.

---

## 📋 Prerequisites

### 1. Apple Developer Account
- [ ] Enroll in [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
- [ ] Wait for approval (usually 24-48 hours)
- [ ] Access to [Apple Developer Portal](https://developer.apple.com/account/)

### 2. Xcode Command Line Tools
```bash
xcode-select --install
```

---

## 🔑 Step 1: Create Certificates

### A. Developer ID Application Certificate

1. **Generate Certificate Signing Request (CSR)**
   ```bash
   # Open Keychain Access
   # Menu: Keychain Access → Certificate Assistant → Request Certificate from Certificate Authority
   # Fill in:
   #   - User Email: your.email@example.com
   #   - Common Name: Prisma Glow
   #   - Request: Save to disk
   # Save as: CertificateSigningRequest.certSigningRequest
   ```

2. **Create Certificate in Apple Developer Portal**
   - Go to: https://developer.apple.com/account/resources/certificates/add
   - Select: **Developer ID Application**
   - Upload your CSR file
   - Download the certificate (`.cer` file)

3. **Install Certificate**
   ```bash
   # Double-click the downloaded .cer file
   # It will be added to your Keychain
   ```

4. **Export Certificate as P12**
   ```bash
   # Open Keychain Access
   # Find: "Developer ID Application: Your Name"
   # Right-click → Export
   # Format: Personal Information Exchange (.p12)
   # Set a strong password
   # Save as: certificate.p12
   ```

5. **Convert to Base64**
   ```bash
   base64 -i certificate.p12 | pbcopy
   # The Base64 string is now in your clipboard
   ```

### B. Developer ID Installer Certificate (Optional - for PKG installers)

Repeat steps above but select **Developer ID Installer** instead.

---

## 🔐 Step 2: Create App-Specific Password

1. Go to: https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Security → App-Specific Passwords → Generate
4. Label: "Prisma Glow Notarization"
5. **Save this password** - you'll need it for `APPLE_PASSWORD`

---

## ⚙️ Step 3: Configure GitHub Secrets

Go to your repository: Settings → Secrets and variables → Actions → New repository secret

### Required Secrets

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `APPLE_CERTIFICATE` | Base64-encoded P12 certificate | Step 1.A.5 above |
| `APPLE_CERTIFICATE_PASSWORD` | P12 export password | Password you set in Step 1.A.4 |
| `APPLE_SIGNING_IDENTITY` | Certificate common name | Example: `Developer ID Application: Your Name (TEAM_ID)` |
| `APPLE_ID` | Your Apple ID email | Your Apple Developer account email |
| `APPLE_PASSWORD` | App-specific password | Step 2 above |
| `APPLE_TEAM_ID` | Your team ID | Found in Apple Developer Portal (top right) |
| `KEYCHAIN_PASSWORD` | Random secure password | Generate: `openssl rand -base64 32` |

### Optional Secrets

| Secret Name | Description | When Needed |
|------------|-------------|-------------|
| `TAURI_PRIVATE_KEY` | Auto-update private key | For built-in updater |
| `TAURI_KEY_PASSWORD` | Auto-update key password | For built-in updater |

---

## 🛠️ Step 4: Find Your Signing Identity

```bash
# List all signing identities
security find-identity -v -p codesigning

# Output example:
# 1) ABCDEF1234567890 "Developer ID Application: Your Name (TEAM_ID)"
```

Copy the exact string (including quotes) for `APPLE_SIGNING_IDENTITY`.

---

## 🔍 Step 5: Find Your Team ID

### Method 1: Apple Developer Portal
1. Go to: https://developer.apple.com/account/
2. Look in the top right corner
3. Team ID is displayed (10 characters, e.g., `ABCD123456`)

### Method 2: Command Line
```bash
# List all Developer ID certificates with team IDs
security find-certificate -a -c "Developer ID" -p | \
  openssl x509 -noout -subject | \
  grep -o "OU=[^/]*" | \
  cut -d= -f2
```

---

## ✅ Step 6: Verify Configuration

### Test Locally (Without Secrets)

```bash
# Build without signing
pnpm tauri build --config '{"bundle":{"macOS":{"signingIdentity":null}}}'
```

### Test Signing Locally

```bash
# Set environment variables
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"

# Build with signing
pnpm tauri build
```

### Verify Signed App

```bash
# Check code signature
codesign -dv --verbose=4 src-tauri/target/release/bundle/macos/Prisma\ Glow.app

# Verify signature
codesign --verify --verbose src-tauri/target/release/bundle/macos/Prisma\ Glow.app

# Check if hardened runtime is enabled
codesign -d --entitlements - src-tauri/target/release/bundle/macos/Prisma\ Glow.app
```

### Test Notarization Locally

```bash
# Create ZIP
ditto -c -k --keepParent "src-tauri/target/release/bundle/macos/Prisma Glow.app" app.zip

# Submit for notarization
xcrun notarytool submit app.zip \
  --apple-id "your.email@example.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "TEAM_ID" \
  --wait

# Check status
xcrun notarytool history \
  --apple-id "your.email@example.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "TEAM_ID"

# Staple the notarization ticket
xcrun stapler staple "src-tauri/target/release/bundle/macos/Prisma Glow.app"

# Verify stapling
xcrun stapler validate "src-tauri/target/release/bundle/macos/Prisma Glow.app"
```

---

## 🚨 Troubleshooting

### "No signing identity found"

**Solution:**
1. Make sure certificate is in your Keychain
2. Run: `security find-identity -v -p codesigning`
3. Update `APPLE_SIGNING_IDENTITY` secret with exact match

### "Invalid app-specific password"

**Solution:**
1. Generate a new app-specific password at appleid.apple.com
2. Update `APPLE_PASSWORD` secret

### "Team ID mismatch"

**Solution:**
1. Verify team ID: https://developer.apple.com/account/
2. Ensure it matches in both certificate and `APPLE_TEAM_ID` secret

### "Hardened Runtime issue"

**Solution:**
1. Check entitlements file exists: `src-tauri/entitlements.plist`
2. Verify in `tauri.conf.json`: `"hardenedRuntime": true`

### "Notarization failed"

**Solution:**
1. Check notarization log:
   ```bash
   xcrun notarytool log <submission-id> \
     --apple-id "your.email@example.com" \
     --password "xxxx-xxxx-xxxx-xxxx" \
     --team-id "TEAM_ID"
   ```
2. Fix any issues mentioned in the log
3. Re-submit

### "DMG not signed"

**Solution:**
- DMG is automatically signed when app bundle is signed
- Verify with: `codesign -dv path/to/file.dmg`

---

## 📊 GitHub Actions Workflow

### Manual Workflow Trigger

1. Go to: Repository → Actions → Desktop App - Build, Sign & Release
2. Click: Run workflow
3. Options:
   - Target: macos/windows/linux/all
   - Skip signing: true/false

### Automatic Builds

Workflow runs automatically on:
- Push to `main` branch (with signing)
- Pull requests (without signing)
- Changes to `src-tauri/` or `src/` or `apps/web/`

### Check Build Status

1. Go to: Repository → Actions
2. Click on latest workflow run
3. View logs for each job

---

## 🎯 Quick Reference

### Secrets Summary

```bash
# Required for code signing & notarization
APPLE_CERTIFICATE=<base64-p12>
APPLE_CERTIFICATE_PASSWORD=<p12-password>
APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
APPLE_ID=your.email@example.com
APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=ABCD123456
KEYCHAIN_PASSWORD=<random-password>
```

### Verify Checklist

- [ ] Certificate in Keychain
- [ ] P12 exported with password
- [ ] Base64 added to GitHub secrets
- [ ] App-specific password created
- [ ] Team ID correct
- [ ] Signing identity exact match
- [ ] Entitlements file exists
- [ ] Local build successful
- [ ] Local signing successful
- [ ] CI/CD workflow triggered
- [ ] Artifacts uploaded
- [ ] DMG signed and notarized

---

## 📚 Resources

- [Apple Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Tauri Code Signing Docs](https://tauri.app/v1/guides/distribution/sign-macos/)
- [Creating Certificates](https://developer.apple.com/help/account/create-certificates/)

---

## 🎊 Success Criteria

When everything is configured correctly:

✅ **Local Build**
```bash
pnpm tauri build
# No errors, app signed with Developer ID
```

✅ **Verify Signature**
```bash
codesign --verify --verbose src-tauri/target/release/bundle/macos/*.app
# Output: valid on disk, satisfies its Designated Requirement
```

✅ **Install & Run**
```bash
# Double-click the .app or .dmg
# No Gatekeeper warnings
# App opens immediately
```

✅ **CI/CD Build**
- Workflow completes successfully
- Artifacts uploaded
- DMG and app bundle signed
- Notarization successful
- Release created with assets

---

**Next:** Test the signed build on a clean macOS machine to verify Gatekeeper accepts it.

# Internal macOS Code Signing Guide

## Overview

This guide covers the process of code-signing **two internal macOS desktop applications**:

1. **Admin Panel** - Internal admin/management application
2. **Client/Staff Portal** - Client-facing or staff-facing portal application

Both apps are built as standalone `.app` bundles and are distributed **internally only** (not via the Mac App Store).

We use a **self-signed code-signing certificate** for internal distribution. This approach:
- Does not require an Apple Developer Program membership
- Allows secure distribution within the organization
- Can be easily upgraded to an Apple Developer ID certificate in the future

---

## The Two Apps

### Admin Panel App
- **Bundle path**: `./dist/mac/AdminPanel.app`
- **Purpose**: Internal administration and management
- **Distribution**: Internal staff only

### Client/Staff Portal App
- **Bundle path**: `./dist/mac/ClientPortal.app`
- **Purpose**: Client/staff-facing portal
- **Distribution**: Internal staff and possibly trusted clients

> **Note**: Update these paths in `scripts/sign_all_apps.sh` to match your actual build output.

---

## Certificate Setup

### Option 1: Self-Signed Certificate (Internal Use)

#### Step 1: Create the Certificate

1. Open **Keychain Access** (Applications → Utilities → Keychain Access)
2. From the menu, select **Keychain Access → Certificate Assistant → Create a Certificate...**
3. Configure the certificate:
   - **Name**: `Inhouse Dev Signing` (or any name you prefer)
   - **Identity Type**: `Self-Signed Root`
   - **Certificate Type**: `Code Signing`
   - **Let me override defaults**: Check this box
4. Click **Continue** through the dialogs, accepting defaults
5. When asked **Specify a Location For The Certificate**, choose `login` keychain
6. Click **Create**
7. Click **Done**

#### Step 2: Trust the Certificate

1. In Keychain Access, select the **login** keychain
2. Find your certificate (`Inhouse Dev Signing`)
3. Double-click to open it
4. Expand **Trust** section
5. Set **Code Signing** to `Always Trust`
6. Close the window (you'll be prompted for your password)

#### Step 3: Export the Certificate (for Distribution)

To use this certificate on other Macs (for building or for trusting):

1. In Keychain Access, right-click your certificate
2. Select **Export "Inhouse Dev Signing"...**
3. Choose format: **Personal Information Exchange (.p12)**
4. Save to a secure location
5. Enter a **strong password** when prompted
6. **Securely distribute** this `.p12` file and password to team members

#### Step 4: Import on Other Macs

On each internal Mac that needs to build or trust the signed apps:

1. Double-click the `.p12` file (or use Keychain Access → File → Import Items)
2. Enter the password you set during export
3. Choose the **login** keychain
4. Follow Step 2 above to mark it as "Always Trust"

---

### Option 2: Apple Developer ID Certificate (Future)

When you're ready to use an official Apple certificate:

1. **Enroll** in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. In your Apple Developer account, create a **Developer ID Application** certificate
3. Download and install it in your Keychain
4. The certificate name will be: `Developer ID Application: Your Company Name (TEAMID)`
5. **Update** the signing identity:
   - Set environment variable: `export SIGNING_IDENTITY="Developer ID Application: Your Company Name (TEAMID)"`
   - Or edit `scripts/sign_all_apps.sh` and change `DEFAULT_IDENTITY`

**Benefits of Developer ID**:
- Users won't see Gatekeeper warnings
- Apps can be notarized by Apple
- More professional distribution

**Note**: All other steps (scripts, signing process) remain identical. Only the identity name changes.

---

## Signing Process

### Prerequisites

- macOS with Xcode Command Line Tools installed: `xcode-select --install`
- Code-signing certificate installed and trusted (see above)
- Both apps built and available as `.app` bundles

### Scripts Overview

| Script | Purpose |
|--------|---------|
| `scripts/list_identities.sh` | Lists all available code-signing identities |
| `scripts/sign_app.sh` | Signs a single app bundle |
| `scripts/sign_all_apps.sh` | Signs both Admin Panel and Client Portal apps |

### Step 1: List Available Identities

To see what signing identities are available on your Mac:

```bash
./scripts/list_identities.sh
```

You should see output like:

```
  1) ABC123... "Inhouse Dev Signing"
```

Copy the exact name (e.g., `Inhouse Dev Signing`) for use in signing commands.

### Step 2: Sign a Single App

To sign just the Admin Panel app:

```bash
./scripts/sign_app.sh ./dist/mac/AdminPanel.app "Inhouse Dev Signing"
```

To sign with entitlements (optional):

```bash
./scripts/sign_app.sh ./dist/mac/AdminPanel.app "Inhouse Dev Signing" ./entitlements.plist
```

### Step 3: Sign Both Apps

The easiest method is to use the batch script:

```bash
./scripts/sign_all_apps.sh
```

This will:
- Sign the Admin Panel app
- Sign the Client/Staff Portal app
- Verify signatures
- Assess Gatekeeper status
- Report success/failure

**Using a custom identity**:

```bash
export SIGNING_IDENTITY="Developer ID Application: My Company (TEAM123)"
./scripts/sign_all_apps.sh
```

---

## Verification

After signing, the scripts automatically verify:

### 1. Signature Verification

```bash
codesign --verify --deep --strict --verbose=2 ./dist/mac/AdminPanel.app
```

Expected output:
```
./dist/mac/AdminPanel.app: valid on disk
./dist/mac/AdminPanel.app: satisfies its Designated Requirement
```

### 2. Gatekeeper Assessment

```bash
spctl --assess --verbose=4 --type execute ./dist/mac/AdminPanel.app
```

**For self-signed certificates**, this will typically fail with:
```
./dist/mac/AdminPanel.app: rejected
```

This is **expected and normal** for internal certificates. Internal users will use the "right-click → Open" method below.

**For Apple Developer ID certificates**, this should pass:
```
./dist/mac/AdminPanel.app: accepted
```

---

## Distribution to Internal Users

### First-Time Launch (Self-Signed Certificates)

When internal users first launch a self-signed app, macOS Gatekeeper will show a warning.

**Instruct users to**:

1. **Do NOT double-click the app** (this will show "cannot open" error)
2. Instead, **right-click** (or Control-click) the app
3. Select **Open** from the menu
4. Click **Open** in the dialog that appears
5. The app will launch and remember this choice

**Only the first launch requires this**. Subsequent launches work normally.

### Distribution Methods

**Option A: Direct file sharing**
- Zip the signed `.app` bundles
- Share via secure file transfer, shared drive, or email
- Users extract and follow the first-time launch steps above

**Option B: Internal package installer**
- Create a `.pkg` installer using `pkgbuild` or `productbuild`
- Sign the installer with the same certificate
- Distribute the installer

**Option C: Internal software distribution system**
- Use a tool like Jamf, Munki, or similar
- Deploy signed apps with policies that trust the certificate

### Trusting the Certificate (Alternative)

Instead of right-click → Open, users can import and trust the certificate:

1. Provide users with the `.p12` certificate file and password
2. Users import it into their login keychain
3. Users mark it as "Always Trust" for Code Signing
4. Apps will then launch normally without warnings

This is more complex but provides a smoother user experience for multiple apps.

---

## Switching to Apple Developer ID

When you're ready to upgrade from self-signed to Apple Developer ID:

### What Changes

1. **Certificate**: Use the Apple-issued certificate instead of self-signed
2. **Identity name**: Update from `Inhouse Dev Signing` to `Developer ID Application: Company (TEAM)`
3. **Gatekeeper**: Apps will pass Gatekeeper assessment
4. **Notarization**: You can optionally notarize apps with Apple

### What Stays the Same

- All scripts work identically
- Signing process is the same
- Build pipeline unchanged

### How to Switch

**Method 1: Environment variable**
```bash
export SIGNING_IDENTITY="Developer ID Application: My Company Name (ABC123)"
./scripts/sign_all_apps.sh
```

**Method 2: Update script default**

Edit `scripts/sign_all_apps.sh`, line ~20:
```bash
# Change from:
DEFAULT_IDENTITY="Inhouse Dev Signing"

# To:
DEFAULT_IDENTITY="Developer ID Application: My Company Name (ABC123)"
```

### Optional: Add Notarization

After signing with Developer ID, you can notarize apps:

```bash
# Create an app-specific password in Apple ID account
# Then submit for notarization
xcrun notarytool submit ./dist/mac/AdminPanel.app.zip \
  --apple-id "your-apple-id@example.com" \
  --team-id "ABC123" \
  --password "app-specific-password" \
  --wait

# Staple the notarization ticket
xcrun stapler staple ./dist/mac/AdminPanel.app
```

Notarized apps provide the best user experience (no warnings at all).

---

## CI/CD Integration

### Automated Signing in CI

To sign apps in a CI/CD pipeline (GitHub Actions, GitLab CI, etc.):

1. **Store certificate securely**:
   - Export certificate as `.p12`
   - Base64 encode: `base64 -i cert.p12 -o cert.p12.base64`
   - Store as CI secret: `MACOS_CERTIFICATE_BASE64`
   - Store password as secret: `MACOS_CERTIFICATE_PASSWORD`

2. **Import in CI job**:
   ```bash
   # Decode certificate
   echo "$MACOS_CERTIFICATE_BASE64" | base64 --decode > cert.p12
   
   # Create temporary keychain
   security create-keychain -p temp-password build.keychain
   security default-keychain -s build.keychain
   security unlock-keychain -p temp-password build.keychain
   
   # Import certificate
   security import cert.p12 -k build.keychain -P "$MACOS_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
   
   # Allow codesign to access keychain
   security set-key-partition-list -S apple-tool:,apple: -s -k temp-password build.keychain
   ```

3. **Sign apps**:
   ```bash
   export SIGNING_IDENTITY="Inhouse Dev Signing"
   ./scripts/sign_all_apps.sh
   ```

4. **Cleanup**:
   ```bash
   security delete-keychain build.keychain
   rm cert.p12
   ```

### Example GitHub Actions Workflow

```yaml
name: Build and Sign macOS Apps

on:
  push:
    branches: [main]

jobs:
  build-and-sign:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build apps
        run: |
          # Your build commands here
          npm run build:mac
      
      - name: Import signing certificate
        env:
          MACOS_CERT_BASE64: ${{ secrets.MACOS_CERTIFICATE_BASE64 }}
          MACOS_CERT_PASSWORD: ${{ secrets.MACOS_CERTIFICATE_PASSWORD }}
        run: |
          echo "$MACOS_CERT_BASE64" | base64 --decode > cert.p12
          security create-keychain -p temp-pass build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p temp-pass build.keychain
          security import cert.p12 -k build.keychain -P "$MACOS_CERT_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple: -s -k temp-pass build.keychain
      
      - name: Sign apps
        env:
          SIGNING_IDENTITY: "Inhouse Dev Signing"
        run: ./scripts/sign_all_apps.sh
      
      - name: Upload signed apps
        uses: actions/upload-artifact@v4
        with:
          name: signed-apps
          path: |
            dist/mac/AdminPanel.app
            dist/mac/ClientPortal.app
      
      - name: Cleanup
        if: always()
        run: |
          security delete-keychain build.keychain
          rm cert.p12
```

---

## Troubleshooting

### "No identity found" Error

**Problem**: `security find-identity -p codesigning` returns no identities

**Solution**:
- Ensure certificate is installed in the **login** keychain
- Check certificate is not expired
- Verify certificate type is "Code Signing"

### "User interaction is not allowed" in CI

**Problem**: Automated signing fails with user interaction error

**Solution**:
- Use `security set-key-partition-list` to allow codesign access (see CI section above)
- Ensure keychain is unlocked: `security unlock-keychain -p password keychain`

### Gatekeeper Still Blocks App

**Problem**: Right-click → Open doesn't work

**Solution**:
- Have user import and trust the certificate (see "Trusting the Certificate" above)
- Verify signature: `codesign --verify --deep --strict -v ./App.app`
- Check for multiple signatures: `codesign -dvvv ./App.app`

### "The application is damaged" Error

**Problem**: macOS says app is damaged and can't be opened

**Causes**:
- App was modified after signing
- Signature is invalid
- Quarantine flag is set

**Solution**:
```bash
# Remove quarantine flag
xattr -cr ./dist/mac/AdminPanel.app

# Re-sign
./scripts/sign_app.sh ./dist/mac/AdminPanel.app "Inhouse Dev Signing"
```

### Different Identity on Different Macs

**Problem**: Team members have different identity names

**Solution**:
- Standardize certificate name when creating (e.g., always "Inhouse Dev Signing")
- Or use environment variable: each developer sets `SIGNING_IDENTITY` to their cert name

---

## Security Best Practices

### Certificate Management

- **Never commit** `.p12` files or passwords to version control
- **Encrypt** certificate files when distributing
- **Use strong passwords** (16+ characters, random)
- **Rotate certificates** annually or after team member departures
- **Track distribution**: maintain a list of who has the certificate

### Certificate Storage in CI/CD

- **Use secret management**: GitHub Secrets, GitLab CI/CD Variables, etc.
- **Limit access**: only production pipelines need signing access
- **Audit usage**: monitor when and where certificates are used
- **Separate environments**: consider different certs for dev/staging/prod

### User Distribution

- **Verify downloads**: provide checksums (SHA-256) for distributed apps
- **Secure channels**: use HTTPS, VPN, or encrypted file shares
- **Version tracking**: include version numbers in filenames
- **Documented process**: ensure users know how to verify authenticity

---

## Appendix: Manual Commands Reference

### List Identities
```bash
security find-identity -v -p codesigning
```

### Sign an App
```bash
codesign --force --deep --options runtime \
  --sign "Inhouse Dev Signing" \
  --timestamp \
  ./dist/mac/AdminPanel.app
```

### Sign with Entitlements
```bash
codesign --force --deep --options runtime \
  --sign "Inhouse Dev Signing" \
  --timestamp \
  --entitlements ./entitlements.plist \
  ./dist/mac/AdminPanel.app
```

### Verify Signature
```bash
codesign --verify --deep --strict --verbose=2 ./dist/mac/AdminPanel.app
```

### Check Signature Details
```bash
codesign -dvvv ./dist/mac/AdminPanel.app
```

### Assess Gatekeeper
```bash
spctl --assess --verbose=4 --type execute ./dist/mac/AdminPanel.app
```

### Remove Quarantine Flag
```bash
xattr -cr ./dist/mac/AdminPanel.app
```

### Check for Quarantine
```bash
xattr -l ./dist/mac/AdminPanel.app
```

---

## Summary

This guide provides a complete, production-ready code-signing solution for two internal macOS apps:

✅ Self-signed certificate for internal use  
✅ Easy upgrade path to Apple Developer ID  
✅ Automated signing scripts  
✅ CI/CD integration ready  
✅ Clear user distribution instructions  
✅ Comprehensive troubleshooting  

For questions or issues, refer to the troubleshooting section or consult the macOS code signing documentation at [developer.apple.com](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution).

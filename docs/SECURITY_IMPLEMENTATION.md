# Security Implementation Guide

This document describes the security measures implemented to prevent credential exposure and ensure proper authentication.

## 1. Git Secrets Prevention with Gitleaks

### Overview

Gitleaks is integrated at multiple levels to prevent committing secrets to version control:

1. **Pre-commit hook** - Blocks commits containing secrets locally
2. **CI workflow** - Scans all commits in PRs and pushes
3. **Configuration** - Custom rules for Supabase, JWT, and bearer tokens

### Setup for Developers

#### One-Time Setup

Run the setup script after cloning the repository:

```bash
./scripts/setup-git-hooks.sh
```

This installs a pre-commit hook that automatically scans staged changes for secrets.

#### Install Gitleaks (Recommended)

**macOS:**
```bash
brew install gitleaks
```

**Linux:**
```bash
# Download latest release from GitHub
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz
tar -xzf gitleaks_8.18.1_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

**Windows:**
```powershell
scoop install gitleaks
```

**Using Docker (Fallback):**

If gitleaks is not installed, the pre-commit hook automatically falls back to using Docker.

### Usage

#### Automatic Scanning

The pre-commit hook runs automatically before every commit:

```bash
git add .
git commit -m "my changes"
# Hook runs automatically and blocks commit if secrets found
```

#### Manual Scanning

Scan specific files:
```bash
gitleaks detect --source . --config .gitleaks.toml
```

Scan staged changes:
```bash
gitleaks protect --staged --config .gitleaks.toml
```

#### Bypassing the Hook (NOT RECOMMENDED)

In rare cases where you need to bypass the hook (e.g., committing intentional test data):

```bash
git commit --no-verify -m "message"
```

**Warning:** Only use `--no-verify` when absolutely necessary and with team approval.

### CI Integration

The `.github/workflows/gitleaks.yml` workflow automatically:

- Scans all commits in pull requests
- Scans pushes to main and develop branches
- Posts comments on PRs when secrets are detected
- Fails the build if secrets are found

### Configuration

Gitleaks configuration is in `.gitleaks.toml`:

- **Extends**: Base gitleaks rules for common secrets
- **Custom rules**: Supabase keys, JWTs, bearer tokens
- **Allowlist**: Specific files that may contain test/stub credentials

### Troubleshooting

**False Positives:**

If gitleaks flags a false positive, you can:

1. Add the file to the allowlist in `.gitleaks.toml`:
   ```toml
   [allowlist]
   paths = [
       '''path/to/file.ts'''
   ]
   ```

2. Add a specific value allowlist:
   ```toml
   [allowlist]
   regexes = [
       '''test-api-key-for-local-dev'''
   ]
   ```

**Hook Not Running:**

Check that the hook is executable:
```bash
chmod +x .git/hooks/pre-commit
ls -la .git/hooks/pre-commit
```

Re-run the setup script:
```bash
./scripts/setup-git-hooks.sh
```

---

## 2. Authentication Flow Testing on Staging

### Overview

Automated tests verify that authentication and authorization are properly enforced on the staging environment.

### Test Coverage

The staging auth tests validate:

1. **Unauthenticated requests** return 401
2. **Invalid credentials** return 401
3. **Unauthorized org access** returns 403
4. **Valid authenticated requests** succeed (200)

### Running Tests Locally

#### Manual Test Script

Test the finance review API authentication:

```bash
# Set environment variables
export STAGING_BASE_URL="https://staging.prismaglow.example.com"
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="password"
export TEST_ORG_ID="00000000-0000-0000-0000-000000000000"

# Run the test script
node scripts/test-auth/test-review-api-auth.js
```

#### Using the CI Workflow

Trigger the staging auth tests manually:

```bash
gh workflow run staging-auth-tests.yml \
  -f staging_url="https://staging.prismaglow.example.com"
```

### CI Integration

The `.github/workflows/staging-auth-tests.yml` workflow:

- Runs automatically on pushes to main
- Can be triggered manually with custom staging URL
- Tests authentication flows end-to-end
- Reports results in GitHub Actions summary

### Required Secrets

Configure these secrets in your GitHub repository:

```
STAGING_TEST_USER_EMAIL      - Email for test user account
STAGING_TEST_USER_PASSWORD   - Password for test user
STAGING_TEST_ORG_ID          - Organization ID for testing
```

### Test Script Details

The `scripts/test-auth/test-review-api-auth.js` script:

1. **Test 1: Unauthenticated Request**
   - Sends POST to `/api/review/run` without auth
   - Expects 401 Unauthorized

2. **Test 2: Invalid Credentials**
   - Sends request with invalid session cookie
   - Expects 401 Unauthorized

3. **Test 3: Unauthorized Org** (Skipped)
   - Would test access to org user is not member of
   - Requires full E2E test framework with session management

### Adding More Tests

To add additional auth tests:

1. Create new test functions in `scripts/test-auth/test-review-api-auth.js`
2. Call them from `runTests()` function
3. Follow the pattern of existing tests

Example:
```javascript
async function testNewAuthScenario() {
  console.log('\n🧪 Test N: Description');
  
  try {
    const response = await makeRequest(`${STAGING_BASE_URL}/api/endpoint`, {
      method: 'POST',
      headers: { /* ... */ },
      body: { /* ... */ },
    });
    
    if (response.status === expectedStatus) {
      console.log('✅ PASS');
      results.passed++;
      return true;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    results.failed++;
    return false;
  }
}
```

---

## 3. SBOM Generation Verification in CI

### Overview

The CI pipeline verifies that SBOM (Software Bill of Materials) generation works correctly on every pull request.

### Verification Steps

The CI workflow verifies:

1. **Generation succeeds** - SBOMs are created without errors
2. **Files exist** - Required SBOM files are present
3. **Valid JSON** - All SBOMs are well-formed JSON
4. **CycloneDX compliance** - SBOMs follow CycloneDX spec
5. **Non-empty** - SBOMs contain dependency components
6. **Quality metrics** - Reports component and license counts

### CI Integration

#### Main CI Workflow

The `.github/workflows/ci.yml` includes a `verify-sbom-generation` job that:

- Runs on all pull requests
- Tests SBOM generation for Node.js and Python
- Validates generated files
- Reports metrics in PR summary

#### SBOM Workflow Enhancements

The `.github/workflows/sbom.yml` workflow now includes:

- **Completeness check** - Verifies all required SBOMs are generated
- **Schema validation** - Checks CycloneDX format compliance
- **Quality report** - Generates component and license metrics
- **Summary posting** - Adds detailed report to workflow summary

### Running SBOM Generation Locally

#### Generate All SBOMs

```bash
# Install dependencies
pnpm install --frozen-lockfile
pip install cyclonedx-bom

# Create output directory
mkdir -p docs/sbom

# Generate Node.js SBOM
npx @cyclonedx/cyclonedx-npm \
  --output-format JSON \
  --output-file docs/sbom/prisma-root-node.json \
  --short-PURLs \
  --package-lock-only

# Generate Python SBOM
cd server
cyclonedx-py \
  --format json \
  --output ../docs/sbom/prisma-backend-python.json \
  --requirements requirements.txt
cd ..
```

#### Validate SBOMs

```bash
# Check JSON validity
jq empty docs/sbom/*.json

# Check CycloneDX format
jq '.bomFormat' docs/sbom/prisma-root-node.json

# Count components
jq '.components | length' docs/sbom/prisma-root-node.json
```

### Viewing SBOM Quality Reports

After the SBOM workflow runs:

1. Go to the Actions tab in GitHub
2. Click on the SBOM workflow run
3. View the workflow summary page
4. See the SBOM Quality Report with metrics

Example output:
```
File: prisma-root-node.json
  Components: 1729
  Licenses: 856

File: prisma-backend-python.json
  Components: 45
  Licenses: 32
```

### Troubleshooting

**SBOM Generation Fails:**

Check that dependencies are installed:
```bash
npm list @cyclonedx/cyclonedx-npm
pip list | grep cyclonedx
```

**Missing Components:**

If SBOMs show 0 components:
- Ensure `pnpm-lock.yaml` exists
- Ensure `requirements.txt` exists
- Run `pnpm install` to generate lock file

**Schema Validation Fails:**

The generated SBOM must have:
- `bomFormat: "CycloneDX"`
- `specVersion` field
- `components` array

Check with:
```bash
jq '{bomFormat, specVersion, componentCount: (.components | length)}' docs/sbom/prisma-root-node.json
```

---

## Security Checklist

Use this checklist to ensure all security measures are in place:

### Development Setup
- [ ] Git hooks installed (`./scripts/setup-git-hooks.sh`)
- [ ] Gitleaks installed locally or Docker available
- [ ] Pre-commit hook tested with a test commit
- [ ] No secrets in environment files (only placeholders)

### CI/CD
- [ ] Gitleaks workflow enabled and passing
- [ ] Staging auth tests configured with secrets
- [ ] SBOM verification job passes on PRs
- [ ] All workflows show green checkmarks

### Documentation
- [ ] Team trained on git hooks and secret scanning
- [ ] Runbook updated with troubleshooting steps
- [ ] Deployment checklist includes credential rotation
- [ ] SBOM usage documented for incident response

### Ongoing Maintenance
- [ ] Review gitleaks config quarterly
- [ ] Update test credentials when changed
- [ ] Monitor SBOM quality metrics
- [ ] Audit allowlisted files regularly

---

## Related Documentation

- [SBOM and Provenance](SBOM_AND_PROVENANCE.md)
- [Remediation Summary](REMEDIATION_SUMMARY.md)
- [Security Policy](../SECURITY.md)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [CycloneDX Specification](https://cyclonedx.org/)

---

**Last Updated:** 2025-11-02  
**Maintained By:** Security Team  
**Review Frequency:** Quarterly

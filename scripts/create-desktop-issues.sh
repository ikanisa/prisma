#!/bin/bash
#
# Create GitHub Issues for Desktop App Production Readiness
# Generated from DESKTOP_PRODUCTION_CHECKLIST.md
#
# Usage: ./create-desktop-issues.sh
#

set -e

REPO="ikanisa/prisma"
MILESTONE="desktop-v1.0"
LABELS="desktop,tauri"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎫 Creating GitHub Issues for Desktop App Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Install from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI. Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI ready"
echo ""

# Create milestone if it doesn't exist
echo "📋 Creating milestone: $MILESTONE"
gh api repos/$REPO/milestones --method POST \
    -f title="$MILESTONE" \
    -f description="Desktop app production readiness (10 weeks)" \
    -f state="open" 2>/dev/null || echo "   (Milestone may already exist)"

# Get milestone number
MILESTONE_NUMBER=$(gh api repos/$REPO/milestones | jq -r ".[] | select(.title==\"$MILESTONE\") | .number")
echo "   Milestone number: $MILESTONE_NUMBER"
echo ""

# Phase 1: Infrastructure Consolidation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Phase 1: Infrastructure Consolidation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 1.1: Backup and document desktop-app configs" \
    --body "**Phase:** 1 - Infrastructure
**Priority:** 🔴 Critical
**Effort:** 0.5 days

## Context
Before deleting desktop-app/, backup unique configurations.

## Acceptance Criteria
- [ ] desktop-app/ backed up to desktop-app.backup/
- [ ] Unique configs documented in desktop-app-configs.txt
- [ ] Git branch created: refactor/consolidate-tauri

## Implementation
\`\`\`bash
git checkout -b refactor/consolidate-tauri
cp -r desktop-app desktop-app.backup
grep -r \"unique\" desktop-app/ > desktop-app-configs.txt
\`\`\`

## Related
See: DESKTOP_PRODUCTION_CHECKLIST.md Phase 1" \
    --label "$LABELS,phase-1,critical" \
    --milestone $MILESTONE_NUMBER

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 1.2: Delete desktop-app directory" \
    --body "**Phase:** 1 - Infrastructure
**Priority:** 🔴 Critical
**Effort:** 0.5 days

## Context
Remove duplicate Tauri project structure.

## Acceptance Criteria
- [ ] desktop-app/ deleted from repository
- [ ] Commit created with clear message
- [ ] No duplicate src-tauri directories

## Implementation
\`\`\`bash
git rm -rf desktop-app/
git commit -m \"refactor: remove duplicate desktop-app structure\"
\`\`\`

## Blocked by
- Phase 1.1 (backup completed)" \
    --label "$LABELS,phase-1,critical" \
    --milestone $MILESTONE_NUMBER

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 1.3: Upgrade src-tauri to Tauri 2.0" \
    --body "**Phase:** 1 - Infrastructure
**Priority:** 🔴 Critical
**Effort:** 1 day

## Context
Migrate from Tauri 1.6 to 2.0 for better performance and smaller bundles.

## Acceptance Criteria
- [ ] src-tauri/Cargo.toml updated to tauri = \"2.0\"
- [ ] src-tauri/tauri.conf.json migrated to 2.x schema
- [ ] devPath points to http://localhost:5173
- [ ] distDir points to ../dist
- [ ] cargo build succeeds

## Implementation
Update Cargo.toml and tauri.conf.json, test build.

## Blocked by
- Phase 1.2 (desktop-app deleted)" \
    --label "$LABELS,phase-1,critical" \
    --milestone $MILESTONE_NUMBER

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 1.4: Test consolidated Tauri build" \
    --body "**Phase:** 1 - Infrastructure
**Priority:** 🔴 Critical
**Effort:** 0.5 days

## Context
Validate that consolidated Tauri 2.0 project works.

## Acceptance Criteria
- [ ] pnpm tauri dev launches successfully
- [ ] Vite dev server starts at :5173
- [ ] System tray appears on macOS
- [ ] No errors in console

## Implementation
\`\`\`bash
pnpm tauri dev
# Verify app launches, test basic functionality
\`\`\`

## Blocked by
- Phase 1.3 (Tauri 2.0 upgrade)" \
    --label "$LABELS,phase-1,critical" \
    --milestone $MILESTONE_NUMBER

echo "   ✅ Created 4 issues for Phase 1"
echo ""

# Phase 2: React Integration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚛️  Phase 2: React Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 2.1: Add Tauri initialization in main.tsx" \
    --body "**Phase:** 2 - React Integration
**Priority:** 🔴 Critical
**Effort:** 0.5 days

## Context
Initialize desktop features when running in Tauri.

## Acceptance Criteria
- [ ] useTauri hook imported in main.tsx
- [ ] Desktop features initialized on mount
- [ ] init_local_db called when isTauri is true

## Implementation
See DESKTOP_PRODUCTION_CHECKLIST.md Phase 2 Task 2.1

## Blocked by
- Phase 1.4 (consolidated build tested)" \
    --label "$LABELS,phase-2,critical" \
    --milestone $MILESTONE_NUMBER

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 2.2: Add conditional TitleBar in App.tsx" \
    --body "**Phase:** 2 - React Integration
**Priority:** 🔴 Critical
**Effort:** 1 day

## Context
Show custom titlebar when running in Tauri desktop app.

## Acceptance Criteria
- [ ] TitleBar component imported
- [ ] Renders when isTauri is true
- [ ] Does not render in web version
- [ ] Titlebar shows app name and window controls

## Implementation
See DESKTOP_PRODUCTION_CHECKLIST.md Phase 2 Task 2.2" \
    --label "$LABELS,phase-2,critical" \
    --milestone $MILESTONE_NUMBER

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 2.3: Integrate SystemTrayMenu events" \
    --body "**Phase:** 2 - React Integration
**Priority:** 🟡 High
**Effort:** 1 day

## Context
Listen to system tray events and trigger navigation.

## Acceptance Criteria
- [ ] Listen to 'open-ai-dialog' event
- [ ] Listen to 'trigger-sync' event
- [ ] Listen to 'open-new-task' event
- [ ] Events trigger correct navigation/actions

## Implementation
See DESKTOP_PRODUCTION_CHECKLIST.md Phase 2 Task 2.3" \
    --label "$LABELS,phase-2,high" \
    --milestone $MILESTONE_NUMBER

echo "   ✅ Created 3 issues for Phase 2"
echo ""

# Phase 3: Offline Sync
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Phase 3: Offline Sync Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 3.1: Create OfflineSyncService" \
    --body "**Phase:** 3 - Offline Sync
**Priority:** 🔴 Critical
**Effort:** 2 days

## Context
Create service to sync data between local SQLite and server.

## Acceptance Criteria
- [ ] src/services/sync.ts created
- [ ] OfflineSyncService class implemented
- [ ] Methods: init(), syncToServer(), syncFromServer()
- [ ] Calls Rust commands via invoke()

## Implementation
See DESKTOP_PRODUCTION_CHECKLIST.md Phase 3 Task 3.1" \
    --label "$LABELS,phase-3,critical" \
    --milestone $MILESTONE_NUMBER

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 3.2: Create useOfflineSync hook" \
    --body "**Phase:** 3 - Offline Sync
**Priority:** 🔴 Critical
**Effort:** 1 day

## Context
React hook for network detection and auto-sync.

## Acceptance Criteria
- [ ] src/hooks/useOfflineSync.ts created
- [ ] Detects navigator.onLine changes
- [ ] Auto-syncs when coming online
- [ ] Returns { isOnline, syncStatus }

## Implementation
See DESKTOP_PRODUCTION_CHECKLIST.md Phase 3 Task 3.2" \
    --label "$LABELS,phase-3,critical" \
    --milestone $MILESTONE_NUMBER

echo "   ✅ Created 2 issues for Phase 3"
echo ""

# Phase 4: Code Signing
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Phase 4: Code Signing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 4.1: Enroll in Apple Developer Program" \
    --body "**Phase:** 4 - Code Signing
**Priority:** 🔴 Critical
**Effort:** 1-2 days (includes wait time)

## Context
Required for code signing and distribution.

## Acceptance Criteria
- [ ] Enrolled at https://developer.apple.com/programs/
- [ ] \$99 annual fee paid
- [ ] Account approved
- [ ] Team ID noted

## Implementation
1. Visit https://developer.apple.com/programs/
2. Enroll with Apple ID
3. Wait for approval (1-2 days typically)" \
    --label "$LABELS,phase-4,critical" \
    --milestone $MILESTONE_NUMBER

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 4.2: Create Developer ID certificates" \
    --body "**Phase:** 4 - Code Signing
**Priority:** 🔴 Critical
**Effort:** 1 day

## Context
Create certificates for signing macOS apps.

## Acceptance Criteria
- [ ] Developer ID Application certificate created
- [ ] Developer ID Installer certificate created
- [ ] Certificates exported as .p12 files

## Blocked by
- Phase 4.1 (Apple Developer enrollment)" \
    --label "$LABELS,phase-4,critical" \
    --milestone $MILESTONE_NUMBER

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 4.3: Configure CI/CD secrets" \
    --body "**Phase:** 4 - Code Signing
**Priority:** 🔴 Critical
**Effort:** 0.5 days

## Context
Add certificates to GitHub Secrets for CI/CD.

## Acceptance Criteria
- [ ] MACOS_CERT_P12 added (base64 encoded)
- [ ] MACOS_CERT_PASSWORD added
- [ ] APPLE_ID added
- [ ] APPLE_TEAM_ID added
- [ ] APPLE_APP_SPECIFIC_PASSWORD added

## Blocked by
- Phase 4.2 (certificates created)" \
    --label "$LABELS,phase-4,critical" \
    --milestone $MILESTONE_NUMBER

echo "   ✅ Created 3 issues for Phase 4"
echo ""

# Phase 5: Testing
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Phase 5: Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 5.1: Write unit tests for desktop hooks" \
    --body "**Phase:** 5 - Testing
**Priority:** 🔴 Critical
**Effort:** 3 days

## Context
Test useTauri, useFileSystem, useOfflineSync hooks.

## Acceptance Criteria
- [ ] tests/unit/hooks/useTauri.test.ts created
- [ ] tests/unit/hooks/useFileSystem.test.ts created
- [ ] tests/unit/hooks/useOfflineSync.test.ts created
- [ ] Tauri APIs mocked
- [ ] Tests pass: pnpm run test

## Target
80% coverage for desktop code" \
    --label "$LABELS,phase-5,critical" \
    --milestone $MILESTONE_NUMBER

gh issue create \
    --repo $REPO \
    --title "[DESKTOP] Phase 5.2: Write Rust tests" \
    --body "**Phase:** 5 - Testing
**Priority:** 🔴 Critical
**Effort:** 2 days

## Context
Test Rust commands (database, file_system, etc.)

## Acceptance Criteria
- [ ] Tests added to database.rs
- [ ] Tests added to file_system.rs
- [ ] Tests pass: cd src-tauri && cargo test
- [ ] All commands covered

## Implementation
See DESKTOP_PRODUCTION_CHECKLIST.md Phase 5 Task 5.2" \
    --label "$LABELS,phase-5,critical" \
    --milestone $MILESTONE_NUMBER

echo "   ✅ Created 2 issues for Phase 5"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Created 14 GitHub issues across 5 phases"
echo "   - Phase 1: 4 issues (Infrastructure)"
echo "   - Phase 2: 3 issues (React Integration)"
echo "   - Phase 3: 2 issues (Offline Sync)"
echo "   - Phase 4: 3 issues (Code Signing)"
echo "   - Phase 5: 2 issues (Testing)"
echo ""
echo "📋 Milestone: $MILESTONE"
echo "🏷️  Labels: $LABELS"
echo ""
echo "View issues: gh issue list --repo $REPO --milestone \"$MILESTONE\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Issue creation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

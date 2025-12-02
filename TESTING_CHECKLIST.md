# Prisma Glow Desktop App - Testing Checklist

## Pre-Release Testing Checklist

Use this checklist before distributing a new version to internal users.

### Build & Installation

- [ ] **Build succeeds**: `./build-dev.sh` completes without errors
- [ ] **App bundle created**: `.app` file exists in `src-tauri/target/debug/bundle/macos/`
- [ ] **DMG creation works**: `pnpm tauri build --debug --bundles dmg` succeeds
- [ ] **File size reasonable**: App bundle < 50MB
- [ ] **Version number correct**: Check `About` dialog or `Cargo.toml`

### First Launch (Fresh Install)

- [ ] **Gatekeeper warning appears**: Expected for unsigned app
- [ ] **Right-click → Open works**: App launches successfully
- [ ] **No crash on first launch**: App opens to main window
- [ ] **Window size appropriate**: Default 1400x900, centered
- [ ] **App icon displays**: Icon visible in Dock and window

### Core Functionality

#### Authentication (if implemented)
- [ ] **Login works**: Can authenticate with valid credentials
- [ ] **Session persists**: Stays logged in after app restart
- [ ] **Logout works**: Can log out successfully
- [ ] **Invalid credentials handled**: Appropriate error message

#### Data Operations
- [ ] **Data loads**: Main content displays correctly
- [ ] **CRUD operations work**: Create, read, update, delete
- [ ] **Data persists**: Changes saved after app restart
- [ ] **Offline mode**: App functions without network (if applicable)

#### Sync (if implemented)
- [ ] **Initial sync works**: Data syncs from server
- [ ] **Conflict resolution**: Handles sync conflicts gracefully
- [ ] **Sync status visible**: User can see sync progress
- [ ] **Manual sync works**: Trigger sync button functions

### UI/UX

#### Theme & Appearance
- [ ] **Light mode works**: App displays correctly in light mode
- [ ] **Dark mode works**: App displays correctly in dark mode
- [ ] **Theme sync**: App updates when system theme changes
- [ ] **Colors consistent**: No jarring color mismatches
- [ ] **Fonts readable**: Text is clear and appropriately sized

#### Window Behavior
- [ ] **Minimize works**: Cmd+M or yellow button minimizes
- [ ] **Maximize works**: Green button maximizes/fullscreen
- [ ] **Close works**: Cmd+W or red button closes window
- [ ] **Resize works**: Window can be resized smoothly
- [ ] **Fullscreen works**: Fullscreen mode functions correctly

#### Keyboard Shortcuts
- [ ] **Cmd+Q quits**: Application quits cleanly
- [ ] **Cmd+W closes**: Window closes (or app if last window)
- [ ] **Cmd+M minimizes**: Window minimizes to Dock
- [ ] **Cmd+, opens preferences**: Settings/preferences open (if implemented)
- [ ] **Standard shortcuts work**: Copy (Cmd+C), Paste (Cmd+V), etc.

### Performance

#### Startup
- [ ] **Cold start < 5s**: First launch after reboot
- [ ] **Warm start < 3s**: Launch when already in memory
- [ ] **No visible lag**: UI appears quickly

#### Runtime
- [ ] **Memory usage < 200MB**: Check Activity Monitor (idle)
- [ ] **CPU usage < 5%**: Check Activity Monitor (idle)
- [ ] **No memory leaks**: Memory stable over 30 minutes
- [ ] **Smooth scrolling**: No stuttering or lag
- [ ] **Responsive UI**: No freezing during operations

#### Resource Usage
- [ ] **Disk usage reasonable**: App data < 100MB
- [ ] **Network usage appropriate**: No excessive requests
- [ ] **Battery impact low**: Not draining battery quickly

### Error Handling

- [ ] **Network errors handled**: Graceful offline behavior
- [ ] **Invalid data handled**: Doesn't crash on bad input
- [ ] **Permission errors handled**: Clear messages for denied permissions
- [ ] **Crash recovery**: App recovers from unexpected quits
- [ ] **Error messages helpful**: Users understand what went wrong

### Platform-Specific (macOS)

#### macOS Versions
- [ ] **macOS 13 Ventura**: Tested and working
- [ ] **macOS 14 Sonoma**: Tested and working
- [ ] **macOS 15 Sequoia**: Tested and working

#### macOS Features
- [ ] **Dock icon works**: Icon visible and clickable
- [ ] **Dock badge updates**: Notifications show badge (if applicable)
- [ ] **Menu bar integration**: App menu functions correctly
- [ ] **Notifications work**: System notifications display (if applicable)
- [ ] **Spotlight indexing**: App appears in Spotlight search

### Security & Privacy

- [ ] **Permissions requested**: Clear prompts for needed permissions
- [ ] **Keychain integration**: Credentials stored securely (if applicable)
- [ ] **No sensitive data in logs**: Check Console.app for leaks
- [ ] **HTTPS enforced**: All network requests use HTTPS
- [ ] **Data encryption**: Sensitive data encrypted at rest (if applicable)

### Updates & Maintenance

- [ ] **Update process works**: Can replace old version with new
- [ ] **Data migration works**: User data preserved after update
- [ ] **Rollback possible**: Can revert to previous version if needed
- [ ] **Version check works**: App detects available updates (if implemented)

### Edge Cases

- [ ] **Multiple windows**: Can open multiple windows (if supported)
- [ ] **Rapid clicks**: No crashes from rapid UI interactions
- [ ] **Large datasets**: Handles large amounts of data gracefully
- [ ] **Slow network**: Functions correctly on slow connections
- [ ] **Network interruption**: Recovers from network drops

### Accessibility (Optional)

- [ ] **VoiceOver compatible**: Screen reader can navigate app
- [ ] **Keyboard navigation**: All features accessible via keyboard
- [ ] **High contrast mode**: Readable in high contrast
- [ ] **Text scaling**: Respects system text size settings

## Testing Scenarios

### Scenario 1: New User First Launch
1. Download `.dmg` file
2. Install app to Applications
3. Launch app (expect Gatekeeper warning)
4. Right-click → Open
5. Complete first-time setup (if any)
6. Verify main functionality works

### Scenario 2: Daily Usage
1. Launch app from Dock
2. Perform typical user workflows
3. Use for 30+ minutes
4. Check for memory leaks or performance issues
5. Quit app normally

### Scenario 3: Offline Usage
1. Disconnect from network
2. Launch app
3. Verify offline functionality
4. Make changes
5. Reconnect network
6. Verify sync works

### Scenario 4: Update Installation
1. Install new version over old version
2. Launch updated app
3. Verify data preserved
4. Check new features work
5. Verify no regressions

## Bug Reporting Template

When you find a bug, report it with:

```markdown
**Bug Title**: Brief description

**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happens

**Environment**:
- macOS Version: 
- App Version: 
- First occurrence or recurring: 

**Screenshots/Logs**: Attach if available

**Severity**: Critical / High / Medium / Low
```

## Sign-Off

- [ ] **All critical tests passed**: No blocking issues found
- [ ] **Performance acceptable**: Meets performance criteria
- [ ] **Ready for distribution**: Approved for internal release

**Tested by**: ___________________  
**Date**: ___________________  
**Version**: ___________________  
**Notes**: ___________________

---

**Last Updated**: December 2, 2025  
**Maintained by**: Prisma Glow Development Team

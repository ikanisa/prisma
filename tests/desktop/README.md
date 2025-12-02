# Desktop App Testing Suite - Phase 5

## Overview

Comprehensive test coverage for Prisma Glow macOS desktop application built with Tauri 2.0.

## Test Structure

```
tests/desktop/
├── e2e.spec.ts                    # End-to-end Playwright tests
├── unit/
│   └── tauri-commands.test.ts     # Unit tests for Tauri IPC
└── integration/
    └── tauri-cli.spec.ts          # Integration tests

src-tauri/tests/
└── integration.rs                 # Rust integration tests
```

## Running Tests

### All Desktop Tests
```bash
pnpm test:desktop
```

### E2E Tests Only
```bash
playwright test --project=desktop-e2e
```

### Unit Tests Only
```bash
pnpm test:desktop:unit
```

### Rust Tests
```bash
pnpm test:tauri
# or
cd src-tauri && cargo test
```

### With UI (Debug Mode)
```bash
playwright test --project=desktop-e2e --ui
```

## Test Coverage

### E2E Tests (Playwright)

**Launch & Initialization**
- ✅ Detect Tauri environment
- ✅ Window property validation
- ✅ Load time < 3 seconds
- ✅ Custom titlebar (desktop mode)

**Offline Mode**
- ✅ Offline state detection
- ✅ Data caching
- ✅ Operation queuing
- ✅ Reconnection sync

**Data Synchronization**
- ✅ Sync status display
- ✅ Manual sync trigger
- ✅ Sync time updates

**Window Management**
- ✅ Minimize window
- ✅ Maximize/restore toggle
- ✅ Window resize handling

**Performance Benchmarks**
- ✅ Memory usage < 150MB
- ✅ Startup time < 2 seconds
- ✅ Navigation speed < 1s

**Security**
- ✅ Authentication required
- ✅ Secure credential storage
- ✅ No sensitive data in localStorage

**Accessibility**
- ✅ Keyboard navigation
- ✅ ARIA labels
- ✅ System color scheme respect

### Unit Tests (Vitest)

**Tauri Window Commands**
- ✅ Minimize window
- ✅ Maximize window
- ✅ Close window

**File System Operations**
- ✅ Open file dialog
- ✅ Read text file
- ✅ Write text file

**App Info**
- ✅ Get app version
- ✅ Get app name

**Custom Commands**
- ✅ sync_to_local
- ✅ sync_from_local
- ✅ Error handling

### Integration Tests (Rust)

**SQLite Database**
- ✅ Connection establishment
- ✅ Transaction handling
- ✅ Offline data schema
- ✅ Conflict resolution

**Data Structures**
- ✅ Documents table
- ✅ Clients table
- ✅ Sync queue
- ✅ Conflicts table

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Startup Time | < 2s | ✅ Tested |
| Memory Usage (Idle) | < 150MB | ✅ Tested |
| Bundle Size (macOS) | < 40MB | ⚠️ Manual check |
| Navigation Speed | < 1s | ✅ Tested |

## Test Data

### Mock Tauri APIs
Tests use mocked Tauri APIs for unit testing:
- `window.__TAURI__.invoke`
- `window.__TAURI__.event.listen`
- `window.__TAURI__.app`
- `window.__TAURI__.window`
- `window.__TAURI__.dialog`
- `window.__TAURI__.fs`

### Test Selectors
All tests use `data-testid` attributes:
- `desktop-title-bar`
- `window-minimize`
- `window-maximize`
- `window-close`
- `offline-indicator`
- `sync-status`
- `sync-now-button`
- `last-sync-time`

## CI/CD Integration

Tests run in GitHub Actions:
```yaml
- name: Run Desktop Tests
  run: |
    pnpm test:desktop:unit
    pnpm test:tauri
```

E2E tests require Tauri CLI:
```yaml
- name: Install Tauri CLI
  run: cargo install tauri-cli

- name: Run E2E Tests
  run: pnpm test:desktop
```

## Known Limitations

1. **Playwright + Tauri**: Direct Playwright integration with Tauri requires WebDriver setup
2. **Headless Testing**: Some window management tests don't work in headless mode
3. **macOS-Specific**: Tests assume macOS environment for certain features
4. **Network Mocking**: Offline tests use Playwright's context.setOffline()

## Adding New Tests

### E2E Test Template
```typescript
test('should do something', async ({ page }) => {
  await page.goto('/');
  
  const element = page.locator('[data-testid="test-element"]');
  await expect(element).toBeVisible();
});
```

### Unit Test Template
```typescript
it('should invoke command', async () => {
  mockInvoke.mockResolvedValue({ success: true });
  
  const result = await window.__TAURI__.invoke('my_command');
  
  expect(result.success).toBe(true);
});
```

### Rust Test Template
```rust
#[test]
fn test_my_feature() {
    let conn = Connection::open_in_memory().unwrap();
    // Setup and assertions
    assert_eq!(expected, actual);
}
```

## Test Maintenance

- Update tests when adding new Tauri commands
- Add `data-testid` attributes to new UI components
- Keep mock implementations in sync with actual Tauri APIs
- Document any test environment requirements

## Troubleshooting

### Tests Fail to Find Elements
- Ensure `data-testid` attributes are present
- Check if component is conditionally rendered (desktop mode only)
- Use `.catch(() => false)` for optional elements

### Tauri Commands Not Found
- Verify command is registered in `src-tauri/src/main.rs`
- Check command name spelling matches Rust implementation
- Ensure mock is set up in unit tests

### Offline Tests Flaky
- Increase timeout values
- Add explicit waits after setOffline()
- Check for race conditions in sync logic

### Memory Tests Fail
- Run tests in isolation
- Check for memory leaks in app code
- Verify `performance.memory` API is available

## Future Enhancements

- [ ] Add WebDriver integration for true Tauri E2E
- [ ] Performance profiling automation
- [ ] Visual regression testing
- [ ] Load testing for sync operations
- [ ] Coverage reporting for Rust code
- [ ] Automated bundle size checks
- [ ] Screenshot comparison tests

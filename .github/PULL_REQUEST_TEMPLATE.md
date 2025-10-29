# Pull Request

## Description

<!-- Provide a clear and concise description of your changes -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 Code style/formatting update
- [ ] ♻️ Refactoring (no functional changes)
- [ ] 🚀 Performance improvement
- [ ] ✅ Test update
- [ ] 🔧 Build configuration change
- [ ] 🏗️ Infrastructure/deployment change

## Related Issues

<!-- Link related issues. Use "Fixes #123" to auto-close issues when PR merges -->

Fixes #
Related to #

## Architecture Decision Record (ADR)

<!-- If this PR touches architecture-critical areas, reference the ADR -->

- [ ] This PR does not require an ADR (minor change)
- [ ] ADR created/updated: `docs/adr/XXX-title.md`
- [ ] No architectural changes

## Changes Made

<!-- Provide a detailed list of changes -->

- Change 1
- Change 2
- Change 3

## Before/After

<!-- For UI changes, include screenshots. For API changes, show request/response examples -->

### Before
<!-- Screenshot or code example -->

### After
<!-- Screenshot or code example -->

## Testing

<!-- Describe the testing you've performed -->

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

### Test Evidence

<!-- Provide evidence that tests pass -->

```bash
# Paste test output here
✓ All tests passing
Coverage: 45% statements, 40% branches
```

### Manual Testing Steps

1. Step 1
2. Step 2
3. Step 3

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]

## Database Changes

<!-- If this PR includes database migrations -->

- [ ] No database changes
- [ ] Supabase migrations added: `supabase/migrations/YYYYMMDD_description.sql`
- [ ] Prisma migrations added: `apps/web/prisma/migrations/YYYYMMDD_description/`
- [ ] Migration tested on staging
- [ ] Rollback strategy documented below

### Migration Rollback

<!-- If applicable, describe how to rollback this migration -->

```sql
-- Rollback commands
```

## Breaking Changes

<!-- If this introduces breaking changes, list them here -->

- [ ] No breaking changes
- [ ] Breaking changes (describe below)

### Breaking Changes Description

<!-- Describe what breaks and why -->

### Migration Guide

<!-- Provide step-by-step instructions for users to migrate -->

1. Step 1
2. Step 2
3. Step 3

## Performance Impact

<!-- Describe any performance implications -->

- [ ] No performance impact
- [ ] Performance improvement (describe below)
- [ ] Potential performance regression (mitigated by...)

### Performance Metrics

<!-- If applicable, include benchmark results -->

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| P50 latency | 100ms | 80ms | -20% ✅ |
| P95 latency | 500ms | 400ms | -20% ✅ |
| Memory usage | 512MB | 480MB | -6% ✅ |

## Security Considerations

<!-- Describe any security implications -->

- [ ] No security impact
- [ ] Security improvement (describe below)
- [ ] Potential security concern (mitigated by...)

### Security Review

<!-- Check all that apply -->

- [ ] No new dependencies added
- [ ] Dependencies scanned for vulnerabilities
- [ ] Secrets properly managed (not committed)
- [ ] Input validation added/reviewed
- [ ] Authentication/authorization unchanged
- [ ] No PII exposure
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

## Deployment Notes

<!-- Special instructions for deploying this change -->

- [ ] No special deployment steps required
- [ ] Special deployment steps (describe below)

### Deployment Steps

1. Step 1
2. Step 2
3. Step 3

### Rollback Plan

<!-- How to rollback if issues arise -->

1. Revert commit or deploy previous tag
2. Rollback database migrations (if applicable)
3. Clear caches (if applicable)

## Configuration Changes

<!-- List any environment variable or configuration changes -->

- [ ] No configuration changes
- [ ] New environment variables (list below)
- [ ] Configuration file changes (list below)

### New Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEW_VAR` | Yes | N/A | Description |

### Configuration Files Changed

- `config/system.yaml`: [description of changes]
- `.env.example`: [description of changes]

## Checklist

<!-- Ensure all items are completed before requesting review -->

### Before Review

- [ ] Code follows project style guidelines (linter passing)
- [ ] TypeScript compilation successful (`pnpm run typecheck`)
- [ ] All tests passing (`pnpm run test`)
- [ ] Code coverage meets thresholds
- [ ] No console errors or warnings
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (if user-facing change)
- [ ] ADR created/updated (if architectural change)

### CI/CD

- [ ] All CI checks passing
- [ ] Build successful
- [ ] Docker images build successfully (if applicable)
- [ ] No security vulnerabilities detected

### Review

- [ ] Self-reviewed code
- [ ] Requested reviewers added
- [ ] Linked related issues
- [ ] Added appropriate labels
- [ ] Assigned to project (if applicable)

## Reviewer Notes

<!-- Any specific areas you'd like reviewers to focus on -->

Please pay special attention to:
- Area 1
- Area 2

## Post-Merge Tasks

<!-- Tasks to complete after merge -->

- [ ] Monitor error rates for 24 hours
- [ ] Update related documentation
- [ ] Notify stakeholders
- [ ] Update project board
- [ ] Close related issues

## Additional Context

<!-- Any other context about the PR -->

## Screenshots/Videos

<!-- For UI changes, include screenshots or videos -->

---

**By submitting this PR, I confirm that**:
- [ ] I have tested these changes locally
- [ ] I have reviewed the [Contributing Guidelines](../CONTRIBUTING.md)
- [ ] I have followed the [Security Guidelines](../SECURITY.md)
- [ ] I understand the [Code of Conduct](../CODE_OF_CONDUCT.md) (if present)

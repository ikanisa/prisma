# Changelog

## [Unreleased]
### Added
- Documented the hotfix release branch workflow, including milestone tagging, observability guardrails, stakeholder UAT coordination, and legacy branch decommissioning steps in `docs/OPERATIONS/hotfix-release-branch-runbook.md`.
- Added `scripts/operations/hotfix-release-manager.ts` with package scripts for automating hotfix branch lifecycle tasks and generating outstanding item reports.

### Operations
- Established guidance for updating internal wikis alongside changelog entries when hotfixes are executed.
- Introduced `docs/OPERATIONS/hotfix-status.json` and `docs/OPERATIONS/hotfix-outstanding-items.md` to track execution status and highlight remaining follow-up work for each hotfix.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-01-11

### Added
- **Security**: Production security validator, rate limiting, OWASP compliance audit
- **Monitoring**: SLOs (99.9% availability, 500ms p95), health check endpoint
- **Testing**: Security, monitoring, and API route test suites
- **Performance**: Artillery load testing (100 concurrent users)
- **Docs**: Disaster recovery, incident response, rollback runbooks
- **Database**: pgTAP RLS validation tests

### Changed
- Middleware includes rate limiting and security validation
- Edge runtime for all API routes (Cloudflare Pages compatible)

## [Unreleased]

### Added
- Documented the hotfix release branch workflow
- Added `scripts/operations/hotfix-release-manager.ts`

### Operations
- Established guidance for updating internal wikis
- Introduced hotfix tracking documents


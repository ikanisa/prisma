# RAG Service Changelog

## Unreleased

### Added
- Prisma client wrapper with opt-in query logging and observer support for resolver instrumentation.
- Agent manifest DataLoader backed by Prisma batching to eliminate N+1 lookups in MCP director flows.
- Unit tests covering manifest batching and Prisma query observer registration.

### Changed
- MCP director resolver now batches manifest lookups via Prisma, reducing repeated `agent_manifests` fetches per task creation.

### Database
- Added Supabase migration creating `idx_agent_manifests_key_created_at` to accelerate latest-manifest lookups used by the batching loader.

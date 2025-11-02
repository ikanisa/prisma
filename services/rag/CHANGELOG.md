# RAG Service Changelog

## Unreleased

- Instrumented Supabase client query logging with optional batch tracing to aid resolver profiling.
- Added batched dependency resolution for orchestration task scheduler to eliminate N+1 lookups.
- Introduced unit tests covering the dependency loader and resolver behaviour.

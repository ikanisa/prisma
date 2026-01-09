# RAG Service Data Access Instrumentation

This service now exposes a small Prisma-focused toolkit under `services/rag/prisma` that the
GraphQL/REST resolvers can rely on to observe and optimise database interactions.

## Query instrumentation

`createServicePrismaClient` wraps the Prisma client constructor with `log: ['error', 'warn', 'query']`
when the `RAG_PRISMA_LOG_QUERIES` (or generic `PRISMA_LOG_QUERIES`) environment variable is enabled.
The helper also wires query event listeners so engineers can stream timing, SQL text, and parameters
into their preferred logger during load tests.

## Batched resolver helpers

* `resolveDocumentFeed` eagerly fetches document metadata together with the uploader and engagement
  relations using Prisma `include` clauses to avoid N+1 lookups.
* `resolveOrganizationDashboard` executes the core organisation queries within a single
  `$transaction` call and batches user hydration through `UserLoader`, collapsing repeated user ID
  lookups across tasks and memberships into a single `findMany` call.

See `services/rag/tests/prisma` for high-level unit tests that exercise the batching and logging
behaviour.

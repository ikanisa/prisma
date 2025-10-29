# @prisma-glow/api-client

Type-safe TypeScript client for the Prisma Glow FastAPI backend, automatically generated from OpenAPI specifications.

## Overview

This package provides a fully-typed client library for interacting with the FastAPI backend. It's generated from the OpenAPI spec exported by FastAPI, ensuring the client is always in sync with the backend API.

## Features

- **Type Safety**: Full TypeScript type definitions for all API endpoints
- **Auto-Generated**: Generated from `openapi/fastapi.json` using `openapi-typescript`
- **Request/Response Types**: Complete type coverage for request parameters and response bodies
- **Validation**: Runtime validation using Zod schemas (optional)
- **Error Handling**: Typed error responses

## Installation

This is a workspace package and is installed automatically when you run:

```bash
pnpm install
```

## Usage

### Import the Client

```typescript
import type { paths } from '@prisma-glow/api-client/types';

// Use path definitions
type GetKnowledgeResponse = paths['/knowledge/search']['get']['responses']['200']['content']['application/json'];
```

### Example: Type-safe API Call

```typescript
import type { paths } from '@prisma-glow/api-client/types';

type SearchParams = paths['/knowledge/search']['get']['parameters']['query'];
type SearchResponse = paths['/knowledge/search']['get']['responses']['200']['content']['application/json'];

async function searchKnowledge(query: SearchParams): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE_URL}/knowledge/search?${new URLSearchParams(query)}`);
  return response.json();
}
```

## Generation

The types are generated from the FastAPI OpenAPI specification:

```bash
# Export OpenAPI spec from FastAPI
python3 server/export_openapi.py

# Generate TypeScript types
openapi-typescript openapi/fastapi.json -o packages/api-client/types.ts

# Or use the combined script
pnpm run codegen:api
```

## CI/CD Integration

The CI pipeline enforces that the generated types are up-to-date:

1. Exports the latest OpenAPI spec from FastAPI
2. Generates TypeScript types
3. Fails if there are differences (drift detection)
4. PR authors must commit updated types

See `.github/workflows/ci.yml` for the enforcement workflow.

## Type Structure

The generated types follow this structure:

```typescript
interface paths {
  '/endpoint': {
    get?: {
      parameters?: {
        query?: { ... }
        path?: { ... }
        header?: { ... }
      }
      requestBody?: {
        content: {
          'application/json': { ... }
        }
      }
      responses: {
        '200': {
          content: {
            'application/json': { ... }
          }
        }
        '400': { ... }
        '404': { ... }
      }
    }
    post?: { ... }
  }
}
```

## Best Practices

### 1. Extract Types for Reuse

```typescript
import type { paths } from '@prisma-glow/api-client/types';

// Extract common types
type KnowledgeDocument = paths['/knowledge/{id}']['get']['responses']['200']['content']['application/json'];
type CreateKnowledgeRequest = paths['/knowledge']['post']['requestBody']['content']['application/json'];

// Use in functions
async function getDocument(id: string): Promise<KnowledgeDocument> {
  // ...
}
```

### 2. Handle Errors with Type Guards

```typescript
import type { paths } from '@prisma-glow/api-client/types';

type ErrorResponse = paths['/knowledge/{id}']['get']['responses']['404']['content']['application/json'];

async function getDocumentSafe(id: string): Promise<KnowledgeDocument | ErrorResponse> {
  const response = await fetch(`/knowledge/${id}`);
  return response.json();
}
```

### 3. Use with Fetch Wrapper

```typescript
import type { paths } from '@prisma-glow/api-client/types';

async function apiCall<P extends keyof paths, M extends keyof paths[P]>(
  path: P,
  method: M,
  options?: RequestInit
): Promise<paths[P][M]['responses']['200']['content']['application/json']> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: method.toString().toUpperCase(),
    ...options
  });
  return response.json();
}
```

## Development

### Build

```bash
pnpm --filter @prisma-glow/api-client build
```

### Test

```bash
pnpm --filter @prisma-glow/api-client test
```

### Type Check

```bash
pnpm --filter @prisma-glow/api-client run tsc --noEmit
```

## Dependencies

- **openapi-typescript**: Generates TypeScript types from OpenAPI specs
- **FastAPI**: Backend API that exports the OpenAPI spec

## Troubleshooting

### Types Out of Sync

If you see type errors after backend changes:

```bash
# Regenerate types
pnpm run codegen:api

# Commit the updated types
git add packages/api-client/types.ts openapi/fastapi.json
git commit -m "chore: regenerate API client types"
```

### Python Environment Issues

The `codegen:api` script requires Python and FastAPI dependencies:

```bash
# Setup virtualenv
python -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt

# Then regenerate
pnpm run codegen:api
```

## Related Documentation

- [FastAPI OpenAPI Documentation](https://fastapi.tiangolo.com/tutorial/metadata/)
- [openapi-typescript](https://github.com/drwpow/openapi-typescript)
- [Architecture Documentation](../../docs/architecture.md)

## Maintainers

- **Owner**: Platform Team
- **Code Review**: Required for all changes
- **CI Enforcement**: Automatic drift detection

---

**Last Updated**: 2025-10-29  
**Version**: 0.0.1

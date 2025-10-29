# @prisma-glow/logger

Structured logging library with correlation ID support for distributed tracing across Prisma Glow services.

## Overview

Provides consistent, structured JSON logging with automatic context injection for request IDs, organization IDs, and user IDs. Integrates with Sentry for error tracking and supports OpenTelemetry trace correlation.

## Features

- **Structured JSON Output**: Machine-readable logs for log aggregation
- **Correlation IDs**: Automatic injection of `requestId`, `orgId`, `userId`
- **Sentry Integration**: Automatic error reporting with context
- **Log Levels**: trace, debug, info, warn, error, fatal
- **Performance Friendly**: Minimal overhead, async Sentry reporting
- **TypeScript Support**: Full type definitions

## Installation

Workspace package - installed automatically:

```bash
pnpm install
```

## Quick Start

### Basic Usage

```typescript
import { createLogger } from '@prisma-glow/logger';

const logger = createLogger('my-service');

logger.info('Server started', { port: 3000 });
logger.warn('Rate limit approaching', { current: 580, max: 600 });
logger.error('Database connection failed', { error: err });
```

### With Request Context

```typescript
import { createLogger, setRequestContext } from '@prisma-glow/logger';

const logger = createLogger('api');

// Set context for current request
setRequestContext({
  requestId: 'req-abc123',
  orgId: 'org-456',
  userId: 'user-789'
});

// Context automatically included in all logs
logger.info('Processing request');
// Output: {"timestamp":"...","level":"info","service":"api","requestId":"req-abc123","orgId":"org-456","userId":"user-789","message":"Processing request"}
```

## API Reference

### `createLogger(serviceName: string): Logger`

Creates a new logger instance for a service.

```typescript
const logger = createLogger('gateway');
```

### Log Methods

All log methods accept a message and optional context object:

```typescript
logger.trace(message: string, context?: object): void
logger.debug(message: string, context?: object): void
logger.info(message: string, context?: object): void
logger.warn(message: string, context?: object): void
logger.error(message: string, context?: object): void
logger.fatal(message: string, context?: object): void
```

### `setRequestContext(context: RequestContext): void`

Sets the request context for the current async operation:

```typescript
interface RequestContext {
  requestId: string;
  orgId?: string;
  userId?: string;
  engagementId?: string;
  traceId?: string;
  spanId?: string;
}

setRequestContext({
  requestId: 'req-abc123',
  orgId: 'org-456',
  userId: 'user-789'
});
```

### `clearRequestContext(): void`

Clears the request context:

```typescript
clearRequestContext();
```

## Configuration

### Environment Variables

```bash
# Log level (trace, debug, info, warn, error, fatal)
LOG_LEVEL=info

# Service name (overrides createLogger parameter)
SERVICE_NAME=gateway

# Pretty print logs (for development)
LOG_PRETTY=true

# Sentry DSN for error reporting
SENTRY_DSN=https://...@sentry.io/...

# Sentry environment
SENTRY_ENVIRONMENT=production

# Sentry release (git SHA)
SENTRY_RELEASE=abc123
```

### Production Configuration

```bash
# Production settings
LOG_LEVEL=info
LOG_PRETTY=false
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=$(git rev-parse --short HEAD)
```

### Development Configuration

```bash
# Development settings
LOG_LEVEL=debug
LOG_PRETTY=true
SENTRY_DSN=  # Leave empty to disable
```

## Log Format

### JSON Output (Production)

```json
{
  "timestamp": "2025-10-29T18:00:00.000Z",
  "level": "info",
  "service": "gateway",
  "requestId": "req-abc123",
  "orgId": "org-456",
  "userId": "user-789",
  "message": "Request completed",
  "duration": 156,
  "status": 200
}
```

### Pretty Output (Development)

```
[2025-10-29T18:00:00.000Z] INFO  gateway [req-abc123] Request completed duration=156ms status=200
```

## Usage Examples

### Express Middleware

```typescript
import express from 'express';
import { createLogger, setRequestContext } from '@prisma-glow/logger';

const app = express();
const logger = createLogger('gateway');

// Request context middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  setRequestContext({
    requestId,
    orgId: req.headers['x-org-id'],
    userId: req.user?.id
  });
  
  logger.info('Request started', {
    method: req.method,
    path: req.path
  });
  
  next();
});

// Route handler
app.get('/api/data', async (req, res) => {
  logger.debug('Fetching data');
  
  try {
    const data = await fetchData();
    logger.info('Data fetched successfully', { count: data.length });
    res.json(data);
  } catch (error) {
    logger.error('Failed to fetch data', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Error Handling

```typescript
import { createLogger } from '@prisma-glow/logger';

const logger = createLogger('service');

async function processTask(taskId: string) {
  try {
    logger.info('Processing task', { taskId });
    await doWork(taskId);
    logger.info('Task completed', { taskId });
  } catch (error) {
    // Automatically reported to Sentry
    logger.error('Task failed', {
      taskId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
```

### Structured Data

```typescript
import { createLogger } from '@prisma-glow/logger';

const logger = createLogger('analytics');

// Log with rich context
logger.info('User action', {
  action: 'document_uploaded',
  userId: 'user-123',
  documentId: 'doc-456',
  fileSize: 1024000,
  mimeType: 'application/pdf',
  metadata: {
    tags: ['tax', 'audit'],
    year: 2024
  }
});
```

### Performance Logging

```typescript
import { createLogger } from '@prisma-glow/logger';

const logger = createLogger('api');

async function handleRequest(req: Request) {
  const start = Date.now();
  
  try {
    const result = await processRequest(req);
    const duration = Date.now() - start;
    
    logger.info('Request processed', {
      path: req.path,
      duration,
      success: true
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error('Request failed', {
      path: req.path,
      duration,
      success: false,
      error: error.message
    });
    
    throw error;
  }
}
```

## Integration with OpenTelemetry

The logger automatically includes trace IDs when used with OpenTelemetry:

```typescript
import { trace } from '@opentelemetry/api';
import { createLogger, setRequestContext } from '@prisma-glow/logger';

const logger = createLogger('service');

// Get current span
const span = trace.getActiveSpan();
const spanContext = span?.spanContext();

// Set trace context
setRequestContext({
  requestId: 'req-abc123',
  traceId: spanContext?.traceId,
  spanId: spanContext?.spanId
});

// Logs will include traceId and spanId
logger.info('Operation started');
```

## Integration with Sentry

Errors logged at `error` or `fatal` level are automatically reported to Sentry:

```typescript
import { createLogger } from '@prisma-glow/logger';

const logger = createLogger('service');

try {
  await dangerousOperation();
} catch (error) {
  // Automatically sent to Sentry with full context
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    context: {
      operation: 'dangerousOperation',
      retry: 3
    }
  });
}
```

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
logger.trace('Entering function', { args });     // Very detailed, disabled in prod
logger.debug('Processing step', { data });       // Development debugging
logger.info('User logged in', { userId });       // Important business events
logger.warn('Rate limit approaching', { rate }); // Warning conditions
logger.error('Database error', { error });       // Errors that need attention
logger.fatal('Service crashed', { error });      // Critical failures
```

### 2. Include Relevant Context

```typescript
// ✅ Good - includes relevant context
logger.info('Payment processed', {
  orderId: 'ord-123',
  amount: 99.99,
  currency: 'USD',
  processor: 'stripe'
});

// ❌ Avoid - missing context
logger.info('Payment processed');
```

### 3. Don't Log Sensitive Data

```typescript
// ❌ Bad - logs sensitive data
logger.info('User authenticated', {
  password: user.password,
  creditCard: user.creditCard
});

// ✅ Good - logs only safe data
logger.info('User authenticated', {
  userId: user.id,
  email: user.email
});
```

### 4. Use Request Context

```typescript
// ✅ Good - sets context once
setRequestContext({ requestId, orgId, userId });
logger.info('Step 1');
logger.info('Step 2');
logger.info('Step 3');

// ❌ Avoid - repeating context
logger.info('Step 1', { requestId, orgId, userId });
logger.info('Step 2', { requestId, orgId, userId });
logger.info('Step 3', { requestId, orgId, userId });
```

## Testing

### Mock Logger in Tests

```typescript
import { jest } from '@jest/globals';

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn()
};

jest.mock('@prisma-glow/logger', () => ({
  createLogger: () => mockLogger
}));

// In tests
expect(mockLogger.info).toHaveBeenCalledWith('Expected message', { context });
```

### Capture Logs in Tests

```typescript
import { createLogger } from '@prisma-glow/logger';

describe('MyService', () => {
  let logs: any[] = [];
  
  beforeEach(() => {
    logs = [];
    // Capture logs instead of outputting
    jest.spyOn(console, 'log').mockImplementation((msg) => {
      logs.push(JSON.parse(msg));
    });
  });
  
  it('logs correct message', () => {
    const logger = createLogger('test');
    logger.info('Test message', { value: 123 });
    
    expect(logs[0]).toMatchObject({
      level: 'info',
      message: 'Test message',
      value: 123
    });
  });
});
```

## Troubleshooting

### Logs Not Appearing

Check log level configuration:

```bash
# Set to debug for more verbose output
export LOG_LEVEL=debug
```

### Sentry Not Reporting Errors

Verify Sentry configuration:

```bash
# Check Sentry DSN is set
echo $SENTRY_DSN

# Test Sentry integration
node -e "require('@sentry/node').captureMessage('test')"
```

### Request Context Not Included

Ensure `setRequestContext` is called before logging:

```typescript
// ✅ Good
setRequestContext({ requestId });
logger.info('Message'); // Includes requestId

// ❌ Wrong order
logger.info('Message'); // Missing requestId
setRequestContext({ requestId });
```

## Related Documentation

- [Architecture Documentation](../../docs/architecture.md)
- [Observability Guide](../../docs/observability.md)
- [Gateway README](../../apps/gateway/README.md)

## Maintainers

- **Owner**: Platform Team
- **Code Review**: Required for changes
- **Dependencies**: Sentry SDK, async_hooks

---

**Last Updated**: 2025-10-29  
**Version**: 0.0.1

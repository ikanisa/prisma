# Core Infrastructure Package

Enterprise-grade infrastructure services for the Prisma AI platform.

## Modules

### Infrastructure

| Module | Description |
|--------|-------------|
| `event-bus.ts` | Kafka/RabbitMQ abstraction with DLQ and retry |
| `cache-service.ts` | Redis caching with TTL and distributed locking |
| `search-service.ts` | Elasticsearch with inverted index and facets |
| `auto-scaling.ts` | HPA/VPA policies and K8s manifest generation |

### Compliance

| Module | Description |
|--------|-------------|
| `soc2-compliance.ts` | SOC 2 Type II controls and evidence collection |
| `gdpr-ccpa-compliance.ts` | Privacy compliance (DSR, consent, breach) |
| `audit-logging.ts` | Tamper-evident hash chain logging |

### Monitoring

| Module | Description |
|--------|-------------|
| `sla-monitoring.ts` | 99.95% uptime tracking AND error budgets |

## Usage

```typescript
import { eventBus } from '@prisma/core/infrastructure/event-bus';
import { cacheService } from '@prisma/core/infrastructure/cache-service';
import { soc2Framework } from '@prisma/core/compliance/soc2-compliance';
import { slaMonitor } from '@prisma/core/monitoring/sla-monitoring';

// Publish event
await eventBus.publish('audit.finding', { severity: 'high' });

// Cache data
await cacheService.set('key', data, { ttl: 3600 });

// Record SLA metric
slaMonitor.recordRequest('api', 150, true);

// Assess SOC 2 control
await soc2Framework.assessControl('CC5.1', assessment);
```

## Environment Variables

```bash
# Redis
REDIS_URL=redis://localhost:6379

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Kafka
KAFKA_BROKERS=localhost:9092
```

# easyMO Architectural Refactor Proposal

## Overview
This document outlines the comprehensive refactor plan to consolidate easyMO's bloated codebase into a clean, domain-driven architecture.

## Current State Analysis
- **Admin Pages**: 62 pages (target: 9 consolidated pages)
- **Database Tables**: 89 tables (target: ~60 after deduplication)
- **Edge Functions**: 102 functions (target: ~70 modularized functions)
- **Duplicate Code**: ~40% storage waste, 15+ overlapping functions

## Target Architecture

### 1. Domain-Driven Folder Structure
```
apps/
├── edge/
│   ├── core/           # auth, users, roles
│   ├── commerce/       # orders, payments, products
│   ├── mobility/       # trips, drivers, passengers  
│   ├── messaging/      # whatsapp, conversations, campaigns
│   ├── ai-agents/      # agents, personas, learning
│   └── system-ops/     # metrics, monitoring, cron
├── shared/
│   ├── types.ts        # shared type definitions
│   ├── logger.ts       # centralized logging
│   ├── validation.ts   # zod schemas
│   └── utils.ts        # common utilities
```

### 2. Consolidated Admin Pages (9 Core Pages)

#### Navigation Structure
```
📊 Dashboard
👥 Users & Contacts          (merges Users + WhatsApp Contacts)
🏢 Businesses               (sub-tabs: Farmers, Drivers, Vendors)
📦 Listings & Inventory     (Produce, Products, Properties, Vehicles)
🛒 Orders & Payments        (Unified Orders, Payments)
🚗 Trips & Intents          (Driver Trips + Passenger Intents)
💬 Messaging & Campaigns    (Marketing, Conversations, Live Handoffs)
🤖 AI Agents & Models       (Agents, Personas, Model Registry, Tools)
⚙️ System Ops               (Quality, Experiments, Metrics, Logs)
```

### 3. Database Schema Consolidation

#### Core Tables (Post-Merge)
```sql
-- Core Domain
users (extends with contact info)
user_roles (enum-based roles)
businesses (unified business entities)

-- Commerce Domain  
unified_listings (products, produce, properties, vehicles)
unified_orders (all order types)
payments (unchanged)

-- Mobility Domain
driver_sessions
passenger_intents_spatial
driver_trips_spatial  
bookings_spatial

-- Messaging Domain
conversations (normalized threading)
messages (unified message store)
marketing_campaigns
campaign_subscribers

-- AI Domain
agents
agent_personas
agent_learning
agent_documents

-- System Domain
system_metrics
data_sync_runs
cron_jobs
```

## Implementation Phases

### Phase 1: Database Consolidation (Week 1)
**Objective**: Merge duplicate tables, create migration scripts

**Tasks**:
1. **Products → Unified Listings Migration**
   ```sql
   CREATE TABLE unified_listings (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     listing_type listing_type_enum NOT NULL, -- 'product'|'produce'|'property'|'vehicle'
     title text NOT NULL,
     description text,
     price numeric,
     vendor_id uuid REFERENCES businesses(id),
     metadata jsonb, -- type-specific fields
     location_gps point,
     status text DEFAULT 'active',
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );
   ```

2. **Orders → Unified Orders Migration**
   ```sql
   ALTER TABLE unified_orders ADD COLUMN order_type text;
   ALTER TABLE unified_orders ADD COLUMN domain_metadata jsonb;
   -- Migrate pharmacy_orders, marketplace_orders, etc.
   ```

3. **Conversations Normalization**
   ```sql
   CREATE TABLE conversations (
     id uuid PRIMARY KEY,
     contact_id text NOT NULL,
     channel text NOT NULL, -- 'whatsapp'|'telegram'|'web'
     thread_id text,
     status text DEFAULT 'active',
     started_at timestamptz DEFAULT now()
   );
   
   CREATE TABLE messages (
     id uuid PRIMARY KEY,
     conversation_id uuid REFERENCES conversations(id),
     sender_type text NOT NULL, -- 'user'|'agent'|'system'
     content text NOT NULL,
     metadata jsonb,
     created_at timestamptz DEFAULT now()
   );
   ```

**Deliverables**:
- `db/migrations/001_consolidate_products.sql`
- `db/migrations/002_consolidate_orders.sql` 
- `db/migrations/003_normalize_conversations.sql`
- `scripts/migrate_data.ts`

### Phase 2: Edge Function Modularization (Week 2)
**Objective**: Split monolith functions, create shared utilities

**Tasks**:
1. **Create Shared Utilities**
   ```typescript
   // apps/shared/logger.ts
   export const logger = {
     info: (msg: string, meta?: any) => console.log(JSON.stringify({level: 'info', msg, meta})),
     error: (msg: string, error?: any) => console.error(JSON.stringify({level: 'error', msg, error})),
     warn: (msg: string, meta?: any) => console.warn(JSON.stringify({level: 'warn', msg, meta}))
   };
   
   // apps/shared/validation.ts  
   export const createHandler = <T>(schema: z.ZodSchema<T>, handler: (data: T) => Promise<Response>) => {
     return async (req: Request) => {
       try {
         const body = await req.json();
         const validData = schema.parse(body);
         return await handler(validData);
       } catch (error) {
         return new Response(JSON.stringify({success: false, error: error.message}), {status: 400});
       }
     };
   };
   ```

2. **Modularize by Domain**
   ```
   apps/edge/
   ├── messaging/
   │   ├── whatsapp-router.ts      (single WhatsApp entry point)
   │   ├── conversation-handler.ts 
   │   └── campaign-sender.ts
   ├── mobility/
   │   ├── trip-matcher.ts
   │   ├── intent-processor.ts
   │   └── driver-tracker.ts
   ├── commerce/
   │   ├── order-processor.ts
   │   ├── payment-webhook.ts
   │   └── inventory-sync.ts
   ```

**Deliverables**:
- `apps/edge/` modular structure
- `apps/shared/` utility libraries
- Updated function routing

### Phase 3: React Admin Consolidation (Week 3) 
**Objective**: Merge pages, create shared components, implement typed hooks

**Tasks**:
1. **Page Consolidation**
   - Merge `Products` + `UnifiedProducts` → `ListingsInventory`
   - Merge `WhatsAppContacts` + `WAContactsPage` → `UsersContacts`
   - Merge `Conversations` + `UnifiedConversations` → `MessagingCampaigns`

2. **Shared Table Component**
   ```typescript
   // components/admin/AdminTable.tsx
   interface AdminTableProps<T> {
     data: T[];
     columns: ColumnDef<T>[];
     loading?: boolean;
     onRowClick?: (row: T) => void;
     filters?: FilterConfig[];
     actions?: ActionConfig[];
   }
   ```

3. **Typed Hooks with TanStack Query**
   ```typescript
   // hooks/useUnifiedListings.ts
   export const useUnifiedListings = (filters?: ListingFilters) => {
     return useQuery({
       queryKey: ['unified-listings', filters],
       queryFn: () => supabase.from('unified_listings').select('*').match(filters || {})
     });
   };
   ```

**Deliverables**:
- 9 consolidated admin pages
- `<AdminTable />` shared component  
- Typed hooks for all data operations
- Updated routing in `App.tsx`

### Phase 4: Testing & Quality (Week 4)
**Objective**: Add comprehensive tests, achieve 85%+ coverage

**Tasks**:
1. **Vitest Unit Tests**
   ```typescript
   // tests/unit/edge/commerce/order-processor.test.ts
   describe('Order Processor', () => {
     it('should process valid order', async () => {
       const mockOrder = {...};
       const result = await processOrder(mockOrder);
       expect(result.success).toBe(true);
     });
   });
   ```

2. **Playwright E2E Tests**
   ```typescript
   // tests/e2e/admin-flows.spec.ts
   test('admin can create and manage listing', async ({ page }) => {
     await page.goto('/admin/listings-inventory');
     await page.click('[data-testid="create-listing"]');
     // ... test flow
   });
   ```

3. **GitHub Actions CI**
   ```yaml
   # .github/workflows/ci.yml
   name: CI/CD Pipeline
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - run: npm ci
         - run: npm run lint
         - run: npm run test:unit
         - run: npm run test:e2e
   ```

**Deliverables**:
- Unit tests for all edge functions
- E2E tests for critical admin flows  
- Green CI/CD pipeline
- 85%+ test coverage

### Phase 5: Documentation & Polish (Week 5)
**Objective**: Update docs, create ERD, finalize deployment

**Tasks**:
1. **Architecture Documentation**
   - Update `docs/ARCHITECTURE.md`
   - Create PlantUML ERD
   - Add domain ADRs

2. **API Documentation**
   - Document edge function APIs
   - Create Postman collection
   - Add OpenAPI specs

**Deliverables**:
- Updated architecture docs
- ERD diagrams (PNG + PlantUML)
- API documentation
- Deployment guides

## Success Metrics

### Performance Targets
- **Page Load Time**: <2s for all admin pages
- **Database Query Time**: <500ms average
- **Bundle Size**: <2MB gzipped
- **Test Coverage**: ≥85%

### Code Quality Targets  
- **ESLint Errors**: 0
- **TypeScript Strict**: Enabled
- **Duplicate Code**: <5%
- **Dead Code**: 0 files

### Developer Experience
- **Build Time**: <30s
- **Hot Reload**: <1s
- **Type Safety**: 100% typed APIs
- **Documentation**: Complete API docs

## Risk Mitigation

### Data Migration Risks
- **Backup Strategy**: Full DB backup before each migration
- **Rollback Scripts**: Provided for each migration
- **Staged Deployment**: Test → Staging → Production
- **Data Validation**: Automated checks post-migration

### Breaking Changes
- **API Versioning**: Maintain v1 APIs during transition
- **Feature Flags**: Toggle new/old implementations
- **Gradual Migration**: Phase rollouts over 5 weeks
- **Monitoring**: Enhanced logging during transition

## Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|----------------|
| 1 | Week 1 | Database consolidation complete |
| 2 | Week 2 | Edge functions modularized |  
| 3 | Week 3 | Admin pages consolidated to 9 |
| 4 | Week 4 | 85%+ test coverage achieved |
| 5 | Week 5 | Documentation complete, production ready |

**Total Duration**: 5 weeks
**Team Effort**: ~200 hours
**Expected ROI**: 40% faster development, 30% fewer bugs, 25% better performance
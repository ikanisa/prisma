# Production Readiness Action Plan
**Generated:** 2025-11-28  
**Status:** 🔴 CRITICAL - 58/100 Production Score  
**Timeline:** 8 weeks (4 developers)

## 🚨 IMMEDIATE BLOCKERS (Next 48 Hours)

### 1. Development Environment Issues
- [ ] **CRITICAL**: Turbo not installed (NODE_ENV=production blocked devDependencies)
  - Run: `unset NODE_ENV && pnpm install --frozen-lockfile`
  - Verify: `pnpm run typecheck && pnpm run test`
  
### 2. Missing Core Infrastructure
- [ ] Gateway services directory missing
- [ ] Agent API endpoints (40+) not implemented
- [ ] Desktop app infrastructure (Tauri) not initialized

## 📅 PHASE 1: Foundation (Week 1-2) - CRITICAL

### Week 1: Core Infrastructure
**Goal:** Enable development and establish baseline

#### Day 1-2: Development Environment
```bash
# Fix turbo installation
unset NODE_ENV
pnpm install --frozen-lockfile

# Create missing directories
mkdir -p apps/gateway/src/services
mkdir -p apps/gateway/src/routes/agents
mkdir -p src/components/agents
mkdir -p src/pages/admin/agents

# Verify baseline
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run coverage
```

#### Day 3-4: Database Migrations
**Priority:** Agent learning system migrations exist but need verification

**Action Items:**
1. Review existing migrations:
   - `migrations/sql/20251128133000_agent_learning_system.sql` (latest)
   - Verify tables: agents, agent_personas, agent_executions, agent_tools
   
2. Create missing tables:
   ```sql
   -- Required migrations:
   - agent_tool_assignments
   - agent_knowledge_assignments  
   - agent_guardrail_assignments
   ```

3. Apply migrations:
   ```bash
   # If DATABASE_URL is configured
   psql "$DATABASE_URL" -f migrations/sql/20251128133000_agent_learning_system.sql
   ```

#### Day 5: Gateway Services Scaffold
**File:** `apps/gateway/src/services/AgentService.ts`

```typescript
import { db } from '../db';

export class AgentService {
  async listAgents(filters?: {
    type?: string;
    status?: string;
    orgId?: string;
  }) {
    // TODO: Implement with Prisma
  }

  async getAgent(id: string) {
    // TODO: Implement
  }

  async createAgent(data: CreateAgentDTO) {
    // TODO: Implement
  }

  async updateAgent(id: string, data: UpdateAgentDTO) {
    // TODO: Implement
  }

  async deleteAgent(id: string) {
    // TODO: Implement
  }

  async testAgent(id: string, input: unknown) {
    // TODO: Implement execution
  }
}

export const agentService = new AgentService();
```

### Week 2: API Implementation

#### API Routes (40 endpoints)
**Priority Order:**
1. **CRITICAL (8 endpoints)** - Agent CRUD
2. **HIGH (13 endpoints)** - Personas, Tools  
3. **MEDIUM (19 endpoints)** - Knowledge, Learning, Guardrails

**Implementation Pattern:**
```typescript
// apps/gateway/src/routes/agents.ts
import { Router } from 'express';
import { agentService } from '../services/AgentService';

const router = Router();

router.post('/api/v1/agents', async (req, res) => {
  // TODO: Validate with Zod
  const agent = await agentService.createAgent(req.body);
  res.json(agent);
});

router.get('/api/v1/agents', async (req, res) => {
  const agents = await agentService.listAgents(req.query);
  res.json(agents);
});

// ... 6 more endpoints

export default router;
```

## 📅 PHASE 2: Core Features (Week 3-4) - HIGH PRIORITY

### Week 3: Frontend UI Components

#### Critical Components (20 components)
**Priority:**
1. AgentCard.tsx - Display agent summary
2. AgentForm.tsx - Create/edit agent
3. PersonaEditor.tsx - Rich persona configuration
4. AgentTestConsole.tsx - Live testing interface
5. ToolCard.tsx - Tool display
6. ToolForm.tsx - Tool registration

**Component Template:**
```tsx
// src/components/agents/AgentCard.tsx
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    type: 'tax' | 'audit' | 'advisory' | 'general';
    status: 'draft' | 'active' | 'deprecated';
  };
  onEdit?: () => void;
  onTest?: () => void;
}

export function AgentCard({ agent, onEdit, onTest }: AgentCardProps) {
  // TODO: Implement rich card with actions
  return (
    <Card>
      <h3>{agent.name}</h3>
      <Badge>{agent.type}</Badge>
      <Badge variant={agent.status === 'active' ? 'success' : 'default'}>
        {agent.status}
      </Badge>
    </Card>
  );
}
```

### Week 4: Admin Pages

#### Required Pages (20 pages)
**Implementation Order:**
1. `/admin/agents/index.tsx` - Agent registry (data table)
2. `/admin/agents/create.tsx` - Creation wizard
3. `/admin/agents/[id]/index.tsx` - Agent detail view
4. `/admin/agents/[id]/personas.tsx` - Persona management
5. `/admin/agents/[id]/tools.tsx` - Tool assignments

**Page Template:**
```tsx
// src/pages/admin/agents/index.tsx
import { DataTable } from '@/components/ui/data-table';
import { useAgents } from '@/hooks/use-agents';

export default function AgentsPage() {
  const { agents, isLoading } = useAgents();

  const columns = [
    { accessorKey: 'name', header: 'Agent Name' },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'status', header: 'Status' },
    // ... more columns
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1>Agent Registry</h1>
        <Button asChild>
          <Link href="/admin/agents/create">Create Agent</Link>
        </Button>
      </div>
      <DataTable columns={columns} data={agents} />
    </div>
  );
}
```

## 📅 PHASE 3: Desktop App (Week 5-6) - MEDIUM PRIORITY

### Week 5: Tauri Initialization

#### Desktop Project Setup
```bash
# Create Tauri project
pnpm create tauri-app prisma-desktop

# Project structure:
# prisma-desktop/
# ├── src-tauri/          # Rust backend
# │   ├── src/main.rs
# │   ├── Cargo.toml
# │   └── tauri.conf.json
# └── src/               # Shared React UI (symlink to ../src)
```

#### Tauri Configuration
```json
// prisma-desktop/src-tauri/tauri.conf.json
{
  "productName": "Prisma Glow",
  "version": "1.0.0",
  "identifier": "com.prismагlow.desktop",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": {
        "scope": ["$APPDATA/*", "$DOWNLOAD/*"]
      },
      "dialog": {
        "open": true,
        "save": true
      }
    },
    "windows": [{
      "title": "Prisma Glow",
      "width": 1200,
      "height": 800,
      "minWidth": 800,
      "minHeight": 600
    }]
  }
}
```

### Week 6: Native Features

#### File System Integration
```rust
// src-tauri/src/commands/file_system.rs
use tauri::command;

#[command]
pub async fn select_file() -> Result<String, String> {
    let file_path = tauri::api::dialog::FileDialogBuilder::new()
        .pick_file()
        .ok_or("No file selected")?;
    
    Ok(file_path.to_string_lossy().to_string())
}

#[command]
pub async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path)
        .map_err(|e| e.to_string())
}
```

#### Desktop CI/CD
```yaml
# .github/workflows/desktop-release.yml
name: Desktop App Release

on:
  push:
    tags:
      - 'desktop-v*'

jobs:
  release:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-20.04, windows-latest]
    runs-on: ${{ matrix.platform }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Prisma Glow Desktop ${{ github.ref_name }}'
```

## 📅 PHASE 4: Polish & Launch (Week 7-8)

### Week 7: Security & Testing

#### Security Hardening Checklist
- [ ] Rate limiting on all API routes (express-rate-limit)
- [ ] CSRF protection (csurf middleware)
- [ ] Input validation with Zod schemas
- [ ] Security headers (helmet.js)
- [ ] API key rotation policy
- [ ] MFA enforcement for sensitive operations

#### Test Coverage Goals
```bash
# Current: 45% | Target: 80%
pnpm run coverage

# Requirements:
- Frontend components: 80%
- Backend APIs: 80%
- Agent system: 80%
- Integration tests: 60%
- E2E tests: 50%
```

### Week 8: Production Launch

#### Pre-Launch Checklist
- [ ] Staging deployment complete
- [ ] Load testing passed (Artillery/k6)
- [ ] Security audit complete
- [ ] Desktop app signed (Windows/macOS)
- [ ] Monitoring configured (Sentry/DataDog)
- [ ] Backup/restore tested
- [ ] Rollback plan documented
- [ ] Team training complete

#### Go-Live Sequence
1. Database migrations (off-peak)
2. Backend deployment (blue-green)
3. Frontend deployment (CDN purge)
4. Desktop app release (staged rollout)
5. Monitoring verification
6. Announcement

## 📊 SUCCESS METRICS

### Production Readiness Score
**Target:** 90/100 by Week 8

| Category | Current | Week 4 Target | Week 8 Target |
|----------|---------|---------------|---------------|
| AI Agent System | 65% | 85% | 95% |
| Admin Panel | 40% | 70% | 90% |
| Desktop App | 15% | 60% | 85% |
| Backend APIs | 55% | 80% | 95% |
| Security | 70% | 85% | 95% |
| Testing | 60% | 75% | 85% |
| **Overall** | **58** | **76** | **91** |

### Performance Targets
- API response time: < 200ms (p95)
- Frontend load time: < 2s (p95)
- Desktop startup: < 2s
- Test coverage: > 80%
- Build time: < 5min

## 🚀 QUICK START (RIGHT NOW)

```bash
# 1. Fix development environment
unset NODE_ENV
pnpm install --frozen-lockfile

# 2. Verify baseline
pnpm run typecheck
pnpm run test

# 3. Create infrastructure
mkdir -p apps/gateway/src/services
mkdir -p apps/gateway/src/routes/agents
mkdir -p src/components/agents
mkdir -p src/pages/admin/agents

# 4. Review existing migrations
ls -la migrations/sql/*agent*

# 5. Start implementation
# - Begin with AgentService.ts (Day 5 task above)
# - Implement critical API endpoints
# - Build UI components

# 6. Track progress
# Update this file with completion status
```

## 📞 ESCALATION

### Critical Blockers
- **Database access issues:** Check .env DATABASE_URL
- **Turbo/build failures:** Verify Node 22.12.0 or 20.19.4
- **Tauri setup issues:** Ensure Rust toolchain installed

### Decision Points
- **Week 2:** API design review (REST vs GraphQL)
- **Week 4:** Desktop app scope confirmation
- **Week 6:** Security audit scheduling
- **Week 7:** Go-live date finalization

---

**Next Actions:**
1. ✅ Review this action plan
2. ⏳ Fix development environment (unset NODE_ENV)
3. ⏳ Run baseline verification (typecheck, test, coverage)
4. ⏳ Create service scaffolds (AgentService.ts)
5. ⏳ Implement first 8 API endpoints (agent CRUD)

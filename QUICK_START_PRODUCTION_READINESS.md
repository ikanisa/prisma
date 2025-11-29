# Quick Start: Production Readiness
**START HERE** - Get from 72/100 to 95/100 in 4 weeks

## ⚡ RIGHT NOW (5 Minutes)

```bash
# Fix development environment
unset NODE_ENV
pnpm install --frozen-lockfile

# Verify everything works
pnpm run typecheck
pnpm run test
```

**Expected Output:**
- ✅ Turbo found
- ✅ Typecheck passes
- ✅ Tests run

## 📅 WEEK 1: Agent Admin UI (Critical)

### Day 1: Component Foundation

#### 1. Create Agent Components Directory
```bash
mkdir -p src/components/agents
mkdir -p src/pages/admin/agents
```

#### 2. AgentCard Component
**File:** `src/components/agents/AgentCard.tsx`

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Agent {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  type: string;
  is_active: boolean;
}

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle>{agent.name}</CardTitle>
          <Badge variant={agent.is_active ? 'default' : 'secondary'}>
            {agent.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <CardDescription>{agent.slug}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{agent.description}</p>
        <div className="mt-4 flex gap-2">
          <Badge variant="outline">{agent.category}</Badge>
          <Badge variant="outline">{agent.type}</Badge>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm">Edit</Button>
          <Button variant="outline" size="sm">Test</Button>
          <Button variant="destructive" size="sm">Delete</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 3. Use Agent Hook
**File:** `src/hooks/use-agents-api.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/agents';

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  type: string;
  is_active: boolean;
  organization_id: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export function useAgents(filters?: {
  organization_id?: string;
  category?: string;
  type?: string;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ['agents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.organization_id) params.set('organization_id', filters.organization_id);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.type) params.set('type', filters.type);
      if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active));

      const response = await fetch(`${API_BASE}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json() as Promise<Agent[]>;
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<Agent, 'id' | 'version' | 'created_at' | 'updated_at'>) => {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create agent');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Agent> }) => {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update agent');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete agent');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
```

#### 4. Agent Registry Page
**File:** `src/pages/admin/agents/index.tsx`

```tsx
import { AgentCard } from '@/components/agents/AgentCard';
import { useAgents } from '@/hooks/use-agents-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useState } from 'react';

export default function AgentsPage() {
  const [category, setCategory] = useState<string>();
  const [search, setSearch] = useState('');
  
  const { data: agents, isLoading } = useAgents({ category });

  const filteredAgents = agents?.filter(agent => 
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agent Registry</h1>
          <p className="text-muted-foreground">Manage AI agents and configurations</p>
        </div>
        <Button>Create Agent</Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={category} onValueChange={setCategory}>
          <option value="">All Categories</option>
          <option value="tax">Tax</option>
          <option value="audit">Audit</option>
          <option value="accounting">Accounting</option>
        </Select>
      </div>

      {isLoading ? (
        <div>Loading agents...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents?.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Day 2-3: Agent Form & Creation

**File:** `src/pages/admin/agents/create.tsx`

```tsx
import { useCreateAgent } from '@/hooks/use-agents-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function CreateAgentPage() {
  const router = useRouter();
  const createAgent = useCreateAgent();
  
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    category: 'tax',
    type: 'assistant',
    is_active: true,
    organization_id: '', // Get from auth context
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAgent.mutateAsync(formData);
      router.push('/admin/agents');
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Create New Agent</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Agent Slug</label>
          <Input
            required
            placeholder="tax-corp-us-023"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Agent Name</label>
          <Input
            required
            placeholder="US Corporate Tax Specialist"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <Textarea
            placeholder="Describe the agent's purpose and capabilities..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <option value="tax">Tax</option>
            <option value="audit">Audit</option>
            <option value="accounting">Accounting</option>
            <option value="advisory">Advisory</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <option value="assistant">Assistant</option>
            <option value="specialist">Specialist</option>
            <option value="orchestrator">Orchestrator</option>
          </Select>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={createAgent.isPending}>
            {createAgent.isPending ? 'Creating...' : 'Create Agent'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
```

## 📅 WEEK 2: Desktop App Foundation

### Initialize Tauri Project

```bash
# In repository root
cd ..
pnpm create tauri-app prisma-desktop --template react-ts

# Answer prompts:
# - Package name: @prisma-glow/desktop
# - Framework: React
# - TypeScript: Yes
```

### Configure Tauri

**File:** `prisma-desktop/src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2.0",
  "productName": "Prisma Glow",
  "version": "1.0.0",
  "identifier": "com.prismaglow.desktop",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://api.prismaglow.com"
    },
    "windows": [
      {
        "title": "Prisma Glow",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

### Desktop CI Workflow

**File:** `.github/workflows/desktop-build.yml`

```yaml
name: Desktop Build

on:
  push:
    branches: [main]
    tags: ['desktop-v*']
  pull_request:
    paths:
      - 'prisma-desktop/**'

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-22.04, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          profile: minimal
      
      - name: Install dependencies (Ubuntu)
        if: matrix.os == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev librsvg2-dev
      
      - name: Install pnpm
        run: npm install -g pnpm@9.12.3
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build Tauri app
        working-directory: prisma-desktop
        run: pnpm tauri build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: desktop-${{ matrix.os }}
          path: prisma-desktop/src-tauri/target/release/bundle/
```

## 📅 WEEK 3-4: API Completion

### Add Persona Endpoints

**File:** `server/api/personas.py`

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

router = APIRouter(prefix="/api/v1/personas", tags=["personas"])

class PersonaCreate(BaseModel):
    agent_id: UUID
    name: str
    personality_traits: dict
    communication_style: str
    expertise_areas: list[str]
    is_active: bool = True

class PersonaResponse(PersonaCreate):
    id: UUID
    created_at: str
    updated_at: str

@router.post("", response_model=PersonaResponse)
async def create_persona(persona: PersonaCreate):
    """Create a new persona for an agent"""
    # TODO: Implement with Supabase
    pass

@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(persona_id: UUID):
    """Get persona details"""
    # TODO: Implement
    pass

# Add remaining 5 endpoints...
```

Register in `server/main.py`:
```python
from server.api import personas

app.include_router(personas.router)
```

## 🎯 SUCCESS METRICS

### Week 1 Complete:
- ✅ Agent registry page functional
- ✅ Can create/edit/delete agents via UI
- ✅ Agent cards display correctly

### Week 2 Complete:
- ✅ Tauri project builds successfully
- ✅ Desktop app runs on Windows/macOS
- ✅ CI builds desktop artifacts

### Week 3-4 Complete:
- ✅ Persona endpoints (7) implemented
- ✅ Tool endpoints (6) implemented
- ✅ Knowledge endpoints (7) implemented
- ✅ Test coverage > 75%

## 🚀 PRODUCTION READY (Week 5)

**Score:** 95/100  
**Confidence:** HIGH  
**Status:** ✅ Ready to launch

---

**Questions?** Review:
- `PRODUCTION_READINESS_STATUS.md` - Current state
- `PRODUCTION_READINESS_ACTION_PLAN.md` - Detailed roadmap

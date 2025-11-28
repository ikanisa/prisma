# 🚀 START WEEK 1 NOW - Immediate Action Guide
## Ready-to-Execute Tasks for December 2-6, 2024

**⏱️ Time to Complete:** 5 days (40 hours)  
**👥 Team Required:** 2 Frontend + 2 Backend developers  
**🎯 Goal:** Unblock all three development tracks

---

## 📋 QUICK START CHECKLIST

### Prerequisites (15 minutes)
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies (if not already done)
pnpm install --frozen-lockfile

# 3. Verify environment
pnpm run typecheck
pnpm run lint
pnpm run test

# 4. Create feature branch
git checkout -b feature/week1-foundation
```

---

## 👨‍💻 DAY 1: NAVIGATION COMPONENTS (8 hours)

### Task 1.1: SimplifiedSidebar Component (6 hours)
**Owner:** Frontend Dev 1  
**Priority:** P0 - CRITICAL

#### Step 1: Create Component File
```bash
mkdir -p src/components/layout
touch src/components/layout/SimplifiedSidebar.tsx
```

#### Step 2: Copy Template Code
```typescript
// src/components/layout/SimplifiedSidebar.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  count?: number;
  subsections?: Array<{
    id: string;
    label: string;
    path: string;
  }>;
}

const SECTIONS: SidebarSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  {
    id: 'agents',
    label: 'AI Agents',
    icon: Users,
    path: '/agents',
    count: 47,
    subsections: [
      { id: 'audit', label: 'Audit Agents', path: '/agents/audit' },
      { id: 'tax', label: 'Tax Agents', path: '/agents/tax' },
      { id: 'accounting', label: 'Accounting', path: '/agents/accounting' },
      { id: 'corporate', label: 'Corporate Services', path: '/agents/corporate' },
      { id: 'operational', label: 'Operations', path: '/agents/operational' },
      { id: 'support', label: 'Support', path: '/agents/support' }
    ]
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    path: '/documents'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings'
  }
];

export function SimplifiedSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleCollapse = () => setCollapsed(!collapsed);

  const handleSectionClick = (section: SidebarSection) => {
    if (section.subsections) {
      setExpandedSection(
        expandedSection === section.id ? null : section.id
      );
    } else {
      navigate(section.path);
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + B to toggle
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r',
        'border-gray-200 dark:border-gray-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Prisma Glow
          </h2>
        )}
        <button
          onClick={toggleCollapse}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {SECTIONS.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => handleSectionClick(section)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                'text-gray-700 dark:text-gray-300'
              )}
            >
              <section.icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">
                    {section.label}
                  </span>
                  {section.count && (
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full">
                      {section.count}
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Subsections */}
            {!collapsed && 
             section.subsections && 
             expandedSection === section.id && (
              <div className="ml-8 mt-1 space-y-1">
                {section.subsections.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => navigate(sub.path)}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User Profile (bottom) */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-medium">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                John Doe
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                john@example.com
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
```

#### Step 3: Test Component
```bash
# Create test file
touch src/components/layout/SimplifiedSidebar.test.tsx
```

```typescript
// src/components/layout/SimplifiedSidebar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SimplifiedSidebar } from './SimplifiedSidebar';

describe('SimplifiedSidebar', () => {
  it('renders all sections', () => {
    render(
      <BrowserRouter>
        <SimplifiedSidebar />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('AI Agents')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('toggles collapse on button click', () => {
    render(
      <BrowserRouter>
        <SimplifiedSidebar />
      </BrowserRouter>
    );
    
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('w-64');
    
    const toggleButton = screen.getByLabelText('Collapse sidebar');
    fireEvent.click(toggleButton);
    
    expect(sidebar).toHaveClass('w-16');
  });

  it('expands subsections on click', () => {
    render(
      <BrowserRouter>
        <SimplifiedSidebar />
      </BrowserRouter>
    );
    
    const agentsButton = screen.getByText('AI Agents');
    fireEvent.click(agentsButton);
    
    expect(screen.getByText('Audit Agents')).toBeInTheDocument();
    expect(screen.getByText('Tax Agents')).toBeInTheDocument();
  });
});
```

#### Step 4: Run Tests
```bash
pnpm run test -- SimplifiedSidebar.test.tsx
```

**✅ Deliverable:** Working sidebar with 80%+ test coverage

---

### Task 1.2: MobileNav Component (4 hours)
**Owner:** Frontend Dev 1  
**Priority:** P0 - CRITICAL

#### Step 1: Create Component
```typescript
// src/components/layout/MobileNav.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare,
  Users,
  FileText,
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/tasks' },
  { id: 'agents', label: 'Agents', icon: Users, path: '/agents' },
  { id: 'documents', label: 'Docs', icon: FileText, path: '/documents' },
  { id: 'settings', label: 'More', icon: Settings, path: '/settings' }
];

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                active
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              <item.icon className={cn('w-5 h-5', active && 'fill-current')} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

#### Step 2: Add Safe Area Support
```css
/* src/index.css - Add this */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .safe-area-inset-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

#### Step 3: Test on Mobile
```bash
# Start dev server
pnpm dev

# Open in browser and toggle device toolbar
# Test on iPhone, Android viewports
```

**✅ Deliverable:** Mobile navigation working on all viewports <768px

---

## 👨‍💻 DAY 2: ADAPTIVE LAYOUT (6 hours)

### Task 2.1: AdaptiveLayout Component (4 hours)
**Owner:** Frontend Dev 2

```typescript
// src/components/layout/AdaptiveLayout.tsx
import React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SimplifiedSidebar } from './SimplifiedSidebar';
import { MobileNav } from './MobileNav';

interface AdaptiveLayoutProps {
  children: React.ReactNode;
}

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      {!isMobile && <SimplifiedSidebar />}

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300',
          isMobile ? 'pb-16' : 'ml-64'
        )}
      >
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
}
```

### Task 2.2: useMediaQuery Hook (2 hours)
```typescript
// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}
```

**✅ Deliverable:** Responsive layout switching automatically

---

## 👨‍💻 DAY 3: DESIGN TOKENS (6 hours)

### Task 3.1: Typography System (2 hours)
**Owner:** Frontend Dev 1

```typescript
// src/design/typography.ts
export const typography = {
  display: {
    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em'
  },
  heading: {
    fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em'
  },
  body: {
    fontSize: '0.9375rem',
    fontWeight: 400,
    lineHeight: 1.6,
    letterSpacing: '0'
  },
  small: {
    fontSize: '0.8125rem',
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0'
  }
} as const;

export type Typography = typeof typography;
```

### Task 3.2: Design Tokens (3 hours)
```typescript
// src/design/tokens.ts
export const tokens = {
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem'    // 64px
  },
  
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px'
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
  },
  
  animation: {
    duration: {
      fast: '150ms',
      base: '250ms',
      slow: '350ms',
      slower: '500ms'
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
} as const;

export type Tokens = typeof tokens;
```

### Task 3.3: Enhanced Colors (1 hour)
```typescript
// src/design/colors.ts
export const colors = {
  primary: {
    DEFAULT: '#8b5cf6',
    hover: '#7c3aed',
    active: '#6d28d9',
    muted: 'rgba(139, 92, 246, 0.1)',
    foreground: '#ffffff'
  },
  
  semantic: {
    success: {
      DEFAULT: '#10b981',
      light: '#d1fae5',
      dark: '#047857'
    },
    warning: {
      DEFAULT: '#f59e0b',
      light: '#fef3c7',
      dark: '#d97706'
    },
    error: {
      DEFAULT: '#ef4444',
      light: '#fee2e2',
      dark: '#dc2626'
    },
    info: {
      DEFAULT: '#3b82f6',
      light: '#dbeafe',
      dark: '#1d4ed8'
    }
  },
  
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a'
  }
} as const;

export type Colors = typeof colors;
```

**✅ Deliverable:** Complete design system foundation

---

## 👨‍💻 DAY 4-5: DATABASE & API (12 hours)

### Task 4.1: Database Migration (6 hours)
**Owner:** Backend Dev 1

```bash
# Create migration file
mkdir -p supabase/migrations
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_agents_core.sql
```

```sql
-- supabase/migrations/TIMESTAMP_agents_core.sql

-- 1. Enhanced agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'assistant', 'specialist', 'orchestrator', 'evaluator', 'autonomous'
    )),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'testing', 'active', 'deprecated', 'archived'
    )),
    is_public BOOLEAN DEFAULT false,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    parent_version_id UUID REFERENCES agents(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    UNIQUE(organization_id, slug, version)
);

-- 2. Agent personas table
CREATE TABLE IF NOT EXISTS agent_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    system_prompt TEXT NOT NULL,
    personality_traits JSONB DEFAULT '[]',
    communication_style VARCHAR(50) DEFAULT 'professional',
    capabilities JSONB DEFAULT '[]',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tool registry
CREATE TABLE IF NOT EXISTS tool_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    implementation_type VARCHAR(50) CHECK (implementation_type IN (
        'function', 'api', 'webhook', 'code_interpreter'
    )),
    requires_auth BOOLEAN DEFAULT false,
    rate_limit INTEGER,
    timeout_ms INTEGER DEFAULT 30000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Agent tools (junction table)
CREATE TABLE IF NOT EXISTS agent_tools (
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tool_registry(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_config JSONB DEFAULT '{}',
    PRIMARY KEY (agent_id, tool_id)
);

-- Indexes
CREATE INDEX idx_agents_org ON agents(organization_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_personas_agent ON agent_personas(agent_id);
CREATE INDEX idx_agent_tools_agent ON agent_tools(agent_id);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic)
CREATE POLICY "Users can view agents in their org"
    ON agents FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON agent_personas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Task 4.2: Apply Migration
```bash
# Connect to Supabase and apply
psql "$DATABASE_URL" -f supabase/migrations/TIMESTAMP_agents_core.sql

# Verify
psql "$DATABASE_URL" -c "\dt agents*"
psql "$DATABASE_URL" -c "\dt tool_registry"
```

**✅ Deliverable:** Database schema ready for AI agent platform

---

### Task 4.3: Gemini API Integration (6 hours)
**Owner:** Backend Dev 2

#### Step 1: Install SDK
```bash
cd server
pip install google-generativeai
```

#### Step 2: Create Gemini Client
```python
# server/integrations/gemini.py
import os
from typing import Optional, List, Dict, Any
import google.generativeai as genai
from server.config import settings

class GeminiClient:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-pro')
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024
    ) -> str:
        """Send chat completion request"""
        try:
            # Convert messages to Gemini format
            prompt = "\n".join([
                f"{msg['role']}: {msg['content']}" 
                for msg in messages
            ])
            
            response = await self.model.generate_content_async(
                prompt,
                generation_config={
                    'temperature': temperature,
                    'max_output_tokens': max_tokens
                }
            )
            
            return response.text
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")
    
    async def suggest(
        self,
        context: str,
        user_input: str,
        num_suggestions: int = 3
    ) -> List[str]:
        """Generate autocomplete suggestions"""
        prompt = f"""Given this context:
{context}

User is typing: {user_input}

Suggest {num_suggestions} completions. Return only the suggestions, one per line."""

        response = await self.model.generate_content_async(prompt)
        suggestions = response.text.strip().split('\n')
        return suggestions[:num_suggestions]

# Singleton instance
gemini_client = GeminiClient()
```

#### Step 3: Create API Endpoints
```python
# server/api/v1/ai.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from server.integrations.gemini import gemini_client

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    temperature: float = 0.7
    max_tokens: int = 1024

class SuggestionRequest(BaseModel):
    context: str
    user_input: str
    num_suggestions: int = 3

@router.post("/chat")
async def chat_completion(request: ChatRequest):
    """Chat completion endpoint"""
    try:
        response = await gemini_client.chat(
            messages=request.messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suggestions")
async def get_suggestions(request: SuggestionRequest):
    """Get autocomplete suggestions"""
    try:
        suggestions = await gemini_client.suggest(
            context=request.context,
            user_input=request.user_input,
            num_suggestions=request.num_suggestions
        )
        return {"suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Check Gemini API health"""
    return {"status": "ok", "provider": "gemini-pro"}
```

#### Step 4: Register Router
```python
# server/main.py
from server.api.v1.ai import router as ai_router

app.include_router(ai_router)
```

#### Step 5: Test Endpoints
```bash
# Start server
uvicorn server.main:app --reload

# Test chat
curl -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'

# Test suggestions
curl -X POST http://localhost:8000/api/v1/ai/suggestions \
  -H "Content-Type: application/json" \
  -d '{
    "context": "accounting software",
    "user_input": "create invoice for"
  }'
```

**✅ Deliverable:** Live Gemini API integration replacing mock data

---

## ✅ END OF WEEK 1 CHECKLIST

### Frontend Track
- [ ] SimplifiedSidebar.tsx created and tested
- [ ] MobileNav.tsx created and tested
- [ ] AdaptiveLayout.tsx created and tested
- [ ] Design tokens complete (typography, colors, spacing)
- [ ] All components have 80%+ test coverage
- [ ] Responsive behavior verified on mobile/desktop

### Backend Track
- [ ] Database migration applied successfully
- [ ] agents, agent_personas, tool_registry tables created
- [ ] RLS policies configured
- [ ] Gemini API client implemented
- [ ] /api/v1/ai/chat endpoint working
- [ ] /api/v1/ai/suggestions endpoint working
- [ ] API tests passing

### Documentation
- [ ] README updated with new components
- [ ] API documentation updated
- [ ] Migration notes documented

---

## 🎯 SUCCESS CRITERIA

At end of Week 1, you should have:

✅ **Navigation System**
- Desktop sidebar with 6 sections
- Mobile bottom navigation
- Automatic responsive switching
- Keyboard shortcuts working

✅ **Design System**
- Complete token system
- Typography scale
- Color palette
- Spacing/shadows/radius

✅ **Database Foundation**
- 4 new tables for AI agents
- RLS policies enabled
- Indexes optimized
- Migration tested

✅ **AI Integration**
- Gemini API client working
- Chat endpoint functional
- Autocomplete suggestions working
- Mock data replaced

---

## 🚨 BLOCKERS & ESCALATION

If you encounter issues:

1. **Gemini API Key Missing**
   - Get from Google AI Studio
   - Add to `.env`: `GEMINI_API_KEY=your_key`

2. **Database Connection Fails**
   - Check Supabase URL in `.env`
   - Verify credentials
   - Test with `psql "$DATABASE_URL"`

3. **Tests Failing**
   - Run `pnpm run test -- --verbose`
   - Check console for errors
   - Ensure all imports correct

4. **Component Not Rendering**
   - Check browser console
   - Verify Tailwind classes compiled
   - Check dark mode support

---

## 📞 DAILY STANDUP

Report to team lead daily at 9 AM:

**Format:**
```
✅ Completed yesterday:
- [Task 1]
- [Task 2]

🔄 Working on today:
- [Task 1]
- [Task 2]

🚨 Blockers:
- [Any blockers]
```

---

## 🎉 READY TO START?

```bash
# Pull latest
git pull origin main

# Create branch
git checkout -b feature/week1-foundation

# Install deps
pnpm install --frozen-lockfile

# Start building! 🚀
```

**Let's make this week count!** 💪

# 🚀 WEEK 1 STARTER GUIDE
**Your Step-by-Step Guide to Begin Implementation**

**Date:** November 28, 2024  
**Week:** December 2-6, 2024  
**Status:** Ready to Start

---

## 📋 PRE-FLIGHT CHECKLIST

Before starting Week 1, ensure you have:

### ✅ Environment Setup
- [ ] Node.js 22.12.0 installed (`node -v`)
- [ ] pnpm 9.12.3 installed (`pnpm -v`)
- [ ] Python 3.11+ installed (`python --version`)
- [ ] Git configured (`git config --list`)
- [ ] Repository cloned and up-to-date (`git pull`)
- [ ] Dependencies installed (`pnpm install --frozen-lockfile`)

### ✅ Documentation Read
- [ ] COMPREHENSIVE_IMPLEMENTATION_PLAN.md reviewed
- [ ] IMPLEMENTATION_QUICK_START.md reviewed
- [ ] IMPLEMENTATION_VISUAL_ROADMAP.txt reviewed
- [ ] Your role's specific tasks identified

### ✅ Team Communication
- [ ] Team kickoff meeting scheduled (Monday 9 AM)
- [ ] Daily standup time confirmed (every day 9 AM)
- [ ] Slack channels joined (#prisma-dev, #prisma-frontend, #prisma-backend, #prisma-ai)
- [ ] Jira access confirmed
- [ ] Code review process understood

---

## 🎯 WEEK 1 OBJECTIVES

By Friday 5 PM, we will have:

### Frontend Team
✅ SimplifiedSidebar.tsx created and integrated  
✅ MobileNav.tsx created and tested  
✅ AdaptiveLayout.tsx, Grid.tsx, Stack.tsx implemented  
✅ typography.ts and tokens.ts design files complete  
✅ Command Palette enhanced with AI features  

### Backend Team
✅ 10 database migration files created  
✅ Migrations applied to development database  
✅ Basic API endpoints (agents CRUD, personas CRUD)  
✅ Enhanced React hooks (use-agents, use-personas)  

### AI Agent Team
✅ Tax package infrastructure setup  
✅ EU Corporate Tax Agent (tax-corp-eu-022) implemented  
✅ US Corporate Tax Agent (tax-corp-us-023) started  

### QA Team
✅ Test framework enhancements complete  
✅ Component test templates created  
✅ E2E test scaffolding ready  

---

## 👤 ROLE-SPECIFIC GUIDES

### 🎨 FRONTEND DEV 1 (Lead) - Navigation & Layout

#### Day 1 (Monday) - SimplifiedSidebar (8 hours)

**Morning (4 hours):**
```bash
# 1. Create feature branch
git checkout main
git pull
git checkout -b feature/ui-navigation-system

# 2. Create component file
mkdir -p src/components/layout
touch src/components/layout/SimplifiedSidebar.tsx

# 3. Install any needed dependencies
pnpm install framer-motion lucide-react
```

**Afternoon (4 hours):**
Create `src/components/layout/SimplifiedSidebar.tsx` with this structure:

```typescript
import { motion } from 'framer-motion';
import { Home, FileText, CheckSquare, Users, Settings, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const navSections = [
  {
    title: 'Main',
    items: [
      { icon: Home, label: 'Dashboard', href: '/dashboard', badge: null },
      { icon: Sparkles, label: 'AI Agents', href: '/agents', badge: '47' },
    ]
  },
  {
    title: 'Workspace',
    items: [
      { icon: FileText, label: 'Documents', href: '/documents', badge: null },
      { icon: CheckSquare, label: 'Tasks', href: '/tasks', badge: '12' },
      { icon: Users, label: 'Engagements', href: '/engagements', badge: null },
    ]
  },
  {
    title: 'Settings',
    items: [
      { icon: Settings, label: 'Settings', href: '/settings', badge: null },
    ]
  }
];

export function SimplifiedSidebar({ collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();
  
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      className="relative border-r bg-card h-screen flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && (
          <h2 className="text-lg font-semibold">Prisma Glow</h2>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-accent rounded-md"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-accent text-accent-foreground font-medium",
                      collapsed && "justify-center"
                    )}
                  >
                    <Icon size={20} />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile (at bottom) */}
      <div className="p-2 border-t">
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer",
          collapsed && "justify-center"
        )}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium">JB</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Jean Bosco</p>
              <p className="text-xs text-muted-foreground truncate">Admin</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
```

**Test:**
```bash
pnpm run typecheck
pnpm run lint
pnpm run test src/components/layout/SimplifiedSidebar.test.tsx
```

**Commit:**
```bash
git add src/components/layout/SimplifiedSidebar.tsx
git commit -m "feat: add SimplifiedSidebar component

- Collapsible sidebar with 6 organized sections
- Smooth animations with framer-motion
- Active route highlighting
- Badge support for counts
- Mobile-responsive
- Accessibility compliant (ARIA labels, keyboard nav)
"
git push -u origin feature/ui-navigation-system
```

#### Day 2 (Tuesday) - MobileNav (6 hours)

Create `src/components/layout/MobileNav.tsx`:

```typescript
import { Home, FileText, CheckSquare, Users, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', href: '/dashboard' },
  { icon: FileText, label: 'Docs', href: '/documents' },
  { icon: Sparkles, label: 'AI', href: '/agents' },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { icon: Users, label: 'Team', href: '/engagements' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1",
                "transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

#### Day 3 (Wednesday) - Layout Components (8 hours)

Create Grid.tsx, Stack.tsx, AdaptiveLayout.tsx (see QUICK_ACTION_PLAN.md for templates)

#### Day 4 (Thursday) - Design Tokens (4 hours)

Create `src/design/typography.ts` and `src/design/tokens.ts`

#### Day 5 (Friday) - Integration & Testing (4 hours)

Integrate all components, test on all breakpoints, create PR

---

### ⚙️ BACKEND DEV 1 (Lead) - Database & API

#### Day 1-2 (Monday-Tuesday) - Database Migrations (16 hours)

**Step 1: Create migration directory**
```bash
git checkout main
git pull
git checkout -b feature/ai-platform-schema

mkdir -p supabase/migrations
cd supabase/migrations
```

**Step 2: Create migration files**

Reference `AI_AGENT_SYSTEM_IMPLEMENTATION_REPORT.md` Part 2, Section 1.2 for schemas.

Create these files:
1. `20241202000001_create_agents_table.sql`
2. `20241202000002_create_agent_personas_table.sql`
3. `20241202000003_create_agent_executions_table.sql`
4. `20241202000004_create_agent_tools_table.sql`
5. `20241202000005_create_agent_tool_assignments_table.sql`
6. `20241202000006_create_knowledge_sources_table.sql`
7. `20241202000007_create_agent_knowledge_assignments_table.sql`
8. `20241202000008_create_agent_learning_examples_table.sql`
9. `20241202000009_create_agent_guardrails_table.sql`
10. `20241202000010_create_agent_guardrail_assignments_table.sql`

**Step 3: Test migrations**
```bash
# If using Supabase CLI
supabase db reset
supabase db push

# Or manually apply
psql "$DATABASE_URL" -f supabase/migrations/20241202000001_create_agents_table.sql
# ... repeat for all
```

**Step 4: Commit**
```bash
git add supabase/migrations/
git commit -m "feat: add AI platform database schema

- 10 new tables for agents, personas, tools, executions
- Comprehensive indexes for performance
- RLS policies for security
- Foreign key constraints
- JSONB fields for flexibility
"
git push -u origin feature/ai-platform-schema
```

#### Day 3-4 (Wednesday-Thursday) - API Endpoints (16 hours)

Create basic CRUD endpoints for agents and personas.

#### Day 5 (Friday) - React Hooks (8 hours)

Enhance existing hooks with new API endpoints.

---

### 🤖 AI AGENT DEV - Tax Package

#### Day 1-2 (Monday-Tuesday) - Package Setup (16 hours)

```bash
git checkout main
git pull
git checkout -b feature/tax-agents-phase3

# Create package structure
mkdir -p packages/tax/src/{agents,tools,prompts,types,utils,tests}
cd packages/tax

# Initialize package.json
cat > package.json << 'EOF'
{
  "name": "@prisma-glow/tax",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "build": "tsc"
  },
  "dependencies": {
    "@prisma-glow/types": "workspace:*",
    "@prisma-glow/core": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
EOF

# Install dependencies
pnpm install

# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
```

#### Day 3-4 (Wednesday-Thursday) - EU Tax Agent (16 hours)

Create `packages/tax/src/agents/tax-corp-eu-022.ts` - see AGENT_IMPLEMENTATION_STATUS_REPORT.md for requirements

#### Day 5 (Friday) - Testing & Documentation (8 hours)

Write tests, update README, prepare for Week 2

---

### 🧪 QA ENGINEER - Test Framework

#### Day 1-2 (Monday-Tuesday) - Test Framework Setup

Setup enhanced test utilities, mocking helpers, test data generators

#### Day 3-4 (Wednesday-Thursday) - Component Test Templates

Create reusable test templates for navigation components

#### Day 5 (Friday) - E2E Scaffolding

Setup Playwright test structure for Week 2 refactoring

---

## 📊 DAILY STANDUP FORMAT

Every day at 9 AM, answer these 3 questions:

1. **What did I complete yesterday?**
   - Specific deliverables
   - Blockers resolved
   
2. **What am I working on today?**
   - Specific tasks
   - Expected completion time
   
3. **Any blockers or help needed?**
   - Technical issues
   - Dependency waiting
   - Questions for team

**Keep it under 2 minutes per person.**

---

## ✅ END OF WEEK 1 CHECKLIST

### Definition of Done

- [ ] All code merged to main branch
- [ ] All tests passing (>70% coverage)
- [ ] No TypeScript errors (`pnpm run typecheck`)
- [ ] No linting errors (`pnpm run lint`)
- [ ] Documentation updated (README, JSDoc)
- [ ] Code reviewed and approved
- [ ] Demo prepared for Friday sprint review

### Sprint Review (Friday 3 PM)

**Agenda:**
1. Demo SimplifiedSidebar + MobileNav (Frontend)
2. Demo database schema + API endpoints (Backend)
3. Demo tax package + EU agent (AI)
4. Review metrics:
   - Test coverage (target >70%)
   - TypeScript errors (target 0)
   - Code review status
5. Plan Week 2 tasks
6. Celebrate wins! 🎉

---

## 🚨 WHEN YOU GET STUCK

### Technical Issues
1. Search existing codebase for patterns
2. Check documentation (COMPREHENSIVE_IMPLEMENTATION_PLAN.md)
3. Ask in Slack (#prisma-dev)
4. Pair program with teammate
5. Escalate to lead if >2 hours stuck

### Process Questions
1. Check IMPLEMENTATION_QUICK_START.md
2. Ask PM in Slack
3. Refer to team charter/process docs

### Merge Conflicts
1. `git fetch origin main`
2. `git rebase origin/main`
3. Resolve conflicts in editor
4. `git rebase --continue`
5. Ask for help if stuck

---

## 📈 PROGRESS TRACKING

### Update Daily
Edit `IMPLEMENTATION_STATUS.md` every evening:
- Mark completed tasks with ✅
- Note any blockers with 🚧
- Update metrics (LOC, tests, coverage)

### Commit Pattern
```bash
# Feature
git commit -m "feat: add SimplifiedSidebar component"

# Fix
git commit -m "fix: resolve mobile nav rendering issue"

# Docs
git commit -m "docs: update README with navigation usage"

# Tests
git commit -m "test: add unit tests for SimplifiedSidebar"
```

---

## 🎯 SUCCESS CRITERIA FOR WEEK 1

By Friday 5 PM, we should have:

✅ **Frontend:**
- 5 new components created and tested
- Design system files complete
- Navigation working on desktop + mobile

✅ **Backend:**
- 10 database tables created
- Migrations applied successfully
- Basic API endpoints working
- Enhanced hooks integrated

✅ **AI Agents:**
- Tax package structure ready
- EU Corporate Tax agent implemented
- US agent 50% complete

✅ **QA:**
- Test framework enhanced
- Component test templates ready
- E2E scaffolding complete

✅ **Team:**
- >70% test coverage
- 0 TypeScript errors
- All PRs reviewed and merged
- Sprint demo successful

---

## 🎉 WEEK 1 CELEBRATION

**When all goals met:**
- Team happy hour Friday 5:30 PM
- Shoutouts in #prisma-general
- Week 2 planning with confidence!

---

**Ready to start? Let's build amazing features! 🚀**

**Questions?** → Check COMPREHENSIVE_IMPLEMENTATION_PLAN.md or ask in Slack

**Next:** Week 2 focuses on page refactoring and tax agent completion

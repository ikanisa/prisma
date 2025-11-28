# 🚀 MASTER EXECUTION PLAN - DECEMBER 2024
## Prisma Glow - Complete Implementation Roadmap

**Date:** November 28, 2024  
**Status:** ✅ Ready for Immediate Execution  
**Timeline:** 12 Weeks (Dec 2-Feb 21, 2025)  
**Current Progress:** 58% → Target: 100%

---

## 📊 EXECUTIVE DASHBOARD

### Overall Status Summary

| Component | Current | Target | Timeline | Priority |
|-----------|---------|--------|----------|----------|
| **UI/UX** | 58% | 100% | 3 weeks | 🔴 CRITICAL |
| **AI Agents** | 47% (22/47) | 100% | 8 weeks | 🔴 CRITICAL |
| **Production** | 67/100 | 90/100 | 2 weeks | 🟡 HIGH |
| **Desktop App** | 0% | 100% | 4 weeks | 🟢 MEDIUM |

### What's Already Done ✅

**Major Achievements:**
- ✅ **Tax Agents (12/12):** EU, US, UK, Canada, Malta, Rwanda, VAT, Transfer Pricing, etc. (1,619 LOC)
- ✅ **Audit Agents (10/10):** Risk Assessment, Controls, Fraud Detection, etc. (2,503 LOC)
- ✅ **Security:** 92/100 score, CSP headers, rate limiting
- ✅ **Performance Infrastructure:** Code splitting, caching, DB indexes
- ✅ **Design System:** Tokens, animations, responsive hooks
- ✅ **Layout Components:** 10/7 components (exceeded target)

### Critical Gaps 🔴

**The 4 BLOCKERS:**
1. **SimplifiedSidebar** - 47 agents scattered, needs 6-section grouping (8h fix)
2. **Gemini API** - All AI using mock data (20h fix)
3. **Virtual Scrolling** - Freezes with 10K+ items (4h fix)
4. **Mobile Nav** - No navigation on mobile (6h fix)

**Other Gaps:**
- 7 pages >10KB (largest: 27KB)
- 25 agents remaining (Accounting, Orchestrators, Corporate, Ops, Support)
- Test coverage 50% (target: 80%+)
- Bundle size 800KB (target: <500KB)

---

## 🎯 3-WEEK SPRINT PLAN

### WEEK 1 (Dec 2-6): UNBLOCK EVERYTHING

#### 🔥 Monday (Dec 2): Navigation Foundation
**Team:** Frontend Dev 1 (8 hours)

**Task 1: SimplifiedSidebar (6 hours)**

Create: `src/components/layout/SimplifiedSidebar.tsx`

```typescript
import { Scale, Shield, DollarSign, Building, Workflow, Brain } from 'lucide-react';
import { useState } from 'react';

interface AgentSection {
  title: string;
  icon: LucideIcon;
  agents: string[];
  color: string;
}

const SECTIONS: AgentSection[] = [
  {
    title: "Tax & Compliance",
    icon: Scale,
    color: "text-blue-500",
    agents: [
      "EU Tax Agent",
      "US Tax Agent",
      "UK Tax Agent",
      "Canada Tax Agent",
      "Malta Tax Agent",
      "Rwanda Tax Agent",
      "VAT Agent",
      "Transfer Pricing Agent",
      "Tax Residency Agent",
      "Treaty Analysis Agent",
      "Import Duties Agent",
      "Double Tax Relief Agent"
    ]
  },
  {
    title: "Audit & Assurance",
    icon: Shield,
    color: "text-purple-500",
    agents: [
      "Risk Assessment Agent",
      "Internal Controls Agent",
      "Fraud Detection Agent",
      "Materiality Agent",
      "Sampling Agent",
      "Analytics Agent",
      "Going Concern Agent",
      "Subsequent Events Agent",
      "Related Parties Agent",
      "Substantive Tests Agent"
    ]
  },
  {
    title: "Accounting",
    icon: DollarSign,
    color: "text-green-500",
    agents: [
      "Financial Statements Agent",
      "Revenue Recognition Agent",
      "Lease Accounting Agent",
      "Fair Value Agent",
      "Consolidation Agent",
      "Impairment Agent",
      "Cash Flow Agent",
      "Disclosure Agent"
    ]
  },
  {
    title: "Corporate Services",
    icon: Building,
    color: "text-orange-500",
    agents: [
      "Entity Management Agent",
      "Registered Agent Service",
      "Compliance Calendar Agent"
    ]
  },
  {
    title: "Operations",
    icon: Workflow,
    color: "text-pink-500",
    agents: [
      "Document OCR Agent",
      "Data Classification Agent",
      "Information Extraction Agent",
      "Workflow Automation Agent"
    ]
  },
  {
    title: "Orchestration",
    icon: Brain,
    color: "text-indigo-500",
    agents: [
      "Master Orchestrator",
      "Engagement Manager",
      "Compliance Coordinator"
    ]
  }
];

export const SimplifiedSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTIONS.map(s => s.title))
  );

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const filteredSections = SECTIONS.map(section => ({
    ...section,
    agents: section.agents.filter(agent =>
      agent.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.agents.length > 0);

  return (
    <aside
      className={cn(
        "bg-card border-r transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="font-semibold">AI Agents</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-muted rounded-lg"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Search */}
          <div className="p-4">
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Sections */}
          <div className="overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
            {filteredSections.map(section => (
              <div key={section.title} className="border-b last:border-0">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <section.icon className={cn("h-5 w-5", section.color)} />
                    <span className="font-medium text-sm">{section.title}</span>
                    <span className="text-xs text-muted-foreground">
                      ({section.agents.length})
                    </span>
                  </div>
                  {expandedSections.has(section.title) ? <ChevronDown /> : <ChevronRight />}
                </button>

                {expandedSections.has(section.title) && (
                  <div className="pl-12 pr-4 pb-2 space-y-1">
                    {section.agents.map(agent => (
                      <Link
                        key={agent}
                        href={`/agents/${agent.toLowerCase().replace(/\s+/g, '-')}`}
                        className="block py-2 px-3 text-sm rounded-lg hover:bg-muted transition-colors"
                      >
                        {agent}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Keyboard Shortcut Hint */}
      {!collapsed && (
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-muted rounded">⌘B</kbd> to toggle
        </div>
      )}
    </aside>
  );
};
```

**Acceptance Criteria:**
- ✅ 47 agents organized into 6 logical sections
- ✅ Collapsible sidebar with ⌘+B shortcut
- ✅ Search filters across all agents
- ✅ Agent count badges per section
- ✅ Active state persists across navigation
- ✅ Smooth animations

**Task 2: MobileNav (2 hours)**

Create: `src/components/layout/MobileNav.tsx`

```typescript
import { Home, Users, CheckSquare, FileText, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Agents', href: '/agents' },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { icon: FileText, label: 'Docs', href: '/documents' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export const MobileNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href;
          
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
```

**Add to layout:**
```typescript
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <div className="flex h-screen">
          <SimplifiedSidebar /> {/* Desktop */}
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            {children}
          </main>
          <MobileNav /> {/* Mobile */}
        </div>
      </body>
    </html>
  );
}
```

**Acceptance Criteria:**
- ✅ Fixed bottom navigation on mobile (<768px)
- ✅ Hidden on desktop (≥768px)
- ✅ Active state with color + background
- ✅ Safe area support (iPhone notch)

---

#### 🔥 Tuesday (Dec 3): Gemini API Integration - Backend
**Team:** Backend Dev 1 (8 hours)

**Setup:**
```bash
cd server
pip install google-generativeai python-dotenv
```

**Environment:**
```bash
# .env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-pro
GEMINI_RATE_LIMIT=10  # requests per minute
```

**Implementation:**

Create: `server/services/gemini_service.py`

```python
import google.generativeai as genai
import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import asyncio
from collections import defaultdict

class RateLimiter:
    """Simple rate limiter for API calls."""
    def __init__(self, max_calls: int, period_seconds: int = 60):
        self.max_calls = max_calls
        self.period = timedelta(seconds=period_seconds)
        self.calls = defaultdict(list)
    
    async def wait_if_needed(self, user_id: str):
        now = datetime.now()
        # Remove old calls
        self.calls[user_id] = [
            call_time for call_time in self.calls[user_id]
            if now - call_time < self.period
        ]
        
        if len(self.calls[user_id]) >= self.max_calls:
            oldest_call = min(self.calls[user_id])
            wait_time = (oldest_call + self.period - now).total_seconds()
            if wait_time > 0:
                await asyncio.sleep(wait_time)
        
        self.calls[user_id].append(now)

class GeminiService:
    """Google Gemini AI Service."""
    
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            os.getenv("GEMINI_MODEL", "gemini-pro")
        )
        self.rate_limiter = RateLimiter(
            max_calls=int(os.getenv("GEMINI_RATE_LIMIT", 10))
        )
    
    async def generate_response(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        user_id: Optional[str] = None
    ) -> str:
        """
        Generate AI response with Gemini.
        
        Args:
            prompt: User query
            context: Optional context (history, documents, etc.)
            temperature: Randomness (0-1)
            max_tokens: Max response length
            user_id: User ID for rate limiting
        
        Returns:
            Generated response text
        """
        try:
            # Rate limiting
            if user_id:
                await self.rate_limiter.wait_if_needed(user_id)
            
            # Build full prompt with context
            full_prompt = self._build_prompt(prompt, context)
            
            # Generate response
            response = await self.model.generate_content_async(
                full_prompt,
                generation_config={
                    'temperature': temperature,
                    'max_output_tokens': max_tokens,
                }
            )
            
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            # Fallback to mock response
            return self._mock_response(prompt)
    
    def _build_prompt(self, prompt: str, context: Optional[Dict] = None) -> str:
        """Build full prompt with context."""
        parts = []
        
        if context:
            if 'system' in context:
                parts.append(f"System: {context['system']}")
            
            if 'history' in context:
                parts.append("Conversation History:")
                for msg in context['history'][-5:]:  # Last 5 messages
                    parts.append(f"{msg['role']}: {msg['content']}")
            
            if 'documents' in context:
                parts.append("Relevant Documents:")
                for doc in context['documents']:
                    parts.append(f"- {doc['title']}: {doc['summary']}")
        
        parts.append(f"User Query: {prompt}")
        
        return "\n\n".join(parts)
    
    def _mock_response(self, prompt: str) -> str:
        """Fallback mock response when API fails."""
        return f"[Mock Response] I understand you're asking about: {prompt}. This is a fallback response as the AI service is currently unavailable."
    
    async def analyze_document(
        self,
        document_text: str,
        analysis_type: str = "summary",
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze document content.
        
        Args:
            document_text: Document content
            analysis_type: Type of analysis (summary, entities, sentiment, etc.)
            user_id: User ID for rate limiting
        
        Returns:
            Analysis results
        """
        prompts = {
            "summary": f"Provide a concise summary of this document:\n\n{document_text}",
            "entities": f"Extract key entities (people, organizations, dates) from:\n\n{document_text}",
            "sentiment": f"Analyze the sentiment of this document:\n\n{document_text}",
            "keywords": f"Extract key topics and keywords from:\n\n{document_text}"
        }
        
        response = await self.generate_response(
            prompts.get(analysis_type, prompts["summary"]),
            user_id=user_id
        )
        
        return {
            "analysis_type": analysis_type,
            "result": response,
            "timestamp": datetime.now().isoformat()
        }
```

Create: `server/api/chat.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from server.services.gemini_service import GeminiService
from server.db import get_db

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessage(BaseModel):
    message: str
    session_id: str
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str

@router.post("/", response_model=ChatResponse)
async def chat(
    msg: ChatMessage,
    gemini: GeminiService = Depends(get_gemini_service),
    db = Depends(get_db)
):
    """Send message to AI chat."""
    try:
        # Get conversation history from DB
        history = await get_chat_history(db, msg.session_id)
        
        # Add history to context
        context = msg.context or {}
        context['history'] = history
        
        # Generate response
        response = await gemini.generate_response(
            prompt=msg.message,
            context=context,
            user_id=msg.session_id  # Using session_id for rate limiting
        )
        
        # Store message and response in DB
        await store_chat_message(db, msg.session_id, msg.message, response)
        
        return ChatResponse(
            response=response,
            session_id=msg.session_id,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/analyze-document")
async def analyze_document(
    document_id: str,
    analysis_type: str = "summary",
    gemini: GeminiService = Depends(get_gemini_service),
    db = Depends(get_db)
):
    """Analyze document with AI."""
    try:
        # Fetch document from DB
        document = await get_document(db, document_id)
        
        # Analyze with Gemini
        analysis = await gemini.analyze_document(
            document_text=document.content,
            analysis_type=analysis_type
        )
        
        # Store analysis results
        await store_analysis(db, document_id, analysis)
        
        return analysis
        
    except Exception as e:
        logger.error(f"Document analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Database helper functions
async def get_chat_history(db, session_id: str, limit: int = 10):
    """Get recent chat history."""
    result = await db.execute(
        """
        SELECT role, content, created_at
        FROM chat_messages
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        """,
        session_id, limit
    )
    return [
        {"role": row["role"], "content": row["content"]}
        for row in reversed(result)
    ]

async def store_chat_message(db, session_id: str, message: str, response: str):
    """Store chat exchange in DB."""
    await db.execute(
        """
        INSERT INTO chat_messages (session_id, role, content)
        VALUES 
            ($1, 'user', $2),
            ($1, 'assistant', $3)
        """,
        session_id, message, response
    )
```

**Migration:**
```sql
-- supabase/migrations/20241203_chat_messages.sql
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at DESC);
```

**Acceptance Criteria:**
- ✅ Gemini API key loaded from .env
- ✅ Rate limiting (10 req/min per user)
- ✅ Conversation history stored in DB
- ✅ Fallback to mock on error
- ✅ Document analysis endpoint working

---

#### 🔥 Wednesday (Dec 4): Gemini API - Frontend Integration
**Team:** Frontend Dev 2 (8 hours)

**Install package:**
```bash
pnpm add @ai-sdk/google ai
```

**Create hook:**

Create: `src/hooks/use-gemini-chat.ts`

```typescript
import { useState, useCallback } from 'react';
import { useChat } from 'ai/react';

export function useGeminiChat(sessionId: string) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    id: sessionId,
    initialMessages: [],
  });

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  };
}

export function useDocumentAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeDocument = useCallback(async (
    documentId: string,
    analysisType: 'summary' | 'entities' | 'sentiment' | 'keywords'
  ) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId, analysis_type: analysisType }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analyzeDocument, isAnalyzing, analysis, error };
}
```

**Update FloatingAssistant:**

Edit: `src/components/floating-assistant.tsx`

```typescript
import { useGeminiChat } from '@/hooks/use-gemini-chat';

export const FloatingAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useGeminiChat(sessionId);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary shadow-lg hover:shadow-xl transition-shadow"
      >
        <Bot className="h-6 w-6" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>AI Assistant</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === 'assistant' && <Bot className="h-8 w-8 text-primary" />}
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 max-w-[80%]",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && <User className="h-8 w-8" />}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <Bot className="h-8 w-8 text-primary animate-pulse" />
                <div className="bg-muted rounded-lg px-4 py-2">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
```

**Add document analysis UI:**

Create: `src/components/document-analysis.tsx`

```typescript
import { useDocumentAnalysis } from '@/hooks/use-gemini-chat';

export const DocumentAnalysis = ({ documentId }: { documentId: string }) => {
  const { analyzeDocument, isAnalyzing, analysis, error } = useDocumentAnalysis();

  const analysisTypes = [
    { type: 'summary', label: 'Summary', icon: FileText },
    { type: 'entities', label: 'Entities', icon: Tag },
    { type: 'sentiment', label: 'Sentiment', icon: Smile },
    { type: 'keywords', label: 'Keywords', icon: Key },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Document Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {analysisTypes.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              onClick={() => analyzeDocument(documentId, type as any)}
              disabled={isAnalyzing}
              variant="outline"
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>

        {isAnalyzing && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing document...
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysis && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">{analysis.analysis_type} Result:</h4>
            <p className="text-sm whitespace-pre-wrap">{analysis.result}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

**Acceptance Criteria:**
- ✅ FloatingAssistant uses real Gemini API
- ✅ Messages stored in DB
- ✅ Document analysis working
- ✅ Loading states shown
- ✅ Errors handled gracefully

---

#### 🔥 Thursday (Dec 5): Virtual Scrolling
**Team:** Frontend Dev 2 (4 hours)

**Install package:**
```bash
pnpm add @tanstack/react-virtual
```

**Create component:**

Create: `src/components/VirtualList.tsx`

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useRef } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 10, // Render 10 extra items for smooth scrolling
  });

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Apply to documents page:**

Edit: `src/pages/documents.tsx`

```typescript
import { VirtualList } from '@/components/VirtualList';

export default function DocumentsPage() {
  const { data: documents, isLoading } = useDocuments();

  if (isLoading) return <DocumentsPageSkeleton />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Documents</h1>
      
      <VirtualList
        items={documents}
        height={600}
        itemHeight={80}
        renderItem={(doc) => <DocumentCard key={doc.id} document={doc} />}
        className="border rounded-lg"
      />
    </div>
  );
}
```

**Acceptance Criteria:**
- ✅ Renders 50K+ items without lag
- ✅ Smooth 60fps scrolling
- ✅ Search/filter works with virtual list
- ✅ Selection state preserved
- ✅ Applied to: documents, tasks, engagements pages

---

#### 🔥 Friday (Dec 6): Testing & Polish
**Team:** Full Team (8 hours)

**Tasks:**
- [ ] Test SimplifiedSidebar on all routes
- [ ] Test Gemini chat with various queries
- [ ] Test virtual scrolling with large datasets
- [ ] Test mobile nav on various devices
- [ ] Fix any bugs found
- [ ] Update documentation

**Deployment:**
```bash
# Build and test
pnpm run build
pnpm run test
pnpm run coverage

# Deploy to staging
git checkout staging
git merge main
git push origin staging
```

---

### WEEK 2 (Dec 9-13): PAGE REFACTORING

#### 🎯 Goal: Refactor 4 oversized pages

**Priority Pages:**
1. `engagements.tsx` (27KB → 8KB) - 2 days
2. `documents.tsx` (21KB → 8KB) - 1 day
3. `settings.tsx` (15KB → 6KB) - 1 day
4. `tasks.tsx` (12KB → 6KB) - 1 day

#### Monday-Tuesday (Dec 9-10): engagements.tsx
**Team:** Frontend Dev 1 + Dev 2

**Refactoring Plan:**

```
engagements.tsx (27KB)
│
├── Extract: components/engagements/EngagementList.tsx (6KB)
│   ├── Virtual scrolling
│   ├── Filtering logic
│   └── Sorting logic
│
├── Extract: components/engagements/EngagementCard.tsx (3KB)
│   ├── Card UI
│   ├── Status badge
│   └── Actions menu
│
├── Extract: components/engagements/EngagementFilters.tsx (4KB)
│   ├── Search input
│   ├── Status filter
│   ├── Date range
│   └── Team filter
│
├── Extract: components/engagements/EngagementForm.tsx (5KB)
│   ├── Create/edit form
│   ├── Validation
│   └── Submit handler
│
└── Remaining: pages/engagements.tsx (6KB) ✅
    └── Orchestration only
```

**Implementation:**

Create: `src/components/engagements/EngagementCard.tsx`

```typescript
interface EngagementCardProps {
  engagement: Engagement;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const EngagementCard = ({ engagement, onEdit, onDelete }: EngagementCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{engagement.title}</CardTitle>
          <CardDescription>{engagement.client}</CardDescription>
        </div>
        <StatusBadge status={engagement.status} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(engagement.start_date, 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{engagement.team_members.length} members</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(engagement.id)}>
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(engagement.id)}>
          <Trash className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};
```

Create: `src/components/engagements/EngagementList.tsx`

```typescript
import { VirtualList } from '@/components/VirtualList';
import { EngagementCard } from './EngagementCard';

interface EngagementListProps {
  engagements: Engagement[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const EngagementList = ({ engagements, onEdit, onDelete }: EngagementListProps) => {
  return (
    <VirtualList
      items={engagements}
      height={600}
      itemHeight={200}
      renderItem={(engagement) => (
        <EngagementCard
          key={engagement.id}
          engagement={engagement}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    />
  );
};
```

Create: `src/components/engagements/EngagementFilters.tsx`

```typescript
interface EngagementFiltersProps {
  onFilterChange: (filters: EngagementFilters) => void;
}

export const EngagementFilters = ({ onFilterChange }: EngagementFiltersProps) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    onFilterChange({ search, status, dateRange });
  }, [search, status, dateRange]);

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <Input
        placeholder="Search engagements..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      <DateRangePicker
        value={dateRange}
        onChange={setDateRange}
      />
    </div>
  );
};
```

**Simplified main page:**

Edit: `src/pages/engagements.tsx`

```typescript
export default function EngagementsPage() {
  const [filters, setFilters] = useState<EngagementFilters>({});
  const [selectedEngagement, setSelectedEngagement] = useState<string | null>(null);
  
  const { data: engagements, isLoading } = useEngagements(filters);

  const handleEdit = (id: string) => setSelectedEngagement(id);
  const handleDelete = async (id: string) => {
    await deleteEngagement(id);
    toast.success('Engagement deleted');
  };

  if (isLoading) return <EngagementsPageSkeleton />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Engagements</h1>
        <Button onClick={() => setSelectedEngagement('new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Engagement
        </Button>
      </div>

      <EngagementFilters onFilterChange={setFilters} />
      <EngagementList
        engagements={engagements}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {selectedEngagement && (
        <EngagementFormDialog
          id={selectedEngagement}
          onClose={() => setSelectedEngagement(null)}
        />
      )}
    </div>
  );
}
```

**Result:** engagements.tsx reduced from 27KB to 6KB ✅

---

#### Wednesday (Dec 11): documents.tsx
**Same pattern - extract DocumentList, DocumentCard, DocumentFilters, DocumentUpload**

#### Thursday (Dec 12): settings.tsx + tasks.tsx
**Same pattern - modular components**

#### Friday (Dec 13): Testing & Deployment
- [ ] Test all refactored pages
- [ ] Ensure no regressions
- [ ] Update tests
- [ ] Deploy to production

---

### WEEK 3 (Dec 16-20): DESKTOP APP

#### Monday-Wednesday (Dec 16-18): Tauri Setup
**Team:** Backend Dev 2

```bash
# Install Tauri
cargo install tauri-cli
cd apps
pnpm create tauri-app desktop
```

#### Thursday-Friday (Dec 19-20): Performance Optimization
**Team:** Full Team

- Bundle size optimization
- Lighthouse audit
- Accessibility fixes

---

## 🚀 WEEKS 4-12: AGENT COMPLETION

### Week 4-5: Accounting Agents (8 agents)
### Week 6-7: Orchestrator Agents (3 agents)  
### Week 8-10: Corporate/Ops/Support Agents (14 agents)
### Week 11-12: Testing & Production Launch

---

## 📊 SUCCESS METRICS

### Week 1 (Dec 6) Targets:
- ✅ SimplifiedSidebar live
- ✅ Gemini API integrated
- ✅ Virtual scrolling deployed
- ✅ Mobile nav working

### Week 2 (Dec 13) Targets:
- ✅ 4 pages <10KB
- ✅ Components extracted
- ✅ Tests pass

### Week 3 (Dec 20) Targets:
- ✅ Desktop app builds
- ✅ Bundle <500KB
- ✅ Lighthouse >90

### Week 12 (Feb 21) Go-Live:
- ✅ 47/47 agents
- ✅ Test coverage >80%
- ✅ Production score >90

---

## 📞 NEXT STEPS

**TODAY (Nov 28):**
1. ✅ Review this plan with team
2. ✅ Assign developers to Week 1 tasks
3. ✅ Set up development environments
4. ✅ Schedule daily standups (9 AM)

**MONDAY (Dec 2):**
1. 🔴 START SimplifiedSidebar implementation
2. 🔴 BEGIN Gemini API backend
3. 🔴 Kick off Week 1 sprint

---

**LET'S SHIP THIS! 🚀**

*Document Version: 1.0*  
*Last Updated: November 28, 2024*
